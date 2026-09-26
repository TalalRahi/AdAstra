"""All settings in one place.

Every number the pipeline uses comes from here, so in the viva you can point
to exactly where a value is set.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()  # reads backend/.env if it exists

BACKEND_DIR = Path(__file__).resolve().parent.parent  # .../AdAstra/backend
PROJECT_DIR = BACKEND_DIR.parent                        # .../AdAstra

# Used until the real class list arrives with your trained model.
PLACEHOLDER_CLASSES = [
    "placeholder class 1",
    "placeholder class 2",
    "placeholder class 3",
    "placeholder class 4",
    "placeholder class 5",
]


def _list(name: str) -> list[str]:
    """Read a comma-separated environment variable as a list."""
    raw = os.getenv(name, "")
    return [item.strip() for item in raw.split(",") if item.strip()]


def _optional_float(name: str) -> float | None:
    """Read an environment variable as a float, or None if unset/empty."""
    raw = os.getenv(name)
    return float(raw) if raw else None


@dataclass(frozen=True)
class Settings:
    # Which websites may call this API (the React app runs on port 5173).
    cors_origins: list[str] = field(
        default_factory=lambda: _list("CORS_ORIGINS") or ["http://localhost:5173"]
    )
    demo_mode: str = os.getenv("DEMO_MODE", "auto")

    # Your 5 class names, in the model's output order.
    class_names: list[str] = field(
        default_factory=lambda: _list("CLASS_NAMES") or PLACEHOLDER_CLASSES
    )

    # Upload limits. Vercel rejects requests above 4.5 MB, so we cap at 4 MB.
    max_upload_bytes: int = 4_000_000
    max_image_pixels: int = 60_000_000  # protects against "decompression bomb" images

    # Model input size (will come from your training code later).
    input_size: int = 224

    # "Uncertain" if top-1 is low, or top-1 and top-2 are too close.
    min_confidence: float = float(os.getenv("MIN_CONFIDENCE", "0.55"))
    min_margin: float = float(os.getenv("MIN_MARGIN", "0.15"))
    top_k: int = 3

    # Trained model artifacts (Step 2)
    classifier_dir: Path = BACKEND_DIR / "artifacts" / "classifier"
    galaxy_morphology_dir: Path = BACKEND_DIR / "artifacts" / "galaxy_morphology"
    # The morphology model only runs when the main classifier says "galaxy"
    # with at least this much confidence.
    galaxy_eligible_class: str = "galaxy"
    galaxy_gate_confidence: float = float(os.getenv("GALAXY_GATE_CONFIDENCE", "0.5"))

    # CLIP astronomical-image gate + zero-shot second opinion (Step 5).
    # Artifact folder: manifest.json + the exported vision tower + the
    # offline-computed text embeddings .npz (see training/export/export_clip.py).
    clip_dir: Path = BACKEND_DIR / "artifacts" / "clip"
    # If unset, each manifest's own "likely_astronomical_threshold" is used
    # (0.5 as exported). Set this to override without re-exporting anything.
    clip_astro_threshold: float | None = field(default_factory=lambda: _optional_float("CLIP_ASTRO_THRESHOLD"))

    # Knowledge base (Step 3)
    embed_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    knowledge_dir: Path = BACKEND_DIR / "artifacts" / "knowledge"  # index lives here
    # Where the embedding model is downloaded. On Vercel only /tmp is writable,
    # so the deployed backend sets MODEL_CACHE_DIR=/tmp/models.
    model_cache_dir: Path = Path(os.getenv("MODEL_CACHE_DIR", str(BACKEND_DIR / "artifacts" / "models")))
    corpus_dir: Path = PROJECT_DIR / "knowledge" / "corpus"         # your PDFs
    topics_file: Path = PROJECT_DIR / "knowledge" / "wikipedia_topics.txt"
    retrieval_k: int = 4
    min_similarity: float = float(os.getenv("MIN_SIMILARITY", "0.25"))

    # Gemma via Google AI Studio (Step 4). The key itself is read by the library
    # from the GOOGLE_API_KEY environment variable and never stored here.
    gemma_model: str = os.getenv("GEMMA_MODEL", "gemma-4-26b-a4b-it")
    llm_timeout_s: float = float(os.getenv("LLM_TIMEOUT_S", "60"))
    llm_temperature_explain: float = float(os.getenv("LLM_TEMPERATURE_EXPLAIN", "0.3"))
    llm_temperature_chat: float = float(os.getenv("LLM_TEMPERATURE_CHAT", "0.2"))

    # Accounts (Firebase Authentication) and database (MongoDB Atlas).
    # Empty values = feature switched off; the rest of the site still works.
    firebase_project_id: str = os.getenv("FIREBASE_PROJECT_ID", "")
    mongodb_uri: str = os.getenv("MONGODB_URI", "")
    mongodb_db: str = os.getenv("MONGODB_DB", "adastra")

    log_level: str = os.getenv("LOG_LEVEL", "INFO")


settings = Settings()