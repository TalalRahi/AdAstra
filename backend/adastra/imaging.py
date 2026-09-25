"""Step 2-3 of the pipeline: validate the upload and turn it into model input."""

import hashlib
import io
from dataclasses import dataclass

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

from .config import settings

ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP", "TIFF"}

# ImageNet statistics. Placeholder until your training code tells us the real ones.
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


class ImageError(Exception):
    """Bad input. `status` becomes the HTTP status code."""

    def __init__(self, code: str, message: str, status: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


@dataclass
class LoadedImage:
    image: Image.Image  # RGB, 8-bit
    sha256: str
    format: str


def _stretch_to_8bit(img: Image.Image) -> Image.Image:
    """16-bit / float images (common in astronomy TIFFs) → 8-bit.

    A plain conversion would clip almost everything to white or black, so we
    map the 0.5th–99.5th percentile range onto 0–255 instead.
    """
    arr = np.asarray(img, dtype=np.float64)
    lo, hi = np.percentile(arr, [0.5, 99.5])
    if hi <= lo:
        hi = lo + 1.0
    arr = np.clip((arr - lo) / (hi - lo), 0.0, 1.0) * 255.0
    return Image.fromarray(arr.astype(np.uint8), mode="L")


def load_image(data: bytes) -> LoadedImage:
    if not data:
        raise ImageError("empty_file", "The uploaded file is empty.")
    if len(data) > settings.max_upload_bytes:
        raise ImageError(
            "file_too_large",
            f"The image is larger than {settings.max_upload_bytes // 1_000_000} MB.",
            status=413,
        )

    Image.MAX_IMAGE_PIXELS = settings.max_image_pixels
    try:
        img = Image.open(io.BytesIO(data))
        fmt = (img.format or "").upper()
        img.load()
    except Image.DecompressionBombError:
        raise ImageError("image_too_large", "The image has too many pixels.")
    except (UnidentifiedImageError, OSError):
        raise ImageError("not_an_image", "The file is not a readable image.")

    if fmt not in ALLOWED_FORMATS:
        raise ImageError(
            "unsupported_format",
            f"{fmt or 'This'} format is not supported. Use PNG, JPEG, WebP or TIFF.",
        )

    img = ImageOps.exif_transpose(img)
    if img.mode in ("I;16", "I;16B", "I;16L", "I", "F"):
        img = _stretch_to_8bit(img)
    img = img.convert("RGB")  # also handles RGBA, LA, P, L

    return LoadedImage(image=img, sha256=hashlib.sha256(data).hexdigest(), format=fmt)


def to_model_input(img: Image.Image, spec: dict | None = None) -> np.ndarray:
    """RGB image → float32 array shaped (1, 3, H, W), preprocessed to match
    training exactly.

    `spec` is a manifest's "input" block: {"resize_to": [W, H], "center_crop":
    int | None, "mean": [...], "std": [...], "interpolation": "bilinear"}.
    Verified byte-for-byte against the real training transform
    (torchvision `Resize((256,256))` + `CenterCrop(224)`, which is an EXACT
    resize — NOT aspect-ratio-preserving — followed by a centre crop):
    on a random non-square test image the two produce max |diff| = 0.0.

    Without a spec (demo mode, no model loaded yet), falls back to a plain
    resize to settings.input_size with ImageNet stats.
    """
    if spec is None:
        size = settings.input_size
        resized = img.resize((size, size), Image.Resampling.BILINEAR)
        mean, std = MEAN, STD
    else:
        interp = Image.Resampling.BICUBIC if spec.get("interpolation") == "bicubic" else Image.Resampling.BILINEAR
        rw, rh = spec["resize_to"]
        resized = img.resize((rw, rh), interp)
        crop = spec.get("center_crop")
        if crop:
            left = (rw - crop) // 2
            top = (rh - crop) // 2
            resized = resized.crop((left, top, left + crop, top + crop))
        mean = np.array(spec["mean"], dtype=np.float32)
        std = np.array(spec["std"], dtype=np.float32)

    arr = np.asarray(resized, dtype=np.float32) / 255.0  # H, W, C in 0..1
    arr = (arr - mean) / std
    return arr.transpose(2, 0, 1)[np.newaxis, ...].astype(np.float32)  # 1, C, H, W