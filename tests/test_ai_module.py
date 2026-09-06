import io

from fastapi.testclient import TestClient
from PIL import Image

from proofprint_ai.api import app
from proofprint_ai.image_detector import analyze_image
from proofprint_ai.service import analyze_input
from proofprint_ai.text_detector import analyze_text

client = TestClient(app)


def test_short_text_is_inconclusive():
    result = analyze_text("This is too short.")
    assert result.label == "inconclusive"
    assert result.confidence == "low"


def test_text_result_has_bounded_probability():
    result = analyze_text(("Furthermore, this example demonstrates a consistent approach to content verification. " * 8))
    assert 0 <= result.probability <= 1
    assert 0 <= result.ai_probability_percent <= 100
    assert 0 <= result.human_probability_percent <= 100
    assert result.ai_probability_percent + result.human_probability_percent == 100
    assert 0 <= result.confidence_score <= 100
    assert result.content_type == "text"


def test_short_text_has_explicit_inconclusive_percentages():
    result = analyze_text("This is too short.")
    assert result.ai_probability_percent == 50
    assert result.human_probability_percent == 50
    assert result.confidence_score == 10


def test_image_result_has_bounded_probability():
    image = Image.new("RGB", (32, 32), color=(120, 80, 40))
    stream = io.BytesIO()
    image.save(stream, format="PNG")
    result = analyze_image(stream.getvalue(), filename="sample.png")
    assert 0 <= result.probability <= 1
    assert 0 <= result.ai_probability_percent <= 100
    assert 0 <= result.non_ai_probability_percent <= 100
    assert 0 <= result.manipulation_probability_percent <= 100
    assert result.ai_probability_percent + result.non_ai_probability_percent == 100
    assert 0 <= result.confidence_score <= 100
    assert result.content_type == "image"


def test_image_edit_metadata_is_flagged_as_manipulation():
    image = Image.new("RGB", (32, 32), color=(120, 80, 40))
    stream = io.BytesIO()
    image.save(stream, format="PNG")
    result = analyze_image(stream.getvalue(), filename="sample_photoshop.png")
    assert result.label == "potentially_manipulated"
    assert result.manipulation_probability_percent >= 55


def test_image_ai_metadata_is_flagged_as_ai_generated():
    image = Image.new("RGB", (32, 32), color=(120, 80, 40))
    stream = io.BytesIO()
    image.save(stream, format="PNG")
    result = analyze_image(stream.getvalue(), filename="midjourney_output.png")
    assert result.label == "potentially_ai_generated"
    assert result.ai_probability_percent >= 55


def test_api_endpoints():
    assert client.get("/health").json()["status"] == "ok"
    response = client.post("/analyze/text", json={"text": "A sufficiently long sample " * 10})
    assert response.status_code == 200
    assert response.json()["ai_probability_percent"] >= 0
    assert response.json()["human_probability_percent"] >= 0


def test_image_api_returns_image_scores():
    image = Image.new("RGB", (32, 32), color=(120, 80, 40))
    stream = io.BytesIO()
    image.save(stream, format="PNG")
    response = client.post(
        "/analyze/image",
        files={"file": ("sample.png", stream.getvalue(), "image/png")},
    )
    assert response.status_code == 200
    assert "manipulation_probability_percent" in response.json()


def test_unified_service_routes_text_and_image():
    text_result = analyze_input("A sufficiently long sample " * 10)
    assert text_result.detection_type == "text"
    assert text_result.manipulation_probability_percent == 0
    assert text_result.ai_generated_probability_percent + text_result.human_real_probability_percent == 100

    image = Image.new("RGB", (32, 32), color=(120, 80, 40))
    stream = io.BytesIO()
    image.save(stream, format="PNG")
    image_result = analyze_input(stream.getvalue(), filename="sample.png")
    assert image_result.detection_type == "image"
    assert image_result.ai_generated_probability_percent + image_result.human_real_probability_percent == 100


def test_unified_api_routes_both_input_types():
    text_response = client.post("/analyze", data={"text": "A sufficiently long sample " * 10})
    assert text_response.status_code == 200
    assert text_response.json()["detection_type"] == "text"
    assert "final_classification" in text_response.json()

    image = Image.new("RGB", (32, 32), color=(120, 80, 40))
    stream = io.BytesIO()
    image.save(stream, format="PNG")
    image_response = client.post(
        "/analyze",
        files={"file": ("sample.png", stream.getvalue(), "image/png")},
    )
    assert image_response.status_code == 200
    image_json = image_response.json()
    assert image_json["detection_type"] == "image"
    assert "manipulation_probability_percent" in image_json


def test_api_rejects_invalid_unified_inputs():
    assert client.post("/analyze").status_code == 400
    assert client.post("/analyze", data={"text": "text"}, files={"file": ("x.png", b"x", "image/png")}).status_code == 400
    assert client.post("/analyze", data={"text": "   "}).status_code == 422


def test_api_rejects_unsupported_or_invalid_images():
    unsupported = client.post(
        "/analyze",
        files={"file": ("notes.txt", b"not an image", "text/plain")},
    )
    assert unsupported.status_code == 415

    invalid = client.post(
        "/analyze/image",
        files={"file": ("broken.png", b"not an image", "image/png")},
    )
    assert invalid.status_code == 400


def test_api_rejects_oversized_inputs():
    assert client.post("/analyze", data={"text": "x" * 100_001}).status_code == 413
    oversized_image = b"x" * (10 * 1024 * 1024 + 1)
    response = client.post(
        "/analyze/image",
        files={"file": ("large.png", oversized_image, "image/png")},
    )
    assert response.status_code == 413
