"""Runs the pipeline stages in order and records timings and warnings."""

import time
import uuid

from . import clip
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

    # Steps 2-3: check the upload (raises ImageError on bad input)
    loaded = timed("decode", load_image, data)

    image_info = ImageInfo(
        width=loaded.image.width,
        height=loaded.image.height,
        format=loaded.format,
        sha256=loaded.sha256,
    )

    # Step 4: does this even look astronomical? Runs FIRST, before the
    # classifier. If it fails this check, the pipeline stops here — no
    # classification, no morphology, no explanation. A deliberate hard stop:
    # showing a confident-looking prediction for a non-astronomical photo
    # would be worse than showing nothing.
    clip_model = clip.get_model()
    clip_input = timed("clip_preprocess", clip_model.preprocessed, loaded.image)
    clip_embedding = timed("clip_embed", clip_model.embed, clip_input, loaded.sha256)
    clip_gate = clip.build_clip_gate(clip_model, clip_embedding, loaded.sha256)
    if not clip_model.weights_loaded:
        warnings.append("No CLIP model is loaded; the astronomical-image check is demo output.")

    if not clip_gate.likely_astronomical:
        warnings.append(clip_gate.message)
        return ClassifyResponse(
            mode="live" if clip_model.weights_loaded else "demo",
            request_id=request_id,
            image=image_info,
            clip=clip_gate,
            classification=None,
            galaxy_morphology=None,
            explanation=None,
            sources=[],
            timings_ms=timings,
            warnings=warnings,
        )

    # Only reached for images that passed the astronomical-image check.

    # Step 5: classify
    model = get_model()
    model_input = timed("preprocess", model.preprocessed, loaded.image)
    logits = timed("classify", model.predict_logits, model_input, loaded.sha256)
    classification = build_classification(model, softmax(logits))
    if not model.weights_loaded:
        warnings.append("No trained model is loaded; classification is demo output.")

    # Now that we have a predicted class, fill in CLIP's agreement check.
    clip_gate.agrees_with_classifier = (
        clip_gate.zero_shot_top3[0].label == classification.predicted_class
    )

    # Conditional second stage: only actually runs for a confident "galaxy" prediction
    morphology = timed("morphology", classify_morphology, loaded.image, loaded.sha256, classification)

    # Steps 6-9: retrieve passages + Gemma explanation (falls back to placeholder text)
    explanation, sources, explain_warnings = timed(
        "explain", explain_chain.explain, classification, level, morphology
    )
    warnings += explain_warnings

    # "live" only when every part that ran is real
    live = model.weights_loaded and clip_model.weights_loaded and explanation.mode == "live"
    return ClassifyResponse(
        mode="live" if live else "demo",
        request_id=request_id,
        image=image_info,
        clip=clip_gate,
        classification=classification,
        galaxy_morphology=morphology,
        explanation=explanation,
        sources=sources,
        timings_ms=timings,
        warnings=warnings,
    )