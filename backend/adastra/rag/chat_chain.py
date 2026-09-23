"""The "Ask" page: answer free-form astronomy questions from the knowledge base.

Same chain shape as the explanation (Step 4), different prompt:

    question ──► retriever ──► numbered passages ──► prompt ──► Gemma ──► plain text

Earlier turns of the conversation are shown to Gemma only so it understands
follow-up questions like "how big are they?". They are NOT a source of facts.
"""

from operator import itemgetter

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnablePassthrough

from ..config import settings
from ..schemas import ChatAnswer, ChatTurn, Classification, Source
from .citations import check_citations, format_numbered, to_sources
from .llm import LLMError, get_llm, invoke_with_retry, key_present, to_text
from .retriever import KnowledgeRetriever, get_knowledge_base

PROMPT = ChatPromptTemplate.from_messages([("human", """You are the astronomy assistant inside AdAstra, a thesis project.
Answer the user's question using the numbered passages from a curated knowledge base.
{context}
CONVERSATION SO FAR (only to understand what the question refers to; not a source of facts)
{history}

QUESTION
{question}

NUMBERED PASSAGES (your only source of facts)
{passages}

RULES
1. Use ONLY facts stated in the passages above. Do not add anything from your own knowledge.
2. After every sentence that uses a passage, put its number in square brackets, like [2]. Only use numbers listed above.
3. If the passages do not answer the question, say that the knowledge base does not cover it. Do not guess.
4. If two passages disagree, say so and cite both.
5. Be concise: at most three short paragraphs. Plain paragraphs separated by one blank line; **bold** is allowed; no headings, no bullet lists.""")])


def format_history(history: list[ChatTurn]) -> str:
    if not history:
        return "(This is the first question.)"
    return "\n".join(f"{'User' if t.role == 'user' else 'Assistant'}: {t.content[:600]}" for t in history)


def format_context(c: Classification | None) -> str:
    if c is None:
        return ""
    return (f"\nThe user analysed an image; the classifier said {c.predicted_class} "
            f"({c.confidence:.0%}{', uncertain' if c.uncertain else ''}). "
            f"The question may be about that result.\n")


def build_query(question: str, history: list[ChatTurn], c: Classification | None) -> str:
    """Search text: the question, plus the previous question and the analysed
    class, so follow-ups like "how hot are they?" still find the right passages."""
    parts = []
    if c is not None:
        parts.append(c.predicted_class)
    previous = [t.content for t in history if t.role == "user"]
    if previous:
        parts.append(previous[-1])
    parts.append(question)
    return " ".join(parts)


def build_chain(retriever, llm):
    return (
        RunnablePassthrough.assign(docs=itemgetter("query") | retriever)
        .assign(passages=RunnableLambda(lambda x: format_numbered(x["docs"])))
        .assign(answer=PROMPT | llm | RunnableLambda(to_text))
    )


def placeholder(reason: str) -> tuple[ChatAnswer, list[Source], list[str]]:
    text = ("Placeholder answer: the assistant can't answer yet because "
            "the knowledge base or Gemma is not connected.")
    return ChatAnswer(text=text, cited_ids=[], mode="demo"), [], [reason]


def answer(question: str, k: int = 4, history: list[ChatTurn] | None = None,
           context: Classification | None = None, kb=None, llm=None):
    """Return (answer, sources, warnings). Never raises for Gemma problems."""
    history = history or []
    if llm is None and not key_present():
        return placeholder("GOOGLE_API_KEY is not set.")
    kb = kb or get_knowledge_base()
    if kb is None:
        return placeholder("No knowledge index found. Build it with: python -m scripts.ingest --wikipedia")

    llm = llm or get_llm(settings.llm_temperature_chat)
    inputs = {
        "query": build_query(question, history, context),
        "question": question,
        "history": format_history(history),
        "context": format_context(context),
    }
    try:
        result = invoke_with_retry(build_chain(KnowledgeRetriever(kb=kb, k=k), llm), inputs)
    except LLMError as e:
        return placeholder(e.message)

    warnings = []
    docs = result["docs"]
    if not docs:
        warnings.append("No passage in the knowledge base matched this question closely enough.")
    text, cited, invalid = check_citations(result["answer"], len(docs))
    if invalid:
        warnings.append(f"Removed citation numbers that matched no source: {invalid}.")
    return ChatAnswer(text=text, cited_ids=cited, mode="live"), to_sources(docs), warnings