"""The CLIP gate: what happens when an image is / isn't astronomical.

conftest.py makes the gate pass in every other test; here we swap in a gate
that blocks, and check the rest of the pipeline really stops.
"""

import io

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from adastra import clip as clip_mod
from adastra.config import settings
from adastra.pipeline import labels_agree
from main import app

client = TestClient(app)


def png() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (48, 48), (30, 60, 90)).save(buf, format="PNG")
    return buf.getvalue()


class BlockingClip(clip_mod.DemoClip):
    """Demo CLIP whose gate always fails: [astronomical, non_astronomical]."""

    def gate_logits(self, embedding, image_sha256):
        return np.array([-6.0, 6.0])


def post():
    return client.post("/api/classify", files={"file": ("a.png", png())}, data={"level": "beginner"})


def test_non_astronomical_image_stops_the_pipeline(monkeypatch):
    monkeypatch.setattr(clip_mod, "_model", BlockingClip(settings.class_names))
    r = post()
    assert r.status_code == 200
    body = r.json()
    assert body["classification"] is None
    assert body["galaxy_morphology"] is None
    assert body["explanation"] is None
    assert body["sources"] == []
    assert body["clip"]["likely_astronomical"] is False
    assert body["clip"]["message"]
    assert body["clip"]["agrees_with_classifier"] is None      # the classifier never ran
    assert body["warnings"]


def test_astronomical_image_runs_the_whole_pipeline():
    body = post().json()                                        # conftest.py: the gate passes
    assert body["clip"]["likely_astronomical"] is True
    assert body["classification"] is not None
    assert body["explanation"] is not None
    assert body["clip"]["agrees_with_classifier"] in (True, False)


def test_gate_fields_are_present_and_sane():
    clip = post().json()["clip"]
    assert 0.0 <= clip["astro_score"] <= 1.0
    assert 0.0 <= clip["threshold"] <= 1.0
    assert len(clip["zero_shot_top3"]) == 3
    assert clip["weights_loaded"] is False                      # tests never load the real artifact


def test_labels_agree_ignores_capitals_and_spaces():
    # The CLIP manifest says "Galaxy", the classifier manifest says "galaxy".
    assert labels_agree("Galaxy", "galaxy") is True
    assert labels_agree(" Star ", "star") is True
    assert labels_agree("Nebula", "nebula") is True
    assert labels_agree("Galaxy", "star") is False