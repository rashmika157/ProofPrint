from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class DetectionResult(BaseModel):
    content_type: Literal["text", "image"]
    label: Literal["likely_human", "potentially_ai_generated", "potentially_manipulated", "inconclusive"]
    probability: float = Field(ge=0.0, le=1.0)
    confidence: Literal["low", "medium", "high"]
    signals: List[str]
    disclaimer: str = (
        "This is a screening result, not proof of authorship or image authenticity. "
        "Use it with provenance and human review."
    )
    details: Optional[dict] = None


class TextDetectionResult(DetectionResult):
    content_type: Literal["text"] = "text"
    ai_probability_percent: float = Field(ge=0.0, le=100.0)
    human_probability_percent: float = Field(ge=0.0, le=100.0)
    confidence_score: float = Field(ge=0.0, le=100.0)


class ImageDetectionResult(DetectionResult):
    content_type: Literal["image"] = "image"
    ai_probability_percent: float = Field(ge=0.0, le=100.0)
    non_ai_probability_percent: float = Field(ge=0.0, le=100.0)
    manipulation_probability_percent: float = Field(ge=0.0, le=100.0)
    confidence_score: float = Field(ge=0.0, le=100.0)


class UnifiedDetectionResult(BaseModel):
    detection_type: Literal["text", "image"]
    ai_generated_probability_percent: float = Field(ge=0.0, le=100.0)
    human_real_probability_percent: float = Field(ge=0.0, le=100.0)
    manipulation_probability_percent: float = Field(ge=0.0, le=100.0)
    final_classification: str
    confidence_score: float = Field(ge=0.0, le=100.0)
    confidence: Literal["low", "medium", "high"]
    signals: List[str]
    disclaimer: str
    details: Optional[dict] = None


class TextRequest(BaseModel):
    text: str = Field(min_length=1, max_length=100_000)
