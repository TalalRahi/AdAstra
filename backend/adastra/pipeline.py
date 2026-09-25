"""Runs the pipeline stages in order and records timings and warnings."""

import time
import uuid

from .classify import build_classification, get_model, softmax
from .imaging import load_image
from .morphology import classify_morphology
from .rag import explain_chain
from .schemas import ClassifyResponse, ImageInfo, Level


def run(data: bytes, level: Level, request_id: str | None = None) -> ClassifyResponse:
    request_id = request_id or uuid.uuid4().hex[:12]
    timings: dict[str, float] = {}
    warnings: list[str] = []

    def timed(name, fn, *args):
        """Run fn(*args) and store how long it took in milliseconds."""
        start = time.perf_counter()
        result = fn(*args)
        timings[name] = round((time.perf_counter() - start) * 1000, 1)
        return result

    # Steps 2-3: check the upload, make model input (raises ImageError on bad input)
    loaded = timed("decode", load_image, data)
    model = get_model()
    model_input = timed("preprocess", model.preprocessed, loaded.image)

    # Step 4: classify
    logits = timed("classify", model.predict_logits, model_input, loaded.sha256)
    classification = build_classification(model, softmax(logits))
    if not model.weights_loaded:
        warnings.append("No trained model is loaded; classification is demo output.")

    # Conditional second stage: only actually runs for a confident "galaxy" prediction
    morphology = timed("morphology", classify_morphology, loaded.image, loaded.sha256, classification)

    # Steps 5-8: retrieve passages + Gemma explanation (falls back to placeholder text)
    explanation, sources, explain_warnings = timed(
        "explain", explain_chain.explain, classification, level, morphology
    )
    warnings += explain_warnings

    # "live" only when every part is real
    live = model.weights_loaded and explanation.mode == "live"
    return ClassifyResponse(
        mode="live" if live else "demo",
        request_id=request_id,
        image=ImageInfo(
            width=loaded.image.width,
            height=loaded.image.height,
            format=loaded.format,
            sha256=loaded.sha256,
        ),
        classification=classification,
        galaxy_morphology=morphology,
        explanation=explanation,
        sources=sources,
        timings_ms=timings,
        warnings=warnings,
    )