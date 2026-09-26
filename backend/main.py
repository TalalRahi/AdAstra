"""FastAPI entry point. Run locally with:  uvicorn main:app --reload --port 8000"""

import logging
import time
import uuid

from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from adastra import __version__, db, pipeline
from adastra.auth import AuthUser, auth_enabled, current_user, signed_in_if_enabled
from adastra.classify import get_model
from adastra.clip import get_model as get_clip_model
from adastra.config import settings
from adastra.morphology import get_model as get_morphology_model
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
    HistoryEntry,
    HistoryEntryCreate,
    HistoryListResponse,
    Level,
    Profile,
    ProfileUpdate,
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)


def _error(status: int, code: str, message: str, request_id: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message, "request_id": request_id}},
    )


HTTP_CODES = {401: "not_signed_in", 403: "forbidden", 404: "not_found", 405: "method_not_allowed", 503: "unavailable"}


@app.exception_handler(StarletteHTTPException)
def http_error(request: Request, exc: StarletteHTTPException):
    """Errors raised on purpose (e.g. "please sign in") use the same JSON shape."""
    request_id = uuid.uuid4().hex[:12]
    return _error(exc.status_code, HTTP_CODES.get(exc.status_code, f"http_{exc.status_code}"),
                  str(exc.detail), request_id)


@app.exception_handler(Exception)
def unhandled(request: Request, exc: Exception):
    request_id = uuid.uuid4().hex[:12]
    log.exception("unhandled error request_id=%s", request_id)
    return _error(500, "internal_error", "Something went wrong on the server.", request_id)


# NOTE: handlers are plain `def`, not `async def`. FastAPI runs plain-def
# handlers in a thread pool, so a slow classification never blocks other
# requests (this was bug #1 in the old codebase).


@app.get("/api/health", response_model=HealthResponse)
def health():
    model = get_model()
    morphology_model = get_morphology_model()
    clip_model = get_clip_model()
    return HealthResponse(
        ok=True,
        version=__version__,
        demo_mode=settings.demo_mode,
        classes=model.classes if model.weights_loaded else settings.class_names,
        slots={
            "classifier": SlotStatus(
                status="live" if model.weights_loaded else "missing",
                detail=model.architecture if model.weights_loaded
                else "No model file yet — using demo output.",
            ),
            "galaxy_morphology": SlotStatus(
                status="live" if morphology_model.weights_loaded else "missing",
                detail=morphology_model.architecture if morphology_model.weights_loaded
                else "No model file yet — galaxy shape uses demo output when triggered.",
            ),
            "clip": SlotStatus(
                status="live" if clip_model.weights_loaded else "missing",
                detail=clip_model.architecture if clip_model.weights_loaded
                else "No CLIP artifact yet — the astronomical-image check uses demo output.",
            ),
            "knowledge_base": SlotStatus(
                status="live" if store.exists() else "missing",
                detail="Search index found." if store.exists()
                else "No index yet — run: python -m scripts.ingest --wikipedia --pdfs",
            ),
            "accounts": SlotStatus(
                status="live" if auth_enabled() else "missing",
                detail="Firebase Authentication" if auth_enabled()
                else "No FIREBASE_PROJECT_ID set — sign-in is switched off.",
            ),
            "database": SlotStatus(
                status="live" if db.ping() else "missing",
                detail="MongoDB Atlas connected" if db.db_enabled()
                else "No MONGODB_URI set — accounts can't be saved.",
            ),
            "llm": SlotStatus(
                status="live" if key_present() else "missing",
                detail=f"{settings.gemma_model} (API key set)" if key_present()
                else "No GOOGLE_API_KEY in backend/.env — explanations are placeholder text.",
            ),
        },
    )


# The three main features need a signed-in user (when accounts are switched on).
signed_in = Depends(signed_in_if_enabled)


