"""Placeholder explanation until the knowledge base and Gemma are connected.

Deliberately obviously fake: no real paper titles, no invented quotes.
"""

from .schemas import Classification, Explanation, Level, Source

_TEMPLATES = {
    "beginner": (
        "This is placeholder text, not a real explanation. The model's top guess is "
        "**{cls}** at {conf:.0%} confidence. Once the knowledge base and Gemma are "
        "connected, this panel will explain the object in plain language with "
        "numbered sources [1]."
    ),
    "intermediate": (
        "Placeholder explanation (intermediate level). Predicted class: **{cls}** "
        "({conf:.0%}). A real answer will define key terms and cite passages from "
        "the curated astronomy knowledge base [1]."
    ),
    "advanced": (
        "Placeholder explanation (advanced level). Predicted class: **{cls}** "
        "({conf:.0%}). A real answer will discuss physical properties and "
        "observational methods, citing retrieved passages [1]."
    ),
}


def explanation(classification: Classification, level: Level) -> tuple[Explanation, list[Source]]:
    text = _TEMPLATES[level].format(
        cls=classification.predicted_class, conf=classification.confidence
    )
    if classification.uncertain:
        runner_up = classification.top_k[1].label
        text += f" The model is unsure; the runner-up is **{runner_up}**."

    sources = [
        Source(
            id=1,
            title="placeholder-source-1",
            kind="other",
            snippet="Placeholder passage. Real passages come from the knowledge base.",
        )
    ]
    return Explanation(level=level, text=text, cited_ids=[1], mode="demo"), sources