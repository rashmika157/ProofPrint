# ProofPrint AI Module

A small, beginner-friendly Python service for screening text and images for possible AI generation or manipulation signals. It is designed as a standalone module that the ProofPrint web/blockchain teams can call over HTTP.

## Important limitation

This is a transparent baseline, not a forensic detector. AI detectors can produce false positives and false negatives, especially on short text, edited images, compressed media, and new generation tools. Treat `probability`, `confidence`, and `signals` as review aids. Combine them with source history, hashes, metadata, and human review before making an authenticity decision.

## Features

- Text screening with lexical diversity, sentence regularity, repeated phrases, and formulaic-transition signals.
- Image screening with known generative-tool metadata, filename clues, format checks, and a simple pixel-variation check.
- Text responses include AI-generated probability, human-written probability, a final classification, a numeric confidence score, evidence signals, and diagnostic details.
- FastAPI documentation at `/docs`.

## Setup

Requires Python 3.10 or newer.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

The pinned requirements include FastAPI, Uvicorn, Pillow, Pydantic, multipart upload support, HTTP test support, and pytest. No model download or external service is required.

## Run the API

```powershell
python -m uvicorn proofprint_ai.api:app --reload
```

The service runs at `http://127.0.0.1:8000`. Open `http://127.0.0.1:8000/docs` to try the endpoints interactively.

The unified endpoint is `POST /analyze`. Send exactly one multipart field: `text` for text input or `file` for an image. It automatically selects the detector and always returns the same response fields: `detection_type`, `ai_generated_probability_percent`, `human_real_probability_percent`, `manipulation_probability_percent`, `final_classification`, and `confidence_score`.

Use `/analyze` for new integrations because it provides the consistent cross-modal response. The `/analyze/text` and `/analyze/image` routes remain available for direct detector-specific integration.

The OpenAPI schema and interactive Swagger UI are available at `http://127.0.0.1:8000/docs`; the raw OpenAPI document is at `http://127.0.0.1:8000/openapi.json`.

## API examples

Text:

```powershell
curl.exe -X POST http://127.0.0.1:8000/analyze/text `
  -H "Content-Type: application/json" `
  -d '{"text":"Paste the text to screen here."}'
```

Image:

```powershell
curl.exe -X POST http://127.0.0.1:8000/analyze/image -F "file=@sample.png"
```

Unified text or image request:

```powershell
curl.exe -X POST http://127.0.0.1:8000/analyze -F "text=Paste the text to screen here."
curl.exe -X POST http://127.0.0.1:8000/analyze -F "file=@sample.png"
```

Example response shape:

```json
{
  "detection_type": "text",
  "ai_generated_probability_percent": 62.0,
  "human_real_probability_percent": 38.0,
  "manipulation_probability_percent": 0.0,
  "final_classification": "potentially_ai_generated",
  "confidence": "medium",
  "confidence_score": 74.0,
  "signals": ["Sentence lengths are unusually uniform."],
  "disclaimer": "This is a screening result, not proof of authorship or image authenticity. Use it with provenance and human review.",
  "details": {"word_count": 120}
}
```

The API returns `400` when neither or both inputs are provided, `415` for a non-image upload, `422` for empty text, `400` when image bytes cannot be decoded, and `413` when text exceeds 100,000 characters or an image exceeds 10 MB.

## Test

```powershell
python -m pytest -q
```

Run the full evaluation harness:

```powershell
python -m evaluation.evaluate
```

This writes a human-readable [evaluation/report.md](evaluation/report.md) and machine-readable [evaluation/results.json](evaluation/results.json). The report includes accuracy, macro precision, macro recall, macro F1-score, per-class metrics, confusion matrices, and FastAPI checks for valid, missing, conflicting, unsupported, and malformed inputs. See [evaluation/fixtures/README.md](evaluation/fixtures/README.md) for replacing the built-in image proxies with licensed local examples.

Run the text detector independently with the included sample inputs:

```powershell
python -m examples.text_detection_demo
```

Run the image detector independently with generated sample images:

```powershell
python -m examples.image_detection_demo
```

The percentage probabilities always sum to `100`. Text with fewer than 20 words is returned as `inconclusive` with low confidence because there is not enough writing style to screen reliably.

For images, `ai_probability_percent` and `non_ai_probability_percent` are complements. `manipulation_probability_percent` is a separate screening signal and may be high even when the AI probability is low. The baseline checks image metadata, filename clues, format, and simple pixel statistics; it does not prove that an image is authentic.

## Model details and limitations

The text detector is an explainable heuristic baseline. It combines lexical diversity, sentence-length variation, repeated phrase detection, and formulaic transition phrases. Text shorter than 20 words is marked inconclusive.

The image detector uses Pillow to inspect known generative/editing-tool metadata and filename clues, image format, and simple pixel variation. It is intentionally lightweight and does not claim reliable detection of modern generated or edited images without metadata.

Evaluation results are generated by `python -m evaluation.evaluate` and stored in [evaluation/report.md](evaluation/report.md) and [evaluation/results.json](evaluation/results.json). The current smoke benchmark reports 100% on 6 hand-authored text cases, 100% on 6 synthetic image proxies, and 6/6 API checks. These scores are not production accuracy: the image proxies contain tool metadata that the baseline is designed to detect, and the dataset is too small to generalize.

## Project layout

```text
proofprint_ai/
  api.py             FastAPI routes and validation
  models.py          Request and response schemas
  service.py         Cross-modal dispatch and response normalization
  text_detector.py   Explainable text screening baseline
  image_detector.py  Pillow-based image screening baseline
examples/
  text_detection_demo.py
  image_detection_demo.py
evaluation/
  evaluate.py        Metrics, confusion matrices, and API checks
  report.md          Generated human-readable report
  results.json       Generated machine-readable results
tests/
  test_ai_module.py
  test_evaluation.py
```

## Integration notes

The web application can call `POST /analyze/text` with JSON `{ "text": "..." }` or `POST /analyze/image` as multipart form data with a field named `file`. The response is deliberately stable and can be stored beside a blockchain hash later. Do not store or publish user content in this module; it only analyzes the request and returns the result.
