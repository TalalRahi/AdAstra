"""Build the knowledge index from Wikipedia and your PDFs.

Run from the backend folder (with .venv active):

    python -m scripts.ingest --wikipedia --pdfs            first build
    python -m scripts.ingest --pdfs --append               add new PDFs later
    python -m scripts.ingest --wikipedia --pdfs --rebuild  start over
    python -m scripts.ingest --wikipedia --dry-run         show what would happen

An existing index is never overwritten unless you pass --rebuild
(the old codebase lost its PDFs this way).
"""

import argparse
import json
import re
import sys
import time

import numpy as np
import requests

from adastra.config import settings
from adastra.rag import store
from adastra.rag.chunking import split_text
from adastra.rag.store import Chunk

WIKI_API = "https://en.wikipedia.org/w/api.php"
# Wikipedia asks scripts to say who they are; put your own email here.
HEADERS = {"User-Agent": "AdAstra-thesis/0.1 (CSE 400 student project; talalrahi123456@gmail.com)"}
CACHE_DIR = settings.knowledge_dir.parent / "wikipedia_cache"  # downloaded articles
SKIP_SECTIONS = {"see also", "references", "external links", "further reading",
                 "notes", "bibliography", "sources", "citations", "footnotes"}


# ---------------------------------------------------------------- Wikipedia
def read_topics() -> list[str]:
    lines = settings.topics_file.read_text(encoding="utf-8").splitlines()
    return [l.strip() for l in lines if l.strip() and not l.startswith("#")]


def fetch_wikipedia(title: str) -> tuple[str, str, str] | None:
    """Return (resolved title, plain text, url), or None if the page doesn't exist.

    Articles are saved in CACHE_DIR, so later runs don't download them again.
    If Wikipedia says "too many requests" (429), wait and retry.
    """
    cache_file = CACHE_DIR / (re.sub(r"[^\w\-]+", "_", title) + ".json")
    if cache_file.exists():
        saved = json.loads(cache_file.read_text(encoding="utf-8"))
        return saved["title"], saved["text"], saved["url"]

    params = {
        "action": "query", "prop": "extracts", "explaintext": 1, "redirects": 1,
        "titles": title, "format": "json", "formatversion": 2,
    }
    for attempt in range(5):
        r = requests.get(WIKI_API, params=params, headers=HEADERS, timeout=30)
        if r.status_code == 429 or r.status_code >= 500:
            try:
                wait = int(r.headers.get("Retry-After", ""))
            except ValueError:
                wait = 5 * 2 ** attempt              # 5, 10, 20, 40, 80 seconds
            wait = min(wait, 90)
            print(f"    Wikipedia is busy ({r.status_code}); waiting {wait} s…")
            time.sleep(wait)
            continue
        r.raise_for_status()
        break
    else:
        raise RuntimeError(f"Wikipedia kept refusing '{title}'. Wait a few minutes and run again.")

    page = r.json()["query"]["pages"][0]
    if page.get("missing") or not page.get("extract"):
        return None
    real_title = page["title"]
    url = "https://en.wikipedia.org/wiki/" + real_title.replace(" ", "_")

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(
        json.dumps({"title": real_title, "text": page["extract"], "url": url}, ensure_ascii=False),
        encoding="utf-8",
    )
    return real_title, page["extract"], url


def drop_back_matter(text: str) -> str:
    """Remove 'See also', 'References', ... sections: link lists, not facts.

    Wikipedia plain text marks headings as '== Heading ==' (sub-headings use
    '=== ... ==='). We skip every line from a skipped top-level heading until
    the next top-level heading.
    """
    kept, skipping = [], False
    for line in text.splitlines():
        m = re.fullmatch(r"\s*(=+)\s*(.*?)\s*=+\s*", line)
        if m and len(m.group(1)) == 2:          # top-level heading
            skipping = m.group(2).lower() in SKIP_SECTIONS
        if not skipping:
            kept.append(line.strip("= ") if m else line)
    return "\n".join(kept)


