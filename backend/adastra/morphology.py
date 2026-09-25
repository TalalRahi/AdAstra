"""The conditional second stage: galaxy morphology (elliptical vs spiral).

Runs ONLY when the main classifier's top prediction is "galaxy" with at least
`settings.galaxy_gate_confidence`. Otherwise the response says so and this
stage is skipped entirely — it never guesses a morphology for a star or a
nebula. Same demo/real pattern as classify.py: `OnnxMorphology` if the
artifact is valid, `DemoMorphology` (deterministic, clearly fake) otherwise.
"""

import hashlib
import logging

import numpy as np
from PIL import Image

from .config import settings
from .onnx_runtime import OnnxArtifact
from .schemas import Classification, ClassProbability, GalaxyMorphology, ModelInfo

log = logging.getLogger("adastra.morphology")


class DemoMorphology:
    architecture = "EfficientNet-B0 (not loaded — demo output)"
    weights_loaded = False
    classes = ["elliptical", "spiral"]

    def preprocessed(self, img: Image.Image) -> np.ndarray:
        from .imaging import to_model_input

        return to_model_input(img)  # no manifest yet -> plain demo resize

    def predict_logits(self, model_input: np.ndarray, image_sha256: str) -> np.ndarray:
        seed = int(hashlib.sha256((image_sha256 + "morphology").encode()).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        return rng.normal(0.0, 1.5, size=2)


class OnnxMorphology:
    weights_loaded = True

    def __init__(self, artifact: OnnxArtifact):
        self.artifact = artifact
        self.classes = artifact.manifest["classes"]
        self.architecture = f"{artifact.manifest['architecture']} ({artifact.manifest['dataset']})"
        self.temperature = artifact.manifest.get("calibration", {}).get("temperature", 1.0)

    def preprocessed(self, img: Image.Image) -> np.ndarray:
        from .imaging import to_model_input

        return to_model_input(img, self.artifact.manifest["input"])

    def predict_logits(self, model_input: np.ndarray, image_sha256: str) -> np.ndarray:
        return self.artifact.run(model_input)[0] / self.temperature


_model = None


def get_model():
    global _model
    if _model is None:
        artifact = OnnxArtifact(settings.galaxy_morphology_dir)
        if artifact.available:
            _model = OnnxMorphology(artifact)
            log.info("galaxy morphology: loaded real model (%s)", _model.architecture)
        else:
            _model = DemoMorphology()
            log.info("galaxy morphology: using demo output (%s)", artifact.error)
    return _model


def softmax(logits: np.ndarray) -> np.ndarray:
    z = logits - logits.max()
    e = np.exp(z)
    return e / e.sum()


def classify_morphology(img: Image.Image, image_sha256: str, classification: Classification) -> GalaxyMorphology:
    """Called for every image; decides for itself whether to actually run."""
    model = get_model()
    if classification.predicted_class != settings.galaxy_eligible_class:
        return GalaxyMorphology(enabled=True, ran=False, reason="The predicted class was not \"galaxy\".")
    if classification.confidence < settings.galaxy_gate_confidence:
        return GalaxyMorphology(
            enabled=True, ran=False,
            reason=f"Galaxy confidence ({classification.confidence:.0%}) was below the "
                   f"{settings.galaxy_gate_confidence:.0%} threshold for running morphology.",
        )

    model_input = model.preprocessed(img)
    logits = model.predict_logits(model_input, image_sha256)
    probs = softmax(logits)
    order = np.argsort(probs)[::-1]
    ranked = [
        ClassProbability(label=model.classes[i], probability=round(float(probs[i]), 4))
        for i in order
    ]
    return GalaxyMorphology(
        enabled=True, ran=True,
        predicted_class=ranked[0].label,
        confidence=ranked[0].probability,
        probabilities=ranked,
        model=ModelInfo(architecture=model.architecture, weights_loaded=model.weights_loaded, classes=list(model.classes)),
    )