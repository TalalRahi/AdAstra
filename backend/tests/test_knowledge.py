"""Knowledge-base tests. A fake embedder replaces the real model, so these run
offline in a second. (Real search quality is checked with scripts/search.py.)"""

import hashlib

import numpy as np
import pytest

from adastra.config import settings
from adastra.rag import store
from adastra.rag.chunking import split_text
from adastra.rag.embedder import normalise
from adastra.rag.store import Chunk, KnowledgeBase


def fake_embed(texts):
    """Bag-of-words hashed into 384 slots: texts sharing words point the same way."""
    out = np.zeros((len(texts), 384), dtype="float32")
    for row, text in enumerate(texts):
        for word in text.lower().split():
            out[row, int(hashlib.md5(word.encode()).hexdigest(), 16) % 384] += 1
    return normalise(out)


CHUNKS = [
    Chunk("wikipedia:Galaxy", "wikipedia", "Galaxy", "spiral galaxy arms stars disk rotation"),
    Chunk("wikipedia:Nebula", "wikipedia", "Nebula", "nebula gas dust cloud star formation"),
    Chunk("pdf:papers/moon.pdf", "paper", "moon", "moon phases lunar orbit earth", page=3),
]


def test_chunks_respect_size_and_overlap():
    text = "Stars form in clouds. " * 200
    chunks = split_text(text, chunk_size=500, overlap=80)
    assert len(chunks) > 1
    assert all(len(c) <= 520 for c in chunks)
    assert chunks[1][:20] in chunks[0]          # overlap carried over


def test_save_load_and_search(tmp_path):
    store.save(tmp_path, fake_embed([c.text for c in CHUNKS]), CHUNKS)
    kb = KnowledgeBase(tmp_path, embed_fn=fake_embed)
    hits = kb.search("spiral galaxy arms", k=3, min_similarity=0.0)
    assert hits[0].chunk.title == "Galaxy"
    assert hits == sorted(hits, key=lambda h: -h.similarity)   # best first
    assert kb.search("pizza recipe", k=3, min_similarity=0.25) == []  # nothing relevant
    assert kb.chunks[2].page == 3


def test_wrong_embedding_model_is_refused(tmp_path):
    store.save(tmp_path, fake_embed(["a text"]), [Chunk("x", "other", "x", "a text")])
    manifest = tmp_path / "manifest.json"
    manifest.write_text(manifest.read_text().replace(settings.embed_model, "some-other-model"))
    with pytest.raises(store.IndexMismatch):
        store.load(tmp_path)


def test_ingest_refuses_overwrite_and_append_skips_duplicates(tmp_path, monkeypatch):
    from scripts import ingest

    monkeypatch.setattr(ingest, "wikipedia_chunks", lambda: [CHUNKS[0], CHUNKS[1]])
    monkeypatch.setattr(ingest, "pdf_chunks", lambda: [CHUNKS[2]])
    monkeypatch.setattr("adastra.rag.embedder.embed", fake_embed)

    assert ingest.main(["--wikipedia"], folder=tmp_path) == 0
    assert ingest.main(["--pdfs"], folder=tmp_path) == 1     # refuses: index exists
    assert ingest.main(["--wikipedia", "--pdfs", "--append"], folder=tmp_path) == 0
    _, chunks, manifest = store.load(tmp_path)
    assert len(chunks) == 3                                  # Wikipedia not duplicated
    assert manifest["sources"] == sorted(c.source_id for c in CHUNKS)