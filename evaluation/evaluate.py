"""Evaluate the ProofPrint detectors and FastAPI contract.

Run from the project root with:
    python -m evaluation.evaluate
"""

import io
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Sequence

from fastapi.testclient import TestClient
from PIL import Image
from PIL.PngImagePlugin import PngInfo

from proofprint_ai.api import app
from proofprint_ai.image_detector import analyze_image
from proofprint_ai.text_detector import analyze_text

ROOT = Path(__file__).resolve().parent
REPORT_PATH = ROOT / "report.md"
RESULTS_PATH = ROOT / "results.json"


@dataclass(frozen=True)
class TextCase:
    name: str
    expected: str
    text: str


@dataclass(frozen=True)
class ImageCase:
    name: str
    expected: str
    image_bytes: bytes


TEXT_CASES: Sequence[TextCase] = (
    TextCase(
        "human_personal_note",
        "human",
        "I missed the bus this morning and walked through the market instead. "
        "The route took longer, but I found a small bookshop I had never noticed. "
        "I bought a used cookbook and made soup when I finally got home.",
    ),
    TextCase(
        "human_project_reflection",
        "human",
        "Our first upload test failed because the sample file was empty. "
        "I expected a model problem, but the actual issue was the request form. "
        "After fixing that, the response looked ordinary and the second test passed.",
    ),
    TextCase(
        "human_travel_note",
        "human",
        "The train was late by twenty minutes, so I used the time to sketch the station. "
        "Rain kept tapping on the roof, and a child nearby was counting the arriving cars. "
        "It was a quiet delay rather than an annoying one.",
    ),
    TextCase(
        "ai_formal_explanation",
        "ai",
        "Furthermore, this solution demonstrates a comprehensive and effective approach. "
        "Moreover, it plays a crucial role in today's world. Additionally, the process "
        "provides a valuable and meaningful contribution to the field. In conclusion, "
        "the results demonstrate a practical and reliable outcome. "
        "Furthermore, this solution demonstrates a comprehensive and effective approach. "
        "Moreover, it plays a crucial role in today's world. Additionally, the process "
        "provides a valuable and meaningful contribution to the field. In conclusion, "
        "the results demonstrate a practical and reliable outcome. "
        "Furthermore, this solution demonstrates a comprehensive and effective approach. "
        "Moreover, it plays a crucial role in today's world. Additionally, the process "
        "provides a valuable and meaningful contribution to the field. In conclusion, "
        "the results demonstrate a practical and reliable outcome. "
    ),
    TextCase(
        "ai_balanced_summary",
        "ai",
        "Overall, this topic is important because it provides a comprehensive perspective. "
        "Furthermore, the approach is effective, efficient, and valuable for users. "
        "In conclusion, these findings play a crucial role in supporting future development. "
        "Overall, this topic is important because it provides a comprehensive perspective. "
        "Furthermore, the approach is effective, efficient, and valuable for users. "
        "In conclusion, these findings play a crucial role in supporting future development. "
        "Overall, this topic is important because it provides a comprehensive perspective. "
        "Furthermore, the approach is effective, efficient, and valuable for users. "
        "In conclusion, these findings play a crucial role in supporting future development. "
    ),
    TextCase(
        "ai_policy_paragraph",
        "ai",
        "It is important to note that technology has transformed modern communication. "
        "Moreover, this development creates significant opportunities and challenges. "
        "Additionally, stakeholders should adopt a balanced and sustainable approach. "
        "In conclusion, continued evaluation remains essential for long-term success. "
        "It is important to note that technology has transformed modern communication. "
        "Moreover, this development creates significant opportunities and challenges. "
        "Additionally, stakeholders should adopt a balanced and sustainable approach. "
        "In conclusion, continued evaluation remains essential for long-term success. "
        "It is important to note that technology has transformed modern communication. "
        "Moreover, this development creates significant opportunities and challenges. "
        "Additionally, stakeholders should adopt a balanced and sustainable approach. "
        "In conclusion, continued evaluation remains essential for long-term success. "
    ),
)


