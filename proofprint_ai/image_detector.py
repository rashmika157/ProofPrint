"""Lightweight image screening heuristics using Pillow."""

import io
from typing import BinaryIO, Union

from PIL import Image, ImageStat

from .models import ImageDetectionResult

ImageInput = Union[bytes, bytearray, BinaryIO]
_AI_METADATA_TERMS = ("stable diffusion", "midjourney", "dall-e", "generative", "comfyui", "automatic1111")
_EDIT_METADATA_TERMS = ("photoshop", "gimp", "paint.net", "edited", "manipulated")


def _open_image(source: ImageInput) -> Image.Image:
    if hasattr(source, "read"):
        return Image.open(source)
    return Image.open(io.BytesIO(source))


def analyze_image(source: ImageInput, filename: str = "") -> ImageDetectionResult:
    """Screen an image for metadata and simple pixel anomalies.

    This intentionally does not claim to identify modern generated images reliably.
    """
    try:
        image = _open_image(source)
        image.load()
    except Exception as exc:
        raise ValueError("The uploaded file is not a supported image.") from exc

    metadata_text = " ".join(str(value) for value in image.info.values()).lower()
    filename_lower = filename.lower()
    signals = []
    ai_score = 0.05
    manipulation_score = 0.03

    ai_metadata_hit = any(term in metadata_text or term in filename_lower for term in _AI_METADATA_TERMS)
    edit_metadata_hit = any(term in metadata_text or term in filename_lower for term in _EDIT_METADATA_TERMS)
    if ai_metadata_hit:
        ai_score += 0.75
        signals.append("Metadata or filename contains a known generative-tool term.")
    elif edit_metadata_hit:
        manipulation_score += 0.65
        signals.append("Metadata or filename suggests editing software or a prior edit.")
    if image.format not in {"JPEG", "PNG", "WEBP", "GIF", "BMP", "TIFF"}:
        manipulation_score += 0.10
        signals.append("The image format is uncommon for this service.")

    rgb = image.convert("RGB").resize((64, 64))
    channel_stats = ImageStat.Stat(rgb)
    flatness = sum(channel_stats.var) / 3
    if flatness < 35:
        manipulation_score += 0.08
        signals.append("The image has unusually low pixel variation.")

    if not signals:
        signals.append("No known metadata or simple pixel anomaly was found.")

    ai_probability = round(min(1.0, ai_score), 3)
    manipulation_probability = round(min(1.0, manipulation_score), 3)
    probability = ai_probability
    if ai_metadata_hit:
        confidence_score = 90.0
    elif edit_metadata_hit:
        confidence_score = 80.0
    elif len(signals) >= 1:
        confidence_score = 45.0
    else:
        confidence_score = 30.0
    confidence = "high" if confidence_score >= 75 else "medium" if confidence_score >= 50 else "low"
    if ai_probability >= 0.55:
        label = "potentially_ai_generated"
    elif manipulation_probability >= 0.55:
        label = "potentially_manipulated"
    else:
        label = "likely_human"
    return ImageDetectionResult(
        content_type="image",
        label=label,
        probability=probability,
        confidence=confidence,
        ai_probability_percent=round(ai_probability * 100, 1),
        non_ai_probability_percent=round((1 - ai_probability) * 100, 1),
        manipulation_probability_percent=round(manipulation_probability * 100, 1),
        confidence_score=confidence_score,
        signals=signals,
        details={
            "format": image.format,
            "width": image.width,
            "height": image.height,
            "has_exif": bool(image.getexif()),
        },
    )
