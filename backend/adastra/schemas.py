"""Request/response shapes. The frontend's src/lib/types.ts mirrors these."""

from datetime import datetime
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


class GalaxyMorphology(BaseModel):
    """The conditional second stage: only runs when the main classifier's top
    prediction is "galaxy". `enabled=false` means the module or model isn't
    switched on at all; `enabled=true, predicted_class=None` means it was on
    but didn't run for THIS image (not a galaxy, or confidence too low)."""

    enabled: bool
    ran: bool = False
    predicted_class: str | None = None
    confidence: float | None = None
    probabilities: list[ClassProbability] | None = None
    model: ModelInfo | None = None
    reason: str | None = None  # why it didn't run, when ran=false


class ClassifyResponse(BaseModel):
    mode: Mode
    request_id: str
    image: ImageInfo
    classification: Classification
    galaxy_morphology: GalaxyMorphology
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
    galaxy_morphology: GalaxyMorphology | None = None
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


# ---------------------------------------------------------------- accounts
class EmailUpdates(BaseModel):
    opted_in: bool
    updated_at: datetime  # when the user made this choice


class Profile(BaseModel):
    uid: str
    email: str | None
    email_verified: bool
    name: str
    email_updates: EmailUpdates
    created_at: datetime


class ProfileUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email_updates: bool