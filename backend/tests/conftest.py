"""Runs before every test. Hides the Google API key so tests never call the
real Gemma (no internet, no quota used). Tests that need Gemma use a fake one."""

import pytest


@pytest.fixture(autouse=True)
def no_real_gemma(monkeypatch):
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)