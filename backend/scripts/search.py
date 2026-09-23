"""Try the knowledge index from the terminal:

    python -m scripts.search "how do spiral galaxies form"
"""

import sys

from adastra.rag.store import KnowledgeBase


def main() -> None:
    query = " ".join(sys.argv[1:]) or "What is a galaxy?"
    kb = KnowledgeBase()
    hits = kb.search(query, k=4, min_similarity=0.0)
    print(f"Query: {query}\n")
    for n, h in enumerate(hits, start=1):
        c = h.chunk
        where = f"p. {c.page}" if c.page else c.url
        print(f"[{n}] similarity {h.similarity:.2f}  {c.kind}: {c.title} ({where})")
        print("    " + c.text[:300].replace("\n", " ") + "…\n")


if __name__ == "__main__":
    main()