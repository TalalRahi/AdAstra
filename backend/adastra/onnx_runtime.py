"""Loading a trained model artifact: manifest.json + model.onnx, together.

Both the main classifier and the galaxy-morphology second stage use this same
loader, since they're both "an ONNX model plus a manifest describing it".
Presence = the manifest parses, the file exists, AND its sha256 matches.
"""

import hashlib
import json
import threading
from pathlib import Path

REQUIRED_MANIFEST_KEYS = {"classes", "input", "file", "sha256", "architecture"}


class ArtifactError(Exception):
    """The manifest or the file it describes is invalid — never crashes the
    request; callers catch this and fall back to demo output with a warning."""


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def load_manifest(folder: Path) -> dict:
    """Parse manifest.json and verify the model file it points to. Raises
    ArtifactError with a human-readable reason on any problem."""
    manifest_path = folder / "manifest.json"
    if not manifest_path.exists():
        raise ArtifactError(f"no manifest.json in {folder}")
    try:
        manifest = json.loads(manifest_path.read_text())
    except json.JSONDecodeError as e:
        raise ArtifactError(f"manifest.json is not valid JSON: {e}")

    missing = REQUIRED_MANIFEST_KEYS - manifest.keys()
    if missing:
        raise ArtifactError(f"manifest.json is missing keys: {sorted(missing)}")

    model_path = folder / manifest["file"]
    if not model_path.exists():
        raise ArtifactError(f"{manifest['file']} not found in {folder}")

    actual = _sha256(model_path)
    if actual != manifest["sha256"]:
        raise ArtifactError(
            f"{manifest['file']} does not match the sha256 in manifest.json "
            f"(expected {manifest['sha256'][:12]}…, got {actual[:12]}…) — "
            "the file may be corrupted or out of date."
        )
    return manifest


class OnnxArtifact:
    """One trained model: lazily loads its ONNX session behind a lock, the
    first time it's actually used (not at import time)."""

    def __init__(self, folder: Path):
        self.folder = folder
        self._session = None
        self._lock = threading.Lock()
        self.error: str | None = None
        try:
            self.manifest = load_manifest(folder)
        except ArtifactError as e:
            self.manifest = None
            self.error = str(e)

    @property
    def available(self) -> bool:
        return self.manifest is not None

    def _get_session(self):
        if self._session is None:
            with self._lock:
                if self._session is None:
                    import onnxruntime as ort

                    opts = ort.SessionOptions()
                    opts.intra_op_num_threads = 1
                    self._session = ort.InferenceSession(
                        str(self.folder / self.manifest["file"]),
                        sess_options=opts,
                        providers=["CPUExecutionProvider"],
                    )
        return self._session

    def run(self, model_input):
        """model_input: float32 ndarray shaped (1, 3, H, W) → raw logits, shape (1, num_classes)."""
        spec = self.manifest["input"]
        session = self._get_session()
        return session.run([spec["output_name"]], {spec["input_name"]: model_input})[0]