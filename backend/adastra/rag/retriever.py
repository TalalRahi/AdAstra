"""Connects the knowledge index to LangChain.

LangChain chains expect a "retriever": give it a question, get back Documents.
This wraps our KnowledgeBase so it can sit inside the chain (question →
retriever → prompt → Gemma), instead of being called separately.
"""

import logging
import threading

from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever

from ..config import settings
from . import store

log = logging.getLogger("adastra.retriever")

_kb = None
_kb_lock = threading.Lock()


def get_knowledge_base():
    """Load the index once per server process. Returns None if it doesn't exist."""
    global _kb
    with _kb_lock:
        if _kb is None and store.exists():
            try:
                _kb = store.KnowledgeBase()
            except store.IndexMismatch as e:
                log.error("knowledge index unusable: %s", e)
                return None
    return _kb


class KnowledgeRetriever(BaseRetriever):
    kb: object
    k: int = settings.retrieval_k
    min_similarity: float = settings.min_similarity

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> list[Document]:
        hits = self.kb.search(query, k=self.k, min_similarity=self.min_similarity)
        return [
            Document(
                page_content=h.chunk.text,
                metadata={
                    "source_id": h.chunk.source_id,
                    "kind": h.chunk.kind,
                    "title": h.chunk.title,
                    "page": h.chunk.page,
                    "url": h.chunk.url,
                    "chunk_id": h.chunk.chunk_id,
                    "similarity": h.similarity,
                },
            )
            for h in hits
        ]