@app.post("/api/classify", response_model=ClassifyResponse, dependencies=[signed_in])
def classify(file: UploadFile = File(...), level: Level = Form("beginner")):
    request_id = uuid.uuid4().hex[:12]
    # Read one byte past the limit so oversized files are detected without
    # loading an arbitrarily large body into memory.
    data = file.file.read(settings.max_upload_bytes + 1)
    try:
        result = pipeline.run(data, level, request_id)
    except ImageError as e:
        return _error(e.status, e.code, e.message, request_id)

    if result.classification is not None:
        log.info(
            "classify request_id=%s class=%s conf=%.3f mode=%s",
            request_id, result.classification.predicted_class,
            result.classification.confidence, result.mode,
        )
    else:
        # CLIP gated this one out before the classifier ever ran.
        log.info(
            "classify request_id=%s not_astronomical astro_score=%.3f mode=%s",
            request_id, result.clip.astro_score, result.mode,
        )
    return result


@app.post("/api/explain", response_model=ExplainResponse, dependencies=[signed_in])
def explain(req: ExplainRequest):
    """Explain an earlier result at another level. The browser sends the
    classification back, so the server needs no memory of past requests."""
    explanation, sources, warnings = explain_chain.explain(
        req.classification, req.level, req.galaxy_morphology
    )
    return ExplainResponse(explanation=explanation, sources=sources, warnings=warnings)


@app.post("/api/rag-query", response_model=ChatResponse, dependencies=[signed_in])
def rag_query(req: ChatRequest):
    """The "Ask" page: answer a question from the knowledge base, with sources."""
    start = time.perf_counter()
    answer, sources, warnings = chat_chain.answer(
        req.question, k=req.k, history=req.history, context=req.analysis_context
    )
    latency = round((time.perf_counter() - start) * 1000, 1)
    return ChatResponse(answer=answer, sources=sources, warnings=warnings, latency_ms=latency)


# ---------------------------------------------------------------- accounts
def _require_db():
    if not db.db_enabled():
        raise HTTPException(503, detail="The database is not set up on this server.")


def _profile(doc: dict, user: AuthUser) -> Profile:
    return Profile(
        uid=user.uid,
        email=user.email,
        email_verified=user.email_verified,
        name=doc["name"],
        email_updates=doc["email_updates"],
        created_at=doc["created_at"],
    )


@app.get("/api/me", response_model=Profile)
def get_me(user: AuthUser = Depends(current_user)):
    """The signed-in user's profile (created on first visit if missing)."""
    _require_db()
    return _profile(db.touch_user(user.uid, user.email, user.name), user)


@app.post("/api/me", response_model=Profile)
def save_me(update: ProfileUpdate, user: AuthUser = Depends(current_user)):
    """Save the name and the email-updates choice (called right after sign-up)."""
    _require_db()
    return _profile(db.save_user(user.uid, user.email, update.name.strip(), update.email_updates), user)


@app.delete("/api/me")
def delete_me(user: AuthUser = Depends(current_user)):
    """Delete everything AdAstra stores about this user. (The browser then
    deletes the Firebase account itself.)"""
    _require_db()
    db.delete_user(user.uid)
    return {"deleted": True}


# ---------------------------------------------------------------- history
def _history_entry(doc: dict) -> HistoryEntry:
    return HistoryEntry(
        id=doc["_id"],
        result=doc["result"],
        file_name=doc["file_name"],
        thumbnail=doc.get("thumbnail"),
        saved_at=doc["saved_at"],
    )


@app.get("/api/history", response_model=HistoryListResponse)
def get_history(user: AuthUser = Depends(current_user)):
    """Every analysis this user has saved, most recent first. Read from the
    database rather than the browser, so it's the same list on any device."""
    _require_db()
    return HistoryListResponse(entries=[_history_entry(d) for d in db.list_history(user.uid)])


@app.post("/api/history", response_model=HistoryEntry)
def save_history(entry: HistoryEntryCreate, user: AuthUser = Depends(current_user)):
    """Called right after a classification completes, so it's saved before
    the user navigates anywhere else."""
    _require_db()
    doc = db.add_history_entry(
        user.uid, entry.result.model_dump(mode="json"), entry.file_name, entry.thumbnail
    )
    return _history_entry(doc)


@app.delete("/api/history/{entry_id}")
def delete_history_entry(entry_id: str, user: AuthUser = Depends(current_user)):
    _require_db()
    db.delete_history_entry(user.uid, entry_id)
    return {"deleted": True}


@app.delete("/api/history")
def clear_history(user: AuthUser = Depends(current_user)):
    _require_db()
    db.clear_history(user.uid)
    return {"deleted": True}