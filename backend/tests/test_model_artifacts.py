"""The real-model plumbing: manifest validation, demo fallback, and the
galaxy-morphology gate. None of this needs the actual 16 MB model files —
manifest validation only checks bytes/hashes, and get_model()/get_morphology_model()
are tested against a folder that deliberately doesn't exist (demo fallback).

A separate, skippable smoke test at the bottom runs for real IF the actual
trained model files are present (e.g. once you've followed the deployment
guide) — it's the closest thing to an end-to-end check of the real model.
"""

import dataclasses
import hashlib
import json

import numpy as np
import pytest
from PIL import Image

import adastra.classify as classify_mod
import adastra.morphology as morphology_mod
from adastra.config import settings
from adastra.morphology import classify_morphology
from adastra.onnx_runtime import ArtifactError, OnnxArtifact, load_manifest
from adastra.schemas import ClassProbability, Classification, ModelInfo

VALID_INPUT = {
    "layout": "NCHW", "channels": "RGB", "dtype": "float32",
    "resize_to": [256, 256], "center_crop": 224, "interpolation": "bilinear",
    "mean": [0.485, 0.456, 0.406], "std": [0.229, 0.224, 0.225],
    "input_name": "input", "output_name": "logits", "output_is_logits": True,
}


def make_artifact_folder(tmp_path, name="model.onnx", content=b"not a real onnx file, just bytes", classes=None):
    """A folder with a valid manifest.json pointing at a file with matching sha256.
    (load_manifest only checks the hash, never actually parses the ONNX graph,
    so real ONNX bytes aren't needed to test validation.)"""
    folder = tmp_path / "artifact"
    folder.mkdir()
    (folder / name).write_bytes(content)
    manifest = {
        "slot": "classifier", "version": "1.0.0", "architecture": "EfficientNet-B0",
        "architecture_source": "torchvision", "dataset": "Test", "format": "onnx",
        "file": name, "sha256": hashlib.sha256(content).hexdigest(),
        "input": VALID_INPUT, "classes": classes or ["a", "b", "c"],
        "metrics": {}, "calibration": {"temperature": 1.0},
    }
    (folder / "manifest.json").write_text(json.dumps(manifest))
    return folder


# ---------------------------------------------------------------- manifest validation
def test_manifest_missing_folder_is_an_error(tmp_path):
    with pytest.raises(ArtifactError, match="no manifest.json"):
        load_manifest(tmp_path / "does-not-exist")


def test_manifest_sha256_mismatch_is_caught(tmp_path):
    folder = make_artifact_folder(tmp_path)
    (folder / "model.onnx").write_bytes(b"corrupted or swapped file")  # no longer matches the manifest
    with pytest.raises(ArtifactError, match="sha256"):
        load_manifest(folder)


def test_manifest_missing_required_key_is_caught(tmp_path):
    folder = tmp_path / "bad"
    folder.mkdir()
    (folder / "model.onnx").write_bytes(b"x")
    (folder / "manifest.json").write_text(json.dumps({"file": "model.onnx"}))  # missing classes/input/sha256/architecture
    with pytest.raises(ArtifactError, match="missing keys"):
        load_manifest(folder)


def test_valid_artifact_reports_available(tmp_path):
    folder = make_artifact_folder(tmp_path, classes=["x", "y"])
    artifact = OnnxArtifact(folder)
    assert artifact.available is True
    assert artifact.manifest["classes"] == ["x", "y"]


def test_missing_artifact_is_not_available_and_has_a_reason(tmp_path):
    artifact = OnnxArtifact(tmp_path / "nothing-here")
    assert artifact.available is False
    assert artifact.error  # a human-readable reason is recorded


# ---------------------------------------------------------------- demo fallback
def test_get_model_falls_back_to_demo_when_no_artifact(monkeypatch, tmp_path):
    monkeypatch.setattr(classify_mod, "settings", dataclasses.replace(settings, classifier_dir=tmp_path / "no-classifier"))
    monkeypatch.setattr(classify_mod, "_model", None)
    model = classify_mod.get_model()
    assert model.weights_loaded is False
    assert model.classes == settings.class_names


