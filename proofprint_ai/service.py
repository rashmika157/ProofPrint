from typing import BinaryIO, Union

from .image_detector import analyze_image
from .models import ImageDetectionResult, TextDetectionResult, UnifiedDetectionResult
from .text_detector import analyze_text


def _to_unified_result(result: Union[TextDetectionResult, ImageDetectionResult]) -> UnifiedDetectionResult:
    if isinstance(result, TextDetectionResult):
        return UnifiedDetectionResult(
            detection_type="text",
            ai_generated_probability_percent=result.ai_probability_percent,
            human_real_probability_percent=result.human_probability_percent,
            manipulation_probability_percent=0.0,
            final_classification=result.label,
            confidence_score=result.confidence_score,
            confidence=result.confidence,
            signals=result.signals,
            disclaimer=result.disclaimer,
            details=result.details,
        )
    return UnifiedDetectionResult(
        detection_type="image",
        ai_generated_probability_percent=result.ai_probability_percent,
        human_real_probability_percent=result.non_ai_probability_percent,
        manipulation_probability_percent=result.manipulation_probability_percent,
        final_classification=result.label,
        confidence_score=result.confidence_score,
        confidence=result.confidence,
        signals=result.signals,
        disclaimer=result.disclaimer,
        details=result.details,
    )


def analyze_input(value: Union[str, bytes, bytearray, BinaryIO], filename: str = "") -> UnifiedDetectionResult:
    """Automatically route text strings or image bytes to the right detector."""
    if isinstance(value, str):
        return _to_unified_result(analyze_text(value))
    if isinstance(value, (bytes, bytearray)) or hasattr(value, "read"):
        return _to_unified_result(analyze_image(value, filename=filename))
    raise ValueError("Input must be text or image bytes.")
