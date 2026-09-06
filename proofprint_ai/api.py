from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from .image_detector import analyze_image
from .models import DetectionResult, ImageDetectionResult, TextDetectionResult, TextRequest, UnifiedDetectionResult
from .service import analyze_input
from .text_detector import analyze_text

app = FastAPI(
    title="ProofPrint AI Module",
    version="0.1.0",
    description="Lightweight screening API for potentially AI-generated text and images.",
)

MAX_TEXT_LENGTH = 100_000
MAX_IMAGE_BYTES = 10 * 1024 * 1024


async def _read_image_upload(file: UploadFile) -> tuple[bytes, str]:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Upload an image file.")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="The uploaded image is empty.")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="The uploaded image is larger than 10 MB.")
    return data, file.filename or ""


def _require_text(text: str) -> str:
    if not text.strip():
        raise HTTPException(status_code=422, detail="Text input must contain at least one word.")
    if len(text) > MAX_TEXT_LENGTH:
        raise HTTPException(status_code=413, detail="Text input is larger than 100,000 characters.")
    return text


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "proofprint-ai"}


@app.post("/analyze", response_model=UnifiedDetectionResult)
async def analyze_endpoint(
    text: Optional[str] = Form(default=None),
    file: Optional[UploadFile] = File(default=None),
) -> UnifiedDetectionResult:
    if (text is None) == (file is None):
        raise HTTPException(status_code=400, detail="Provide exactly one text field or image file.")
    if text is not None:
        try:
            return analyze_input(_require_text(text))
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
    try:
        data, filename = await _read_image_upload(file)
        return analyze_input(data, filename=filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/analyze/text", response_model=TextDetectionResult)
def analyze_text_endpoint(request: TextRequest) -> TextDetectionResult:
    return analyze_text(_require_text(request.text))


@app.post("/analyze/image", response_model=ImageDetectionResult)
async def analyze_image_endpoint(file: UploadFile = File(...)) -> ImageDetectionResult:
    try:
        data, filename = await _read_image_upload(file)
        return analyze_image(data, filename=filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
