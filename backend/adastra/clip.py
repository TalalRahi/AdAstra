"""Step 4 (runs FIRST, before the classifier): does this even look like an
astronomical image? If not, the pipeline stops here — no classification, no
morphology, no explanation. This is a deliberate hard stop, not a warning
alongside a result: showing a confident-looking prediction for a photo of a
person or a movie still would be worse than showing nothing.

(Earlier drafts of this module treated the gate as advisory only, per the
original build spec's "never blocks" language — that was changed on request:
the goal here is "tell people correctly," and a wrong-but-confident answer
works against that more than an honest "can't classify" does.)

Same demo/real pattern as classify.py and morphology.py: `OnnxClip` if
`artifacts/clip/{manifest.json, model file, text embeddings .npz}` are
present and valid, otherwise `DemoClip`. A demo CLIP has no real image
understanding at all — it cannot actually tell whether an image is
astronomical — so its output is deterministic from the image hash, exactly
like DemoClassifier, and clearly marked `weights_loaded=False`. The real
gate only works once the exported CLIP artifact is in place
(training/export/export_clip.py, run on Kaggle).
"""

import hashlib
import logging

import numpy as np

from .config import settings
from .onnx_runtime import OnnxArtifact
from .schemas import ClassProbability, ClipGate

log = logging.getLogger("adastra.clip")


def _softmax(logits: np.ndarray) -> np.ndarray:
    z = logits - logits.max()  # numerical stability
    e = np.exp(z)
    return e / e.sum()


class DemoClip:
    architecture = "CLIP ViT-B/32 (not loaded — demo output)"
    weights_loaded = False
    gate_names = ["astronomical", "non_astronomical"]

    def __init__(self, classes: list[str]):
        self.classes = classes
        self.threshold = (
            settings.clip_astro_threshold if settings.clip_astro_threshold is not None else 0.5
        )

    def preprocessed(self, img):
        from .imaging import to_model_input

        return to_model_input(img)  # no manifest yet -> plain demo resize

    def embed(self, model_input: np.ndarray, image_sha256: str) -> np.ndarray:
        # No real image understanding here — deterministic from the image
        # hash only, exactly like DemoClassifier. Never a real judgement
        # about whether the image is astronomical.
        seed = int(hashlib.sha256((image_sha256 + "clip-embed").encode()).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        v = rng.normal(0.0, 1.0, size=512)
        return v / np.linalg.norm(v)

    def gate_logits(self, embedding: np.ndarray, image_sha256: str) -> np.ndarray:
        seed = int(hashlib.sha256((image_sha256 + "clip-gate").encode()).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        return rng.normal(0.0, 1.5, size=2)

    def class_logits(self, embedding: np.ndarray, image_sha256: str) -> np.ndarray:
        seed = int(hashlib.sha256((image_sha256 + "clip-classes").encode()).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        return rng.normal(0.0, 1.5, size=len(self.classes))


class OnnxClip:
    """Wraps the exported CLIP vision tower (ONNX, via the same OnnxArtifact
    loader the classifier uses) plus the offline-computed text embeddings
    (.npz) that make up the other half of CLIP. The text side never runs at
    request time — see training/export/export_clip.py."""

    weights_loaded = True

    def __init__(self, artifact: OnnxArtifact):
        self.artifact = artifact
        manifest = artifact.manifest
        self.architecture = manifest["architecture"]
        self.classes = manifest["classes"]
        self.logit_scale = float(manifest.get("logit_scale", 100.0))
        self.threshold = (
            settings.clip_astro_threshold
            if settings.clip_astro_threshold is not None
            else float(manifest.get("likely_astronomical_threshold", 0.5))
        )

        npz_path = artifact.folder / manifest["text_embeddings_file"]
        data = np.load(npz_path, allow_pickle=False)
        self.gate_names = list(data["gate_names"])
        self.gate_embeddings = data["gate_embeddings"].astype(np.float32)  # (2, dim), L2-normalised
        self.class_embeddings = data["class_embeddings"].astype(np.float32)  # (5, dim), L2-normalised

        # The manifest's class order must match the main classifier's exactly,
        # so a zero-shot second opinion compares like for like.
        if list(data["class_names"]) != self.classes:
            raise ValueError(
                "artifacts/clip: manifest.json classes and the .npz class_names disagree"
            )

    def preprocessed(self, img):
        from .imaging import to_model_input

        return to_model_input(img, self.artifact.manifest["input"])

    def embed(self, model_input: np.ndarray, image_sha256: str) -> np.ndarray:
        # image_sha256 is unused here (only DemoClip needs it) — kept so
        # pipeline.py can call either model the same way.
        return self.artifact.run(model_input)[0]  # drop the batch dim; already L2-normalised by the export wrapper

    def gate_logits(self, embedding: np.ndarray, image_sha256: str) -> np.ndarray:
        return self.logit_scale * (self.gate_embeddings @ embedding)

    def class_logits(self, embedding: np.ndarray, image_sha256: str) -> np.ndarray:
        return self.logit_scale * (self.class_embeddings @ embedding)


_model = None


def get_model():
    """Load once per process: the real ONNX CLIP gate if the artifact is
    valid, otherwise the demo gate (with a logged reason why)."""
    global _model
    if _model is None:
        artifact = OnnxArtifact(settings.clip_dir)
        if artifact.available:
            try:
                _model = OnnxClip(artifact)
                log.info("clip: loaded real model (%s)", _model.architecture)
            except (OSError, ValueError, KeyError) as e:
                log.warning("clip: artifact present but invalid (%s) — using demo output", e)
                _model = DemoClip(settings.class_names)
        else:
            _model = DemoClip(settings.class_names)
            log.info("clip: using demo output (%s)", artifact.error)
    return _model


def build_clip_gate(model, embedding: np.ndarray, image_sha256: str) -> ClipGate:
    """Turn one image embedding into the astronomical-or-not gate plus the
    zero-shot top-3. Called BEFORE the classifier runs, so there is no
    predicted class yet to compare against — `agrees_with_classifier` is
    filled in afterward by pipeline.py, only when classification actually ran.
    """
    gate_probs = _softmax(model.gate_logits(embedding, image_sha256))
    astro_idx = model.gate_names.index("astronomical")
    astro_score = round(float(gate_probs[astro_idx]), 4)
    likely_astronomical = astro_score >= model.threshold

    class_probs = _softmax(model.class_logits(embedding, image_sha256))
    order = np.argsort(class_probs)[::-1]
    zero_shot_top3 = [
        ClassProbability(label=model.classes[i], probability=round(float(class_probs[i]), 4))
        for i in order[:3]
    ]

    message = None
    if not likely_astronomical:
        message = "This doesn't look like an astronomical image, so it can't be classified."

    return ClipGate(
        weights_loaded=model.weights_loaded,
        architecture=model.architecture,
        astro_score=astro_score,
        threshold=model.threshold,
        likely_astronomical=likely_astronomical,
        zero_shot_top3=zero_shot_top3,
        agrees_with_classifier=None,
        message=message,
    )