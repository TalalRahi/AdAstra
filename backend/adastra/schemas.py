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


class ClipGate(BaseModel):
    """An independent, pretrained-only check, run BEFORE the classifier:
    does this even look like an astronomical image? When
    `likely_astronomical=false`, the pipeline stops here — `classification`,
    `galaxy_morphology` and `explanation` on the response are all `null`,
    and `message` is the reason to show the user instead of a result.

    `weights_loaded=false` means the real CLIP artifact isn't in place yet:
    this block is demo output, not a real judgement about the image.
    """

    weights_loaded: bool
    architecture: str
    astro_score: float           # 0-1: how "astronomical" CLIP thinks this looks
    threshold: float             # astro_score below this -> likely_astronomical=false
    likely_astronomical: bool
    zero_shot_top3: list[ClassProbability]  # CLIP's own opinion, independent of the classifier
    agrees_with_classifier: bool | None = None  # null when classification didn't run
    message: str | None = None   # set when likely_astronomical=false


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
    clip: ClipGate
    # All three are null when clip.likely_astronomical is false — the image
    # failed the astronomical-image check, so nothing downstream ran.
    classification: Classification | None = None
    galaxy_morphology: GalaxyMorphology | None = None
    explanation: Explanation | None = None
    sources: list[Source] = Field(default_factory=list)
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


# ---------------------------------------------------------------- history
class HistoryEntry(BaseModel):
    """One saved analysis. Stored server-side per signed-in user, so it
    follows them to any device or browser — this is what replaced the old
    browser-only localStorage history."""

    id: str
    result: ClassifyResponse
    file_name: str
    thumbnail: str | None
    saved_at: datetime


class HistoryEntryCreate(BaseModel):
    """What the browser sends right after an analysis completes."""

    result: ClassifyResponse
    file_name: str = Field(max_length=255)
    thumbnail: str | None = None


class HistoryListResponse(BaseModel):
    entries: list[HistoryEntry]