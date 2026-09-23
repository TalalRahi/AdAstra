"""Turn text into vectors (lists of 384 numbers) that capture its meaning.

Texts with similar meaning get vectors pointing in similar directions, so
"how do stars form" lands close to a passage about stellar nurseries even
though they share few words. The SAME model must be used for building the
index and for searching it, otherwise the numbers are not comparable.
"""

import threading

import numpy as np

from ..config import settings

_model = None
_lock = threading.Lock()


def get_model():
    """Load the embedding model once (downloads ~90 MB the first time)."""
    global _model
    with _lock:
        if _model is None:
            from fastembed import TextEmbedding  # imported here so tests can skip it

            settings.model_cache_dir.mkdir(parents=True, exist_ok=True)
            _model = TextEmbedding(settings.embed_model, cache_dir=str(settings.model_cache_dir))
    return _model


def normalise(vectors: np.ndarray) -> np.ndarray:
    """Scale every vector to length 1, so inner product = cosine similarity."""
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    return (vectors / np.maximum(norms, 1e-12)).astype("float32")


def embed(texts: list[str]) -> np.ndarray:
    """Return an array of shape (len(texts), 384), normalised."""
    vectors = np.array(list(get_model().embed(texts, batch_size=32)), dtype="float32")
    return normalise(vectors)