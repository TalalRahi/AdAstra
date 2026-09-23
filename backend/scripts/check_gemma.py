"""Check that your Google API key works and which Gemma models it can use.

    python -m scripts.check_gemma
"""

import os
import sys

from adastra.config import settings  # noqa: F401  (loads backend/.env)


def main() -> int:
    key = os.getenv("GOOGLE_API_KEY", "")
    if not key:
        print("GOOGLE_API_KEY is empty. Put your key in backend/.env and try again.")
        return 1
    print(f"Key found (starts with {key[:4]}…, {len(key)} characters).")

    from google import genai
    from google.genai import errors

    client = genai.Client(api_key=key)
    try:
        names = [m.name.removeprefix("models/") for m in client.models.list()]
    except errors.ClientError as e:
        print(f"Google rejected the key: {e}")
        return 1

    gemma = sorted(n for n in names if n.startswith("gemma"))
    print("Gemma models available to your key:")
    for n in gemma:
        print("  ", n)

    wanted = os.getenv("GEMMA_MODEL", "gemma-4-26b-a4b-it")
    if wanted not in names:
        print(f"\n'{wanted}' is NOT in the list. Set GEMMA_MODEL in .env to one of the names above.")
        return 1

    from langchain_google_genai import ChatGoogleGenerativeAI

    llm = ChatGoogleGenerativeAI(model=wanted, temperature=0.2, max_retries=1, timeout=60)
    reply = llm.invoke("In one sentence, what is a nebula?")
    print(f"\n{wanted} says: {reply.text.strip()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())