"""Split long text into overlapping passages ("chunks").

Why: the search compares the question with each chunk. A whole book chapter is
too broad to match well; one sentence has too little context. A few hundred
words is a good middle. Overlap stops an idea being cut in half at a boundary.
"""

import re

SEPARATORS = ["\n\n", "\n", ". ", " "]


def clean(text: str) -> str:
    text = text.replace("\u00ad", "")               # soft hyphens from PDFs
    text = re.sub(r"-\n(?=[a-z])", "", text)         # re-join "galax-\nies"
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _split(text: str, size: int, separators: list[str]) -> list[str]:
    """Cut text into pieces no longer than `size`, preferring big separators."""
    if len(text) <= size:
        return [text]
    for i, sep in enumerate(separators):
        if sep in text:
            pieces = []
            for part in text.split(sep):
                part = part + sep if sep != " " else part + " "
                if len(part) > size:
                    pieces.extend(_split(part, size, separators[i + 1:]))
                else:
                    pieces.append(part)
            return pieces
    # no separator at all: hard cut
    return [text[i:i + size] for i in range(0, len(text), size)]


def split_text(text: str, chunk_size: int = 800, overlap: int = 100, min_chars: int = 80) -> list[str]:
    """Return chunks of at most ~chunk_size characters, each starting with the
    last ~overlap characters of the previous one."""
    pieces = _split(clean(text), chunk_size, SEPARATORS)
    chunks: list[str] = []
    current = ""
    for piece in pieces:
        if len(current) + len(piece) > chunk_size and current:
            chunks.append(current.strip())
            tail = current[-overlap:] if overlap else ""
            # start the overlap at a word boundary
            current = tail[tail.find(" ") + 1:] if " " in tail else tail
        current += piece
    if current.strip():
        chunks.append(current.strip())
    return [c for c in chunks if len(c) >= min_chars]