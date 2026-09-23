"""Talking to Gemma: one place for the model settings, retries and error handling.

Retry rule (the old codebase retried everything 5 times and hung for ~30 s):
  - 429 "too many requests" and 503 "overloaded" are temporary → wait, retry (max 3 tries)
  - wrong key, unknown model, bad request, timeout → retrying cannot help → fail at once

Thinking: Gemma 4 "thinks" silently before answering. Measured on 23 Sep 2026
(scripts/time_gemma.py) with a real explanation prompt:
  - default thinking: >4000 hidden tokens, ~90 s, no answer yet → Google 504
  - thinking_level="minimal": 0 hidden tokens, ~25 s, correct cited answer
  - thinking_budget=0 and thinking_level="low": rejected (400) for Gemma
So we use "minimal".
"""

import os
from functools import lru_cache

from tenacity import Retrying, retry_if_exception, stop_after_attempt, wait_exponential

from ..config import settings

THINKING_LEVEL = "minimal"
MAX_OUTPUT_TOKENS = 1024     # four paragraphs fit easily; stops runaway answers

RETRYABLE = {429, 503}

FRIENDLY = {
    400: ("llm_bad_request", "Gemma rejected the request."),
    401: ("llm_auth_error", "The Google API key was rejected. Check GOOGLE_API_KEY in backend/.env."),
    403: ("llm_auth_error", "The Google API key is not allowed to use this model."),
    404: ("llm_model_not_found", "Model '{model}' was not found. Check GEMMA_MODEL in backend/.env."),
    429: ("llm_rate_limited", "Gemma's free-tier limit was reached. Try again in a minute."),
    503: ("llm_unavailable", "Gemma is temporarily overloaded. Try again shortly."),
    504: ("llm_timeout", "Gemma took too long to answer (Google's deadline expired)."),
}


class LLMError(Exception):
    """A Gemma failure turned into a short, user-friendly message."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def key_present() -> bool:
    return bool(os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"))


@lru_cache(maxsize=4)
def get_llm(temperature: float):
    """Create the Gemma client once per temperature and reuse it."""
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=settings.gemma_model,
        temperature=temperature,
        thinking_level=THINKING_LEVEL,     # see the measurements at the top of this file
        max_output_tokens=MAX_OUTPUT_TOKENS,
        max_retries=1,                    # our own retry below decides what to retry
        timeout=settings.llm_timeout_s,
    )


def status_code(exc: BaseException) -> int | None:
    """Find the HTTP status code in an exception or in the exceptions it wraps."""
    seen = 0
    while exc is not None and seen < 5:
        code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
        if isinstance(code, int):
            return code
        exc = exc.__cause__ or exc.__context__
        seen += 1
    return None


def to_text(message) -> str:
    """Plain text from a model reply. Gemma may return a list of blocks
    (thinking + text); `.text` keeps only the visible text."""
    text = getattr(message, "text", message)
    return (text if isinstance(text, str) else str(text)).strip()


def invoke_with_retry(runnable, inputs: dict, wait_min: float = 2, wait_max: float = 10):
    """Run a LangChain runnable, retrying only temporary failures."""
    retrying = Retrying(
        retry=retry_if_exception(lambda e: status_code(e) in RETRYABLE),
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=wait_min, max=wait_max),
        reraise=True,
    )
    try:
        return retrying(runnable.invoke, inputs)
    except Exception as e:
        code = status_code(e)
        if code in FRIENDLY:
            short, message = FRIENDLY[code]
            raise LLMError(short, message.format(model=settings.gemma_model)) from e
        if "timeout" in type(e).__name__.lower() or "timed out" in str(e).lower():
            raise LLMError("llm_timeout", "Gemma took too long to answer.") from e
        raise LLMError("llm_error", f"Gemma request failed ({type(e).__name__}).") from e