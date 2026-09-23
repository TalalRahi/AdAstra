"""Step 5-8 of the pipeline: retrieve passages and let Gemma explain the result.

The LangChain "chain" (LCEL) runs, in order:

    query ──► retriever ──► numbered passages ──► prompt ──► Gemma ──► plain text

Gemma is told to use ONLY the numbered passages and to cite them as [n].
If there is no index or no API key, Gemma is not called at all and a clearly
labelled placeholder is returned instead (never a real-looking fake).
"""

from operator import itemgetter

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableLambda, RunnablePassthrough

from .. import demo
from ..config import settings
from ..schemas import Classification, Explanation, Level, Source
from .citations import check_citations, format_numbered, to_sources
from .llm import LLMError, get_llm, invoke_with_retry, key_present, to_text
from .retriever import KnowledgeRetriever, get_knowledge_base

LEVELS = {
    "beginner": ("a beginner with no astronomy background",
                 "No jargon. Use one everyday analogy. Two short paragraphs."),
    "intermediate": ("a reader with some science background",
                     "Define each technical term the first time you use it. Three short paragraphs."),
    "advanced": ("an astronomy student",
                 "Be technical: physical processes, quantities and observational methods, "
                 "where the passages give them. At most four paragraphs."),
}

# Everything goes in one user message: some Gemma versions reject a separate system message.
PROMPT = ChatPromptTemplate.from_messages([("human", """You are the astronomy tutor inside AdAstra, a thesis project.
An image classifier has analysed a user's image. Explain the result for {audience}.

CLASSIFIER RESULT
- Predicted class: {predicted_class}
- Confidence: {confidence}
- {uncertainty}

NUMBERED PASSAGES (your only source of facts)
{passages}

RULES
1. Use ONLY facts stated in the passages above. Do not add anything from your own knowledge.
2. After every sentence that uses a passage, put its number in square brackets, like [2]. Only use numbers listed above.
3. If the passages do not cover something, say so plainly instead of guessing.
4. Statements about the classifier result itself (the class, the confidence) need no citation. In one sentence, say what the confidence means: how sure the classifier is, not a guarantee.
5. You have not seen the image; you only know the classifier result. Do not describe the image.
6. Style: {style}
7. Write plain paragraphs separated by one blank line. You may put the class name in **bold**. No headings, no bullet lists.""")])


def build_query(c: Classification) -> str:
    """What to search the knowledge base for: the class (and the runner-up if unsure)."""
    parts = [c.predicted_class]
    if c.uncertain and len(c.top_k) > 1:
        parts.append(c.top_k[1].label)
    return " and ".join(dict.fromkeys(parts))  # removes duplicates, keeps order


def uncertainty_line(c: Classification) -> str:
    if c.uncertain and len(c.top_k) > 1:
        r = c.top_k[1]
        return (f"The classifier is UNSURE; the runner-up is {r.label} ({r.probability:.0%}). "
                f"Say clearly that the result is uncertain and also briefly explain {r.label}.")
    return "The classifier is fairly confident; do not discuss other classes."


def build_chain(retriever, llm):
    """The LCEL chain. Each .assign adds one key to the dict flowing through."""
    return (
        RunnablePassthrough.assign(docs=itemgetter("query") | retriever)
        .assign(passages=RunnableLambda(lambda x: format_numbered(x["docs"])))
        .assign(answer=PROMPT | llm | RunnableLambda(to_text))
    )


def explain(c: Classification, level: Level, kb=None, llm=None) -> tuple[Explanation, list[Source], list[str]]:
    """Return (explanation, sources, warnings). Never raises for Gemma problems."""
    if llm is None and not key_present():
        exp, sources = demo.explanation(c, level)
        return exp, sources, ["GOOGLE_API_KEY is not set; explanation is placeholder text."]
    kb = kb or get_knowledge_base()
    if kb is None:
        # Never let Gemma write a "real" explanation from placeholder passages.
        exp, sources = demo.explanation(c, level)
        return exp, sources, ["No knowledge index found; explanation is placeholder text. "
                              "Build it with: python -m scripts.ingest --wikipedia"]

    llm = llm or get_llm(settings.llm_temperature_explain)
    audience, style = LEVELS[level]
    inputs = {
        "query": build_query(c),
        "audience": audience,
        "style": style,
        "predicted_class": c.predicted_class,
        "confidence": f"{c.confidence:.0%}",
        "uncertainty": uncertainty_line(c),
    }
    try:
        result = invoke_with_retry(build_chain(KnowledgeRetriever(kb=kb), llm), inputs)
    except LLMError as e:
        exp, sources = demo.explanation(c, level)
        return exp, sources, [f"{e.message} Showing placeholder text instead."]

    warnings = []
    docs = result["docs"]
    if not docs:
        warnings.append("No passage in the knowledge base matched this class closely enough.")
    text, cited, invalid = check_citations(result["answer"], len(docs))
    if invalid:
        warnings.append(f"Removed citation numbers that matched no source: {invalid}.")
    if docs and not cited:
        warnings.append("Gemma did not cite any source in this explanation.")

    explanation = Explanation(level=level, text=text, cited_ids=cited, mode="live")
    return explanation, to_sources(docs), warnings