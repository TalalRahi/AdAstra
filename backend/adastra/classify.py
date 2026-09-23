"""Pipeline step 4: classification + abstention.

DemoClassifier stands in for the real model. When your EfficientNet-B0
arrives, a real classifier with the SAME predict_logits method replaces it
and nothing else in the app has to change.
"""

import hashlib

import numpy as np

from .config import settings
from .schemas import Classification, ClassProbability, ModelInfo


class DemoClassifier:
    architecture = "EfficientNet-B0 (not loaded — demo output)"
    weights_loaded = False

    def predict_logits(self, model_input: np.ndarray, image_sha256: str) -> np.ndarray:
        """Fake but repeatable scores: the same image always gets the same output."""
        seed = int(hashlib.sha256(image_sha256.encode()).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        return rng.normal(0.0, 1.5, size=len(settings.class_names))


def softmax(logits: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    """Raw scores -> probabilities that add up to 1."""
    z = logits / temperature
    z = z - z.max()  # subtracting the max avoids overflow; the result is unchanged
    e = np.exp(z)
    return e / e.sum()


def check_uncertain(p1: float, p2: float) -> tuple[bool, str | None]:
    """p1 = top probability, p2 = runner-up probability."""
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
    """Sort the classes by probability and package the result."""
    names = settings.class_names
    order = np.argsort(probs)[::-1]  # indices, highest probability first
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
    """Create the model once per server process and reuse it."""
    global _model
    if _model is None:
        _model = DemoClassifier()
    return _model