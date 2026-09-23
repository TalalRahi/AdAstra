"""FastAPI entry point. Run locally with:  uvicorn main:app --reload --port 8000"""

import logging
import time
import uuid

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from adastra import __version__, pipeline
from adastra.classify import get_model
from adastra.config import settings
from adastra.imaging import ImageError
from adastra.rag import chat_chain, explain_chain, store
from adastra.rag.llm import key_present
from adastra.schemas import (
    ChatRequest,
    ChatResponse,
    ClassifyResponse,
    ExplainRequest,
    ExplainResponse,
    HealthResponse,
    Level,
    SlotStatus,
)

logging.basicConfig(level=settings.log_level, format="%(levelname)s %(name)s %(message)s")
log = logging.getLogger("adastra")

app = FastAPI(
    title="AdAstra API",
    version=__version__,
    description="Astronomical image classification with knowledge-grounded explanations.",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# Allow the React app (a different port = a different "origin") to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def _error(status: int, code: str, message: str, request_id: str) -> JSONResponse:
    """Every error uses the same JSON shape so the frontend can always show it."""
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message, "request_id": request_id}},
    )


@app.exception_handler(Exception)
def unhandled(request: Request, exc: Exception):
    """Unexpected crashes also return JSON instead of a blank 500 page."""
    request_id = uuid.uuid4().hex[:12]
    log.exception("unhandled error request_id=%s", request_id)
    return _error(500, "internal_error", "Something went wrong on the server.", request_id)


# NOTE: handlers are plain `def`, not `async def`. FastAPI runs plain-def
# handlers in a thread pool, so a slow classification never blocks other requests.


@app.get("/api/health", response_model=HealthResponse)
def health():
    """Tells the frontend which parts are real and which are placeholders."""
    model = get_model()
    kb_ready = store.exists()  # True when index.faiss, docstore.jsonl and manifest.json exist
    return HealthResponse(
        ok=True,
        version=__version__,
        demo_mode=settings.demo_mode,
        classes=settings.class_names,
        slots={
            "classifier": SlotStatus(
                status="live" if model.weights_loaded else "missing",
                detail="EfficientNet-B0 ONNX model" if model.weights_loaded
                else "No model file yet — using demo output.",
            ),
            "knowledge_base": SlotStatus(
                status="live" if kb_ready else "missing",
                detail="Search index found." if kb_ready
                else "No index yet — run: python -m scripts.ingest --wikipedia --pdfs",
            ),
            "llm": SlotStatus(
                status="live" if key_present() else "missing",
                detail=f"{settings.gemma_model} (API key set)" if key_present()
                else "No GOOGLE_API_KEY in backend/.env — explanations are placeholder text.",
            ),
        },
    )


@app.post("/api/classify", response_model=ClassifyResponse)
def classify(file: UploadFile = File(...), level: Level = Form("beginner")):
    request_id = uuid.uuid4().hex[:12]
    # Read one byte past the limit, so an oversized file is detected
    # without loading the whole thing into memory.
    data = file.file.read(settings.max_upload_bytes + 1)
    try:
        result = pipeline.run(data, level, request_id)
    except ImageError as e:
        return _error(e.status, e.code, e.message, request_id)

    log.info(
        "classify request_id=%s class=%s conf=%.3f mode=%s",
        request_id, result.classification.predicted_class,
        result.classification.confidence, result.mode,
    )
    return result


@app.post("/api/explain", response_model=ExplainResponse)
def explain(req: ExplainRequest):
    """Explain an earlier result at another level. The browser sends the
    classification back, so the server needs no memory of past requests."""
    explanation, sources, warnings = explain_chain.explain(req.classification, req.level)
    return ExplainResponse(explanation=explanation, sources=sources, warnings=warnings)


@app.post("/api/rag-query", response_model=ChatResponse)
def rag_query(req: ChatRequest):
    """The "Ask" page: answer a question from the knowledge base, with sources."""
    start = time.perf_counter()
    answer, sources, warnings = chat_chain.answer(
        req.question, k=req.k, history=req.history, context=req.analysis_context
    )
    latency = round((time.perf_counter() - start) * 1000, 1)
    return ChatResponse(answer=answer, sources=sources, warnings=warnings, latency_ms=latency)