def _png_with_metadata(color: tuple[int, int, int], software: str = "") -> bytes:
    image = Image.new("RGB", (96, 96), color=color)
    stream = io.BytesIO()
    png_info = PngInfo()
    if software:
        png_info.add_text("Software", software)
    image.save(stream, format="PNG", pnginfo=png_info)
    return stream.getvalue()


IMAGE_CASES: Sequence[ImageCase] = (
    ImageCase("real_photo_01", "real", _png_with_metadata((70, 120, 180))),
    ImageCase("real_photo_02", "real", _png_with_metadata((120, 160, 90))),
    ImageCase("ai_image_01", "ai_generated", _png_with_metadata((160, 100, 80), "Midjourney")),
    ImageCase("ai_image_02", "ai_generated", _png_with_metadata((100, 80, 160), "Stable Diffusion")),
    ImageCase("manipulated_image_01", "manipulated", _png_with_metadata((90, 150, 110), "Adobe Photoshop")),
    ImageCase("manipulated_image_02", "manipulated", _png_with_metadata((150, 110, 70), "GIMP")),
)


def _classification_for_text(label: str) -> str:
    return "ai" if label == "potentially_ai_generated" else "human"


def _classification_for_image(label: str) -> str:
    if label == "potentially_ai_generated":
        return "ai_generated"
    if label == "potentially_manipulated":
        return "manipulated"
    return "real"


def _confusion_matrix(expected: Sequence[str], predicted: Sequence[str], labels: Sequence[str]) -> List[List[int]]:
    index = {label: position for position, label in enumerate(labels)}
    matrix = [[0 for _ in labels] for _ in labels]
    for actual, guess in zip(expected, predicted):
        if actual in index and guess in index:
            matrix[index[actual]][index[guess]] += 1
    return matrix


def _classification_metrics(expected: Sequence[str], predicted: Sequence[str], labels: Sequence[str]) -> Dict[str, object]:
    matrix = _confusion_matrix(expected, predicted, labels)
    total = len(expected)
    correct = sum(matrix[index][index] for index in range(len(labels)))
    per_class = {}
    precisions = []
    recalls = []
    f1_scores = []
    for index, label in enumerate(labels):
        true_positive = matrix[index][index]
        false_positive = sum(matrix[row][index] for row in range(len(labels))) - true_positive
        false_negative = sum(matrix[index]) - true_positive
        precision = true_positive / (true_positive + false_positive) if true_positive + false_positive else 0.0
        recall = true_positive / (true_positive + false_negative) if true_positive + false_negative else 0.0
        f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
        per_class[label] = {"precision": round(precision, 3), "recall": round(recall, 3), "f1": round(f1, 3)}
        precisions.append(precision)
        recalls.append(recall)
        f1_scores.append(f1)
    return {
        "labels": list(labels),
        "sample_count": total,
        "accuracy": round(correct / total, 3) if total else 0.0,
        "precision_macro": round(sum(precisions) / len(precisions), 3),
        "recall_macro": round(sum(recalls) / len(recalls), 3),
        "f1_macro": round(sum(f1_scores) / len(f1_scores), 3),
        "per_class": per_class,
        "confusion_matrix": matrix,
    }


def evaluate_text() -> Dict[str, object]:
    expected = [case.expected for case in TEXT_CASES]
    predictions = [_classification_for_text(analyze_text(case.text).label) for case in TEXT_CASES]
    return _classification_metrics(expected, predictions, ["human", "ai"])


def evaluate_images() -> Dict[str, object]:
    expected = [case.expected for case in IMAGE_CASES]
    predictions = [_classification_for_image(analyze_image(case.image_bytes, case.name).label) for case in IMAGE_CASES]
    return _classification_metrics(expected, predictions, ["real", "ai_generated", "manipulated"])


