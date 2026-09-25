"""Step 4: classification + abstention.

`OnnxClassifier` loads the real, trained EfficientNet-B0 (SpaceNet, 5 classes)
if `artifacts/classifier/{manifest.json,model.onnx}` are present and valid.
Otherwise `DemoClassifier` produces fake but deterministic probabilities (the
same image always gets the same output) — the app never crashes for a missing
model, and never claims a demo result is real.
"""

import hashlib
import logging

import numpy as np

from .config import settings
from .onnx_runtime import OnnxArtifact
from .schemas import Classification, ClassProbability, ModelInfo

log = logging.getLogger("adastra.classify")


class DemoClassifier:
    architecture = "EfficientNet-B0 (not loaded — demo output)"
    weights_loaded = False

    def __init__(self, classes: list[str]):
        self.classes = classes

    def preprocessed(self, img):
        from .imaging import to_model_input

        return to_model_input(img)  # no manifest yet -> plain demo resize

    def predict_logits(self, model_input: np.ndarray, image_sha256: str) -> np.ndarray:
        seed = int(hashlib.sha256(image_sha256.encode()).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        return rng.normal(0.0, 1.5, size=len(self.classes))


class OnnxClassifier:
    """Wraps an OnnxArtifact with the same predict_logits(...) interface as
    DemoClassifier, so pipeline.py never needs to know which one it has."""

    weights_loaded = True

    def __init__(self, artifact: OnnxArtifact):
        self.artifact = artifact
        self.classes = artifact.manifest["classes"]
        self.architecture = f"{artifact.manifest['architecture']} ({artifact.manifest['dataset']})"
        self.temperature = artifact.manifest.get("calibration", {}).get("temperature", 1.0)

    def preprocessed(self, img):
        from .imaging import to_model_input

        return to_model_input(img, self.artifact.manifest["input"])

    def predict_logits(self, model_input: np.ndarray, image_sha256: str) -> np.ndarray:
        logits = self.artifact.run(model_input)[0]  # drop the batch dimension
        return logits / self.temperature


def softmax(logits: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    z = logits / temperature
    z = z - z.max()  # numerical stability
    e = np.exp(z)
    return e / e.sum()


def check_uncertain(p1: float, p2: float) -> tuple[bool, str | None]:
    if p1 < settings.min_confidence:
        return True, (
            f"Top confidence {p1:.0%} is below the {settings.min_confidence:.0%} threshold."
        )
    if p1 - p2 < settings.min_margin:
        return True, (
            f"The top two classes are only {p1 - p2:.0%} apart "
            f"(threshold {settings.min_margin:.0%})."
        )
    return False, None


def build_classification(model, probs: np.ndarray) -> Classification:
    names = model.classes
    order = np.argsort(probs)[::-1]
    ranked = [
        ClassProbability(label=names[i], probability=round(float(probs[i]), 4))
        for i in order
    ]
    p1 = ranked[0].probability
    p2 = ranked[1].probability if len(ranked) > 1 else 0.0
    uncertain, reason = check_uncertain(p1, p2)
    return Classification(
        predicted_class=ranked[0].label,
        confidence=p1,
        probabilities=ranked,
        top_k=ranked[: settings.top_k],
        uncertain=uncertain,
        uncertainty_reason=reason,
        model=ModelInfo(
            architecture=model.architecture,
            weights_loaded=model.weights_loaded,
            classes=list(names),
        ),
    )


_model = None


def get_model():
    """Load once per process: the real ONNX classifier if the artifact is
    valid, otherwise the demo classifier (with a logged reason why)."""
    global _model
    if _model is None:
        artifact = OnnxArtifact(settings.classifier_dir)
        if artifact.available:
            _model = OnnxClassifier(artifact)
            log.info("classifier: loaded real model (%s)", _model.architecture)
        else:
            _model = DemoClassifier(settings.class_names)
            log.info("classifier: using demo output (%s)", artifact.error)
    return _model