"""The knowledge index on disk: three files, no database.

  index.faiss     the vectors (FAISS finds the nearest ones quickly)
  docstore.jsonl  one line per chunk: its text and where it came from;
                  line N belongs to vector N
  manifest.json   which embedding model built it, how many chunks, sources
"""

import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from ..config import settings


@dataclass
class Chunk:
    source_id: str          # e.g. "wikipedia:Galaxy" or "pdf:papers/smith2020.pdf"
    kind: str               # paper | book | wikipedia | other
    title: str
    text: str
    page: int | None = None  # 1-based page for PDFs
    url: str | None = None
    chunk_id: str = ""


@dataclass
class Hit:
    chunk: Chunk
    similarity: float       # cosine similarity, higher = closer (max 1.0)


class IndexMismatch(Exception):
    pass


def _paths(folder: Path):
    return folder / "index.faiss", folder / "docstore.jsonl", folder / "manifest.json"


def exists(folder: Path | None = None) -> bool:
    return all(p.exists() for p in _paths(folder or settings.knowledge_dir))


def load(folder: Path | None = None):
    """Return (faiss_index, list[Chunk], manifest)."""
    import faiss

    folder = folder or settings.knowledge_dir
    index_path, docs_path, manifest_path = _paths(folder)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest["embed_model"] != settings.embed_model:
        raise IndexMismatch(
            f"Index was built with {manifest['embed_model']}, "
            f"but the app uses {settings.embed_model}. Rebuild the index."
        )
    index = faiss.read_index(str(index_path))
    with docs_path.open(encoding="utf-8") as f:
        chunks = [Chunk(**json.loads(line)) for line in f if line.strip()]
    if index.ntotal != len(chunks):
        raise IndexMismatch(f"index has {index.ntotal} vectors but docstore has {len(chunks)} chunks")
    return index, chunks, manifest


def save(folder: Path, vectors: np.ndarray, chunks: list[Chunk]) -> dict:
    """Write a brand-new index (overwrites whatever is in `folder`)."""
    import faiss

    folder.mkdir(parents=True, exist_ok=True)
    index_path, docs_path, manifest_path = _paths(folder)
    index = faiss.IndexFlatIP(vectors.shape[1])  # inner product on unit vectors = cosine
    index.add(vectors.astype("float32"))
    faiss.write_index(index, str(index_path))
    with docs_path.open("w", encoding="utf-8") as f:
        for i, c in enumerate(chunks):
            c.chunk_id = str(i)
            f.write(json.dumps(asdict(c), ensure_ascii=False) + "\n")
    sources = sorted({c.source_id for c in chunks})
    manifest = {
        "embed_model": settings.embed_model,
        "dim": int(vectors.shape[1]),
        "chunks": len(chunks),
        "sources": sources,
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


class KnowledgeBase:
    """Loaded once, then searched for every request."""

    def __init__(self, folder: Path | None = None, embed_fn=None):
        from .embedder import embed

        self.index, self.chunks, self.manifest = load(folder)
        self.embed = embed_fn or embed

    def search(self, query: str, k: int | None = None, min_similarity: float | None = None) -> list[Hit]:
        k = k or settings.retrieval_k
        threshold = settings.min_similarity if min_similarity is None else min_similarity
        vector = self.embed([query])
        scores, ids = self.index.search(vector, min(k, len(self.chunks)))
        hits = [
            Hit(self.chunks[i], round(float(s), 4))
            for s, i in zip(scores[0], ids[0])
            if i != -1 and s >= threshold
        ]
        return hits