def evaluate_api() -> Dict[str, object]:
    client = TestClient(app)
    checks = {}

    text_response = client.post("/analyze", data={"text": TEXT_CASES[0].text})
    checks["valid_text"] = text_response.status_code == 200 and text_response.json().get("detection_type") == "text"

    image_response = client.post(
        "/analyze",
        files={"file": ("sample.png", IMAGE_CASES[0].image_bytes, "image/png")},
    )
    checks["valid_image"] = image_response.status_code == 200 and image_response.json().get("detection_type") == "image"
    checks["missing_input"] = client.post("/analyze").status_code == 400
    checks["multiple_inputs"] = client.post("/analyze", data={"text": "text"}, files={"file": ("x.png", b"x", "image/png")}).status_code == 400
    checks["unsupported_type"] = client.post(
        "/analyze", files={"file": ("notes.txt", b"not image", "text/plain")}
    ).status_code == 415
    checks["invalid_image"] = client.post(
        "/analyze/image", files={"file": ("broken.png", b"not image", "image/png")}
    ).status_code == 400
    return {"checks": checks, "passed": sum(checks.values()), "total": len(checks)}


def _percent(value: float) -> str:
    return f"{value * 100:.1f}%"


def _markdown_metrics(title: str, metrics: Dict[str, object]) -> str:
    lines = [
        f"### {title}",
        f"Samples: {metrics['sample_count']}",
        "",
        "| Metric | Score |",
        "|---|---:|",
        f"| Accuracy | {_percent(metrics['accuracy'])} |",
        f"| Macro precision | {_percent(metrics['precision_macro'])} |",
        f"| Macro recall | {_percent(metrics['recall_macro'])} |",
        f"| Macro F1-score | {_percent(metrics['f1_macro'])} |",
        "",
        "Confusion matrix (rows = expected, columns = predicted):",
        "",
        "```text",
        json.dumps(metrics["confusion_matrix"], indent=2),
        "```",
    ]
    return "\n".join(lines)


def write_report(results: Dict[str, object]) -> None:
    api = results["api"]
    failed_checks = [name for name, passed in api["checks"].items() if not passed]
    limitations = [
        "This is a small, hand-authored evaluation set, not a representative production benchmark.",
        "The image fixtures are generated PNG proxies, not real photographs or genuinely generated images.",
        "Image AI/manipulation cases include embedded tool metadata because the baseline explicitly uses metadata signals; this can inflate scores and is reported as a limitation.",
        "Text labels describe the source examples, not a proof of authorship. Paraphrasing, editing, short inputs, and new generators can change results.",
        "Use the metrics to compare future detector versions, not as evidence that any individual user submission is authentic.",
    ]
    report = [
        "# ProofPrint AI Evaluation Report",
        "",
        f"Generated: {results['generated_at']}",
        "",
        "## Summary",
        "",
        "This report evaluates the current lightweight heuristic detectors and API contract. It is a reproducible smoke benchmark, not a forensic validation study.",
        "",
        _markdown_metrics("Text detection", results["text"]),
        "",
        _markdown_metrics("Image detection", results["images"]),
        "",
        "### FastAPI checks",
        "",
        f"Passed: {api['passed']}/{api['total']}",
        "",
        "| Check | Result |",
        "|---|---|",
    ]
    report.extend(f"| {name} | {'PASS' if passed else 'FAIL'} |" for name, passed in api["checks"].items())
    report.extend(["", "## Limitations", ""])
    report.extend(f"- {item}" for item in limitations)
    if failed_checks:
        report.extend(["", "## Failed API checks", "", ", ".join(failed_checks)])
    REPORT_PATH.write_text("\n".join(report) + "\n", encoding="utf-8")


def main() -> None:
    results = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "text": evaluate_text(),
        "images": evaluate_images(),
        "api": evaluate_api(),
    }
    RESULTS_PATH.write_text(json.dumps(results, indent=2) + "\n", encoding="utf-8")
    write_report(results)
    print(f"Evaluation complete: {REPORT_PATH}")
    print(f"Machine-readable results: {RESULTS_PATH}")
    print(f"Text accuracy: {_percent(results['text']['accuracy'])}")
    print(f"Image accuracy: {_percent(results['images']['accuracy'])}")
    print(f"API checks: {results['api']['passed']}/{results['api']['total']} passed")


if __name__ == "__main__":
    main()