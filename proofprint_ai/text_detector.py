"""Explainable, dependency-light text screening heuristics."""

import re
import statistics
from collections import Counter

from .models import TextDetectionResult

_WORD_RE = re.compile(r"[A-Za-z][A-Za-z'-]*")
_SENTENCE_RE = re.compile(r"[^.!?]+[.!?]?(?=\s+|$)")
_AI_TRANSITIONS = {
    "furthermore", "moreover", "additionally", "in conclusion", "overall",
    "it is important to note", "in today's world", "plays a crucial role",
}


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def analyze_text(text: str) -> TextDetectionResult:
    """Return a screening score based on style regularity, not a trained classifier."""
    cleaned = " ".join(text.split())
    words = _WORD_RE.findall(cleaned.lower())
    sentences = [part.strip() for part in _SENTENCE_RE.findall(cleaned) if part.strip()]

    if len(words) < 20:
        return TextDetectionResult(
            content_type="text",
            label="inconclusive",
            probability=0.5,
            confidence="low",
            ai_probability_percent=50.0,
            human_probability_percent=50.0,
            confidence_score=10.0,
            signals=["At least 20 words are recommended for a meaningful style screen."],
            details={"word_count": len(words), "sentence_count": len(sentences)},
        )

    counts = Counter(words)
    lexical_diversity = len(counts) / len(words)
    lengths = [len(_WORD_RE.findall(sentence)) for sentence in sentences] or [len(words)]
    mean_length = statistics.mean(lengths)
    length_variation = statistics.pstdev(lengths) / max(mean_length, 1)
    transition_hits = sum(cleaned.lower().count(phrase) for phrase in _AI_TRANSITIONS)
    repeated_phrases = len(re.findall(r"\b(\w+(?:\s+\w+){2,3})\s+\1\b", cleaned.lower()))

    score = 0.10
    signals = []
    if lexical_diversity < 0.48:
        score += 0.18
        signals.append("Low lexical variety for the text length.")
    if length_variation < 0.35:
        score += 0.20
        signals.append("Sentence lengths are unusually uniform.")
    if transition_hits >= 2:
        score += min(0.18, transition_hits * 0.04)
        signals.append("Several formulaic transition phrases were detected.")
    if repeated_phrases:
        score += 0.12
        signals.append("A repeated phrase pattern was detected.")
    if not signals:
        signals.append("No strong AI-style signals were found by this baseline.")

    probability = round(_clamp(score), 3)
    confidence_score = min(95.0, 35.0 + min(len(words), 300) / 10 + len(signals) * 8)
    confidence = "high" if confidence_score >= 75 else "medium"
    label = "potentially_ai_generated" if probability >= 0.55 else "likely_human"
    return TextDetectionResult(
        content_type="text",
        label=label,
        probability=probability,
        confidence=confidence,
        ai_probability_percent=round(probability * 100, 1),
        human_probability_percent=round((1 - probability) * 100, 1),
        confidence_score=round(confidence_score, 1),
        signals=signals,
        details={
            "word_count": len(words),
            "sentence_count": len(sentences),
            "lexical_diversity": round(lexical_diversity, 3),
            "sentence_length_variation": round(length_variation, 3),
            "formulaic_transition_count": transition_hits,
        },
    )