def wikipedia_chunks() -> list[Chunk]:
    chunks = []
    for topic in read_topics():
        result = fetch_wikipedia(topic)
        if result is None:
            print(f"  ! Wikipedia has no page called '{topic}' — check the spelling")
            continue
        title, text, url = result
        pieces = split_text(drop_back_matter(text), chunk_size=800, overlap=100)
        chunks += [Chunk(f"wikipedia:{title}", "wikipedia", title, p, None, url) for p in pieces]
        print(f"  wikipedia  {title:40s} {len(pieces):4d} chunks")
        time.sleep(1.0)  # be polite to Wikipedia: at most one article per second
    return chunks


# ---------------------------------------------------------------- PDFs
def pdf_chunks() -> list[Chunk]:
    from pypdf import PdfReader

    chunks = []
    pdfs = sorted(settings.corpus_dir.rglob("*.pdf"))
    if not pdfs:
        print(f"  (no PDFs found in {settings.corpus_dir})")
    for path in pdfs:
        folder = path.parent.name
        kind = {"papers": "paper", "books": "book"}.get(folder, "other")
        title = path.stem.replace("_", " ")
        rel = path.relative_to(settings.corpus_dir).as_posix()
        try:
            reader = PdfReader(str(path))
        except Exception as e:
            print(f"  ! could not open {rel}: {e}")
            continue
        count, empty_pages = 0, 0
        for page_no, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            if len(text.strip()) < 20:
                empty_pages += 1
                continue
            for p in split_text(text, chunk_size=1000, overlap=150):
                chunks.append(Chunk(f"pdf:{rel}", kind, title, p, page_no, None))
                count += 1
        print(f"  {kind:10s} {rel:40s} {count:4d} chunks")
        if empty_pages > len(reader.pages) / 2:
            print(f"  ! {rel}: most pages have no text — it's probably scanned. "
                  f"Run it through OCR (e.g. ocrmypdf) first.")
    return chunks


# ---------------------------------------------------------------- main
def main(argv=None, folder=None) -> int:
    ap = argparse.ArgumentParser(description="Build the AdAstra knowledge index.")
    ap.add_argument("--wikipedia", action="store_true", help="include topics from wikipedia_topics.txt")
    ap.add_argument("--pdfs", action="store_true", help="include PDFs from knowledge/corpus")
    ap.add_argument("--append", action="store_true", help="add to the existing index")
    ap.add_argument("--rebuild", action="store_true", help="delete the existing index and start over")
    ap.add_argument("--dry-run", action="store_true", help="collect and chunk, but don't embed or save")
    args = ap.parse_args(argv)

    if not (args.wikipedia or args.pdfs):
        ap.error("choose at least one source: --wikipedia and/or --pdfs")
    if args.append and args.rebuild:
        ap.error("use --append OR --rebuild, not both")

    folder = folder or settings.knowledge_dir  # tests pass a temporary folder
    if store.exists(folder) and not (args.append or args.rebuild or args.dry_run):
        print(f"An index already exists in {folder}.\n"
              f"Use --append to add to it, or --rebuild to replace it.")
        return 1

    print("Collecting text…")
    new = (wikipedia_chunks() if args.wikipedia else []) + (pdf_chunks() if args.pdfs else [])

    old_chunks, old_vectors = [], None
    if args.append and store.exists(folder):
        index, old_chunks, _ = store.load(folder)
        old_vectors = index.reconstruct_n(0, index.ntotal)
        known = {c.source_id for c in old_chunks}
        before = len(new)
        new = [c for c in new if c.source_id not in known]
        print(f"Append: {before - len(new)} chunks skipped (sources already in the index).")

    print(f"{len(new)} new chunks.")
    if args.dry_run:
        for c in new[:3]:
            print(f"\n--- {c.source_id} p.{c.page}\n{c.text[:300]}…")
        return 0
    if not new and not old_chunks:
        print("Nothing to index.")
        return 1

    if new:
        from adastra.rag.embedder import embed

        print("Embedding (the first run downloads the model, ~90 MB)…")
        vectors = embed([c.text for c in new])
    else:
        vectors = np.zeros((0, 384), dtype="float32")

    if old_vectors is not None:
        vectors = np.vstack([old_vectors, vectors])
    manifest = store.save(folder, vectors, old_chunks + new)
    print(f"Saved {manifest['chunks']} chunks from {len(manifest['sources'])} sources to {folder}")
    return 0


if __name__ == "__main__":
    sys.exit(main())