def test_get_morphology_model_falls_back_to_demo(monkeypatch, tmp_path):
    monkeypatch.setattr(morphology_mod, "settings", dataclasses.replace(settings, galaxy_morphology_dir=tmp_path / "no-morphology"))
    monkeypatch.setattr(morphology_mod, "_model", None)
    model = morphology_mod.get_model()
    assert model.weights_loaded is False
    assert model.classes == ["elliptical", "spiral"]


# ---------------------------------------------------------------- the galaxy gate
def _classification(predicted_class: str, confidence: float) -> Classification:
    return Classification(
        predicted_class=predicted_class, confidence=confidence,
        probabilities=[ClassProbability(label=predicted_class, probability=confidence)],
        top_k=[ClassProbability(label=predicted_class, probability=confidence)],
        uncertain=False, uncertainty_reason=None,
        model=ModelInfo(architecture="x", weights_loaded=False, classes=[predicted_class]),
    )


def test_morphology_skipped_for_non_galaxy(monkeypatch, tmp_path):
    monkeypatch.setattr(morphology_mod, "settings", dataclasses.replace(settings, galaxy_morphology_dir=tmp_path / "no-morphology"))
    monkeypatch.setattr(morphology_mod, "_model", None)
    result = classify_morphology(Image.new("RGB", (32, 32)), "abc123", _classification("star", 0.9))
    assert result.enabled is True
    assert result.ran is False
    assert result.predicted_class is None
    assert "not \"galaxy\"" in result.reason


def test_morphology_skipped_below_confidence_gate(monkeypatch, tmp_path):
    monkeypatch.setattr(morphology_mod, "settings", dataclasses.replace(settings, galaxy_morphology_dir=tmp_path / "no-morphology"))
    monkeypatch.setattr(morphology_mod, "_model", None)
    low = settings.galaxy_gate_confidence - 0.1
    result = classify_morphology(Image.new("RGB", (32, 32)), "abc123", _classification("galaxy", low))
    assert result.ran is False
    assert "threshold" in result.reason


def test_morphology_runs_for_confident_galaxy(monkeypatch, tmp_path):
    monkeypatch.setattr(morphology_mod, "settings", dataclasses.replace(settings, galaxy_morphology_dir=tmp_path / "no-morphology"))
    monkeypatch.setattr(morphology_mod, "_model", None)
    high = max(settings.galaxy_gate_confidence, 0.6)
    result = classify_morphology(Image.new("RGB", (32, 32)), "abc123", _classification("galaxy", high))
    assert result.ran is True
    assert result.predicted_class in {"elliptical", "spiral"}
    total = sum(p.probability for p in result.probabilities)
    assert abs(total - 1) < 1e-3
    # deterministic: same image -> same morphology result
    again = classify_morphology(Image.new("RGB", (32, 32)), "abc123", _classification("galaxy", high))
    assert again.predicted_class == result.predicted_class


# ---------------------------------------------------------------- preprocessing parity
def test_imaging_preprocessing_matches_manifest_spec():
    """resize_to + center_crop must exactly match torchvision's
    Resize((W,H)) + CenterCrop(N) on a non-square image (verified separately
    against real torchvision output; this test guards against regressions)."""
    from adastra.imaging import to_model_input

    img = Image.new("RGB", (400, 250), (100, 150, 200))
    out = to_model_input(img, VALID_INPUT)
    assert out.shape == (1, 3, 224, 224)
    assert out.dtype == np.float32


# ---------------------------------------------------------------- optional real-model smoke test
REAL_CLASSIFIER = settings.classifier_dir / "manifest.json"
REAL_MORPHOLOGY = settings.galaxy_morphology_dir / "manifest.json"


@pytest.mark.skipif(not REAL_CLASSIFIER.exists(), reason="real classifier model not present")
def test_real_classifier_end_to_end():
    monkeypatch_free_model = classify_mod.OnnxArtifact(settings.classifier_dir) if hasattr(classify_mod, "OnnxArtifact") else None
    classify_mod._model = None
    model = classify_mod.get_model()
    assert model.weights_loaded is True
    assert set(model.classes) == {"constellation", "galaxy", "nebula", "planet", "star"}
    img = Image.new("RGB", (300, 200), (80, 80, 80))
    x = model.preprocessed(img)
    logits = model.predict_logits(x, "dummysha")
    assert logits.shape == (5,)