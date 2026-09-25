"""Run with:  pytest -q   (no model, no API key, no internet needed)"""

import io

import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

from adastra.classify import check_uncertain
from adastra.config import settings
from main import app

client = TestClient(app)


def image_bytes(fmt="PNG", mode="RGB", size=(64, 64), color=(10, 20, 30)) -> bytes:
    buf = io.BytesIO()
    Image.new(mode, size, color).save(buf, format=fmt)
    return buf.getvalue()


def post(data: bytes, name="x.png", level="beginner"):
    return client.post("/api/classify", files={"file": (name, data)}, data={"level": level})


def test_health(monkeypatch, tmp_path):
    # Point at empty folders so this test is reliable regardless of whether
    # real model artifacts happen to be present on this machine.
    import dataclasses

    import adastra.classify as classify_mod
    import adastra.morphology as morphology_mod
    import main as main_mod

    test_settings = dataclasses.replace(
        settings, classifier_dir=tmp_path / "no-classifier", galaxy_morphology_dir=tmp_path / "no-morphology"
    )
    monkeypatch.setattr(classify_mod, "settings", test_settings)
    monkeypatch.setattr(morphology_mod, "settings", test_settings)
    monkeypatch.setattr(main_mod, "settings", test_settings)
    monkeypatch.setattr(classify_mod, "_model", None)
    monkeypatch.setattr(morphology_mod, "_model", None)

    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert len(body["classes"]) == 5
    assert body["slots"]["classifier"]["status"] == "missing"
    assert body["slots"]["galaxy_morphology"]["status"] == "missing"


def test_classify_png_returns_demo_result():
    r = post(image_bytes())
    assert r.status_code == 200
    body = r.json()
    assert body["mode"] == "demo"
    probs = [p["probability"] for p in body["classification"]["probabilities"]]
    assert len(probs) == 5
    assert abs(sum(probs) - 1) < 1e-3
    assert probs == sorted(probs, reverse=True)
    assert len(body["classification"]["top_k"]) == 3
    assert body["warnings"]


def test_same_image_same_output():
    data = image_bytes(color=(200, 100, 50))
    a, b = post(data).json(), post(data).json()
    assert a["classification"] == b["classification"]


def test_levels():
    for level in ("beginner", "intermediate", "advanced"):
        r = post(image_bytes(), level=level)
        assert r.json()["explanation"]["level"] == level
    assert post(image_bytes(), level="expert").status_code == 422


def test_formats_and_modes():
    assert post(image_bytes("JPEG"), "a.jpg").status_code == 200
    assert post(image_bytes("WEBP"), "a.webp").status_code == 200
    assert post(image_bytes("PNG", "RGBA", color=(1, 2, 3, 4))).status_code == 200


def test_16bit_tiff_is_stretched():
    arr = np.linspace(0, 65535, 64 * 64, dtype=np.uint16).reshape(64, 64)
    buf = io.BytesIO()
    Image.fromarray(arr, mode="I;16").save(buf, format="TIFF")
    r = post(buf.getvalue(), "a.tif")
    assert r.status_code == 200


def test_bad_inputs():
    r = post(b"", "empty.png")
    assert r.status_code == 400 and r.json()["error"]["code"] == "empty_file"
    r = post(b"hello, not an image", "a.png")
    assert r.status_code == 400 and r.json()["error"]["code"] == "not_an_image"
    r = post(image_bytes("GIF"), "a.gif")
    assert r.status_code == 400 and r.json()["error"]["code"] == "unsupported_format"
    r = post(b"0" * (settings.max_upload_bytes + 10), "big.png")
    assert r.status_code == 413


def test_uncertainty_rules():
    assert check_uncertain(0.90, 0.05) == (False, None)
    assert check_uncertain(0.40, 0.10)[0] is True  # low confidence
    assert check_uncertain(0.60, 0.50)[0] is True  # too close to runner-up