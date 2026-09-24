"""Runs before every test, so tests behave the same on every computer,
whatever backend/.env contains:
  - hides the Google API key, so tests never call the real Gemma
  - switches accounts and the database OFF (tests that need them turn them
    on themselves, with a fake database and test passes)
"""

import dataclasses

import pytest

from adastra import auth, db
from adastra.config import settings


@pytest.fixture(autouse=True)
def isolated(monkeypatch):
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    offline = dataclasses.replace(settings, firebase_project_id="", mongodb_uri="")
    monkeypatch.setattr(auth, "settings", offline)
    monkeypatch.setattr(db, "settings", offline)