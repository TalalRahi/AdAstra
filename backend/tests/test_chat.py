"""Step 5 tests: the chat, with a FAKE Gemma (offline, no quota)."""

from fastapi.testclient import TestClient
from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableLambda

from adastra.rag import chat_chain
from adastra.schemas import ChatTurn
from main import app
from tests.test_explain import make_classification, make_kb


def test_answer_with_citations(tmp_path):
    llm = FakeListChatModel(responses=["A nebula is a cloud [1]. Made up [5]."])
    ans, sources, warnings = chat_chain.answer("tell me about nebula", kb=make_kb(tmp_path), llm=llm)
    assert ans.mode == "live"
    assert ans.cited_ids == [1] and "[5]" not in ans.text   # invented citation removed
    assert sources[0].title == "Nebula"
    assert any("5" in w for w in warnings)


def test_history_and_context_reach_the_prompt(tmp_path):
    seen = {}

    def spy(prompt_value):
        seen["prompt"] = prompt_value.to_string()
        return AIMessage(content="ok [1]")

    history = [ChatTurn(role="user", content="Tell me about galaxy"),
               ChatTurn(role="assistant", content="Galaxies are big.")]
    chat_chain.answer("How big are they?", history=history, context=make_classification(),
                      kb=make_kb(tmp_path), llm=RunnableLambda(spy))
    p = seen["prompt"]
    assert "User: Tell me about galaxy" in p                 # conversation included
    assert "the classifier said Nebula" in p                  # image result included
    assert "How big are they?" in p
    assert "(Galaxy)" in p                                    # follow-up still found the topic


def test_k_controls_number_of_passages(tmp_path):
    llm = FakeListChatModel(responses=["x [1]"])
    kb = make_kb(tmp_path)
    _, sources, _ = chat_chain.answer("nebula galaxy moon", k=2, kb=kb, llm=llm)
    assert len(sources) <= 2


def test_no_key_gives_placeholder(tmp_path):
    ans, sources, warnings = chat_chain.answer("What is a star?", kb=make_kb(tmp_path))
    assert ans.mode == "demo" and sources == [] and "GOOGLE_API_KEY" in warnings[0]


def test_endpoint_answers_and_validates():
    client = TestClient(app)
    r = client.post("/api/rag-query", json={"question": "What is a star?"})
    assert r.status_code == 200
    body = r.json()
    assert body["answer"]["mode"] == "demo"                   # no key during tests
    assert "latency_ms" in body
    assert client.post("/api/rag-query", json={"question": "hi"}).status_code == 422   # too short
    assert client.post("/api/rag-query", json={"question": "What?", "k": 50}).status_code == 422