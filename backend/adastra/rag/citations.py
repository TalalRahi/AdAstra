"""Numbered passages in, checked [n] citations out."""

import re

from langchain_core.documents import Document

from ..schemas import Source

SNIPPET_CHARS = 320


def format_numbered(docs: list[Document]) -> str:
    """The passages as Gemma sees them: [1] (title) text …"""
    if not docs:
        return "(No relevant passages were found in the knowledge base.)"
    blocks = []
    for n, d in enumerate(docs, start=1):
        m = d.metadata
        where = f", page {m['page']}" if m.get("page") else ""
        blocks.append(f"[{n}] ({m['title']}{where})\n{d.page_content}")
    return "\n\n".join(blocks)


def to_sources(docs: list[Document]) -> list[Source]:
    """The same passages as the frontend shows them, numbered the same way."""
    sources = []
    for n, d in enumerate(docs, start=1):
        m = d.metadata
        snippet = d.page_content.replace("\n", " ")
        if len(snippet) > SNIPPET_CHARS:
            snippet = snippet[:SNIPPET_CHARS].rsplit(" ", 1)[0] + "…"
        sources.append(
            Source(id=n, title=m["title"], kind=m["kind"], page=m.get("page"),
                   url=m.get("url"), snippet=snippet)
        )
    return sources


def check_citations(text: str, n_sources: int) -> tuple[str, list[int], list[int]]:
    """Return (cleaned text, cited ids, invalid ids).

    - "[1, 3]" and "[1,3]" become "[1][3]" so every citation is one chip
    - numbers that don't match a real source (e.g. [7] when there are 4) are removed
    """
    text = re.sub(
        r"\[(\d+(?:\s*,\s*\d+)+)\]",
        lambda m: "".join(f"[{x.strip()}]" for x in m.group(1).split(",")),
        text,
    )
    cited, invalid = [], []

    def keep_or_drop(m: re.Match) -> str:
        n = int(m.group(2))
        if 1 <= n <= n_sources:
            if n not in cited:
                cited.append(n)
            return m.group(0)            # keep it
        invalid.append(n)
        return ""                        # remove it (and the space before it)

    text = re.sub(r"(\s?)\[(\d+)\]", keep_or_drop, text)
    return text, sorted(cited), invalid