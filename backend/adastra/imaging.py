"""Pipeline steps 2-3: validate the upload and turn it into model input."""

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
    """Bad input. `status` becomes the HTTP status code (400 or 413)."""

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
    """16-bit / float images (common in astronomy) -> 8-bit.

    Maps the 0.5th-99.5th percentile brightness range onto 0-255, so a few
    very bright stars don't make the rest of the image black.
    """
    arr = np.asarray(img, dtype=np.float64)
    lo, hi = np.percentile(arr, [0.5, 99.5])
    if hi <= lo:  # flat image: avoid dividing by zero
        hi = lo + 1.0
    arr = np.clip((arr - lo) / (hi - lo), 0.0, 1.0) * 255.0
    return Image.fromarray(arr.astype(np.uint8), mode="L")


def load_image(data: bytes) -> LoadedImage:
    """Check the upload and return an RGB image plus its fingerprint."""
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
        img.load()  # actually decode it, so broken files fail here
    except Image.DecompressionBombError:
        raise ImageError("image_too_large", "The image has too many pixels.")
    except (UnidentifiedImageError, OSError):
        raise ImageError("not_an_image", "The file is not a readable image.")

    if fmt not in ALLOWED_FORMATS:
        raise ImageError(
            "unsupported_format",
            f"{fmt or 'This'} format is not supported. Use PNG, JPEG, WebP or TIFF.",
        )

    img = ImageOps.exif_transpose(img)  # fix sideways phone photos
    if img.mode in ("I;16", "I;16B", "I;16L", "I", "F"):
        img = _stretch_to_8bit(img)
    img = img.convert("RGB")  # also handles transparency and greyscale

    return LoadedImage(image=img, sha256=hashlib.sha256(data).hexdigest(), format=fmt)


def to_model_input(img: Image.Image, size: int | None = None) -> np.ndarray:
    """RGB image -> float32 array of shape (1, 3, size, size), normalised.

    IMPORTANT: this must match the *evaluation* transform in your training
    code exactly (resize vs resize+crop, interpolation, mean/std). It is a
    placeholder until that code arrives.
    """
    size = size or settings.input_size
    resized = img.resize((size, size), Image.Resampling.BILINEAR)
    arr = np.asarray(resized, dtype=np.float32) / 255.0  # (H, W, C), values 0..1
    arr = (arr - MEAN) / STD
    return arr.transpose(2, 0, 1)[np.newaxis, ...]  # -> (1, C, H, W)