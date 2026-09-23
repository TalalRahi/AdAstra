"""Request/response shapes. The frontend's types.ts mirrors these."""

from typing import Literal

from pydantic import BaseModel, Field

Level = Literal["beginner", "intermediate", "advanced"]
Mode = Literal["live", "demo"]


class ClassProbability(BaseModel):
    label: str
    probability: float


class ModelInfo(BaseModel):
    architecture: str
    weights_loaded: bool
    classes: list[str]


class Classification(BaseModel):
    predicted_class: str
    confidence: float
    probabilities: list[ClassProbability]  # all classes, highest first
    top_k: list[ClassProbability]
    uncertain: bool
    uncertainty_reason: str | None
    model: ModelInfo


class Source(BaseModel):
    id: int  # 1-based, matches [n] in the explanation text
    title: str
    kind: Literal["paper", "book", "wikipedia", "other"]
    page: int | None = None
    url: str | None = None
    snippet: str


class Explanation(BaseModel):
    level: Level
    text: str
    cited_ids: list[int]
    mode: Mode


class ImageInfo(BaseModel):
    width: int
    height: int
    format: str
    sha256: str


class ClassifyResponse(BaseModel):
    mode: Mode
    request_id: str
    image: ImageInfo
    classification: Classification
    explanation: Explanation
    sources: list[Source]
    timings_ms: dict[str, float]
    warnings: list[str]


class SlotStatus(BaseModel):
    status: Literal["live", "missing"]
    detail: str


class HealthResponse(BaseModel):
    ok: bool
    version: str
    demo_mode: str
    classes: list[str]
    slots: dict[str, SlotStatus]


class ExplainRequest(BaseModel):
    """Re-explain an earlier result at another level, without re-uploading the image."""

    classification: Classification
    level: Level


class ExplainResponse(BaseModel):
    explanation: Explanation
    sources: list[Source]
    warnings: list[str]


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    """A question for the astronomy assistant (the "Ask" page)."""

    question: str = Field(min_length=3, max_length=1000)
    k: int = Field(default=4, ge=1, le=10)          # how many passages to retrieve
    history: list[ChatTurn] = Field(default_factory=list, max_length=8)
    analysis_context: Classification | None = None  # "ask about my last result"


class ChatAnswer(BaseModel):
    text: str
    cited_ids: list[int]
    mode: Mode


class ChatResponse(BaseModel):
    answer: ChatAnswer
    sources: list[Source]
    warnings: list[str]
    latency_ms: float