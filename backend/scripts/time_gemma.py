"""Try Gemma with different settings on one real explanation request, and
report how long each takes (or how it fails).

    python -m scripts.time_gemma
"""

import time

from langchain_google_genai import ChatGoogleGenerativeAI

from adastra.rag.citations import format_numbered
from adastra.rag.explain_chain import LEVELS, PROMPT
from adastra.rag.retriever import KnowledgeRetriever, get_knowledge_base

TESTS = [
    ("E: 26B, thinking minimal", {"model": "gemma-4-26b-a4b-it", "thinking_level": "minimal"}),
    ("F: 26B, thinking low", {"model": "gemma-4-26b-a4b-it", "thinking_level": "low"}),
    ("G: 26B, room to finish", {"model": "gemma-4-26b-a4b-it", "max_output_tokens": 4096}),
]

def build_prompt():
    docs = KnowledgeRetriever(kb=get_knowledge_base()).invoke("Spiral galaxy")
    audience, style = LEVELS["beginner"]
    return PROMPT.invoke({
        "audience": audience, "style": style, "predicted_class": "Spiral galaxy",
        "confidence": "87%", "uncertainty": "The classifier is fairly confident.",
        "passages": format_numbered(docs),
    })


def main() -> None:
    prompt = build_prompt()
    results = []
    for name, options in TESTS:
        print(f"\n=== {name} (waiting up to 90 s) ===")
        llm = ChatGoogleGenerativeAI(temperature=0.3, max_retries=1, timeout=90, **options)
        start = time.perf_counter()
        try:
            reply = llm.invoke(prompt)
        except Exception as e:
            seconds = time.perf_counter() - start
            message = str(e).split("\n")[0][:400]
            print(f"FAILED after {seconds:.0f} s: {message}")
            results.append((name, f"failed after {seconds:.0f} s"))
            continue
        seconds = time.perf_counter() - start
        usage = reply.usage_metadata or {}
        thinking = (usage.get("output_token_details") or {}).get("reasoning", 0)
        print(f"OK in {seconds:.1f} s  (output tokens {usage.get('output_tokens')}, thinking tokens {thinking})")
        print(reply.text[:400])
        results.append((name, f"OK in {seconds:.1f} s, cites [n]: {'[' in reply.text}"))

    print("\n=== SUMMARY ===")
    for name, outcome in results:
        print(f"{name:25s} {outcome}")


if __name__ == "__main__":
    main()