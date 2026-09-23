"""Step 4 tests with a FAKE Gemma, so they run offline and use no quota."""

from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableLambda

from adastra.rag import explain_chain, store
from adastra.rag.citations import check_citations
from adastra.rag.llm import LLMError, invoke_with_retry, to_text
from adastra.rag.store import Chunk
from adastra.schemas import Classification, ClassProbability, ModelInfo
from tests.test_knowledge import fake_embed

# One-word passages so the fake embedder matches them clearly.
CHUNKS = [
    Chunk("wikipedia:Nebula", "wikipedia", "Nebula", "nebula"),
    Chunk("wikipedia:Galaxy", "wikipedia", "Galaxy", "galaxy"),
    Chunk("wikipedia:Moon", "wikipedia", "Moon", "moon"),
]


def make_classification(uncertain=False) -> Classification:
    ranked = [ClassProbability(label="Nebula", probability=0.5),
              ClassProbability(label="Galaxy", probability=0.4),
              ClassProbability(label="Moon", probability=0.1)]
    return Classification(
        predicted_class="Nebula", confidence=0.5, probabilities=ranked, top_k=ranked,
        uncertain=uncertain, uncertainty_reason="close call" if uncertain else None,
        model=ModelInfo(architecture="test", weights_loaded=False, classes=["Nebula", "Galaxy", "Moon"]),
    )


def make_kb(tmp_path):
    store.save(tmp_path, fake_embed([c.text for c in CHUNKS]), CHUNKS)
    return store.KnowledgeBase(tmp_path, embed_fn=fake_embed)


class HttpError(Exception):
    def __init__(self, code):
        super().__init__(f"HTTP {code}")
        self.code = code


def test_live_explanation_with_citations(tmp_path):
    llm = FakeListChatModel(responses=["A **nebula** is a cloud of gas and dust [1]. Invented fact [9]."])
    exp, sources, warnings = explain_chain.explain(make_classification(), "beginner", kb=make_kb(tmp_path), llm=llm)
    assert exp.mode == "live"
    assert exp.cited_ids == [1]
    assert "[9]" not in exp.text                     # invented citation removed
    assert sources[0].id == 1 and sources[0].title == "Nebula"
    assert any("9" in w for w in warnings)


def test_prompt_contains_passages_rules_and_runner_up(tmp_path):
    seen = {}

    def spy(prompt_value):
        seen["prompt"] = prompt_value.to_string()
        return AIMessage(content="ok [1]")

    explain_chain.explain(make_classification(uncertain=True), "advanced",
                          kb=make_kb(tmp_path), llm=RunnableLambda(spy))
    p = seen["prompt"]
    assert "[1] (" in p and "(Nebula)" in p           # numbered passages reached Gemma
    assert "(Galaxy)" in p                            # runner-up was searched too
    assert "Use ONLY facts" in p
    assert "UNSURE" in p and "Galaxy" in p            # runner-up mentioned
    assert "astronomy student" in p                   # advanced level


def test_no_key_means_placeholder_and_no_call(tmp_path):
    exp, sources, warnings = explain_chain.explain(make_classification(), "beginner", kb=make_kb(tmp_path))
    assert exp.mode == "demo"
    assert sources[0].title == "placeholder-source-1"
    assert "GOOGLE_API_KEY" in warnings[0]


def test_no_index_means_placeholder_even_with_llm(monkeypatch):
    monkeypatch.setattr(explain_chain, "get_knowledge_base", lambda: None)
    llm = FakeListChatModel(responses=["should never be used"])
    exp, _, warnings = explain_chain.explain(make_classification(), "beginner", llm=llm)
    assert exp.mode == "demo" and "knowledge index" in warnings[0]


def test_retry_only_on_429():
    calls = []

    def flaky(_):
        calls.append(1)
        if len(calls) < 3:
            raise HttpError(429)
        return "done"

    assert invoke_with_retry(RunnableLambda(flaky), {}, wait_min=0, wait_max=0) == "done"
    assert len(calls) == 3


def test_auth_error_fails_fast():
    calls = []

    def bad_key(_):
        calls.append(1)
        raise HttpError(401)

    try:
        invoke_with_retry(RunnableLambda(bad_key), {}, wait_min=0, wait_max=0)
    except LLMError as e:
        assert e.code == "llm_auth_error"
    assert len(calls) == 1                            # no retry


def test_gemma_failure_becomes_placeholder(tmp_path):
    def broken(_):
        raise HttpError(404)

    exp, _, warnings = explain_chain.explain(make_classification(), "beginner",
                                             kb=make_kb(tmp_path), llm=RunnableLambda(broken))
    assert exp.mode == "demo" and "not found" in warnings[0]


def test_to_text_strips_thinking():
    msg = AIMessage(content=[{"type": "thinking", "thinking": "hmm"}, {"type": "text", "text": "Answer."}])
    assert to_text(msg) == "Answer."


def test_citation_cleanup():
    text, cited, invalid = check_citations("A [1, 3]. B [2]. C [7].", 4)
    assert text == "A [1][3]. B [2]. C."
    assert cited == [1, 2, 3] and invalid == [7]


def test_explain_endpoint():
    from fastapi.testclient import TestClient

    from main import app

    body = {"classification": make_classification().model_dump(), "level": "intermediate"}
    r = TestClient(app).post("/api/explain", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["explanation"]["level"] == "intermediate"
    assert data["explanation"]["mode"] == "demo"      # no key during tests