import { useEffect, useRef, useState } from "react";
import http from "../api/http.js";

const allowedTypes = ["image/jpeg", "image/png"];
const maxImageSize = 10 * 1024 * 1024;

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AnalyzeImagePage() {
  const inputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function selectFile(file) {
    if (!file) return;

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, JPEG, or PNG image.");
      return;
    }

    if (file.size > maxImageSize) {
      setError("The selected image is larger than 10 MB.");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
    setResult(null);
  }

  function removeImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImage(null);
    setPreviewUrl("");
    setError("");
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleAnalyze() {
    if (!image) {
      setError("Select an image before starting the analysis.");
      return;
    }

    setError("");
    setResult(null);
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", image, image.name);

    try {
      const response = await http.post("/analyze/image", formData, {
        timeout: 60_000
      });
      setResult(response.data);
    } catch (requestError) {
      const message =
        requestError.response?.data?.error?.message ||
        requestError.response?.data?.detail ||
        (requestError.code === "ECONNABORTED"
          ? "The analysis request timed out. Please try again."
          : "Unable to analyze the image. Check that the backend and AI service are running.");
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
  }

  const classification =
    result?.label ||
    result?.classification ||
    result?.final_classification ||
    "Unavailable";
  const aiProbability =
    result?.ai_probability_percent ??
    result?.ai_generated_probability_percent;
  const humanProbability =
    result?.non_ai_probability_percent ??
    result?.human_written_probability_percent ??
    result?.human_real_probability_percent;
  const confidenceScore =
    result?.confidence_score ??
    result?.confidenceScore;

  return (
    <section className="analysis-page">
      <div className="analysis-container">
        <a className="back-link" href="/">← Back to home</a>
        <div className="analysis-heading">
          <span className="analysis-label">IMAGE SCREENING</span>
          <h1>Analyze Image</h1>
          <p>Upload an image for an AI-generation and manipulation screening preview.</p>
        </div>

        <div className="analysis-card image-card">
          {!image ? (
            <div
              className={isDragging ? "drop-zone dragging" : "drop-zone"}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOverCapture={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="upload-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
                </svg>
              </div>
              <h2>Drop an image here</h2>
              <p>JPG, JPEG or PNG · Maximum 10 MB</p>
              <button className="browse-button" type="button" onClick={() => inputRef.current?.click()}>
                Browse files
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                onChange={(event) => selectFile(event.target.files[0])}
                hidden
              />
            </div>
          ) : (
            <div className="image-preview-wrap">
              <div className="image-preview">
                <img src={previewUrl} alt="Selected preview" />
              </div>
              <div className="file-details">
                <div>
                  <strong>{image.name}</strong>
                  <span>{formatFileSize(image.size)}</span>
                </div>
                <button className="remove-button" type="button" onClick={removeImage}>Remove</button>
              </div>
            </div>
          )}

          <span className={error ? "input-error image-error visible" : "input-error image-error"}>
            {error}
          </span>

          <button className="primary-button" type="button" onClick={handleAnalyze} disabled={isLoading}>
            {isLoading && <span className="spinner" />}
            {isLoading ? "Analyzing..." : "Analyze Image"}
          </button>

          {result && (
            <div className="analysis-result" aria-live="polite">
              <div className="analysis-result-header">
                <span>Analysis result</span>
                <strong>{classification.replaceAll("_", " ")}</strong>
              </div>
              <div className="analysis-result-grid">
                <div>
                  <span>AI-generated</span>
                  <strong>{typeof aiProbability === "number" ? `${aiProbability.toFixed(1)}%` : "Unavailable"}</strong>
                </div>
                <div>
                  <span>Human/non-AI</span>
                  <strong>{typeof humanProbability === "number" ? `${humanProbability.toFixed(1)}%` : "Unavailable"}</strong>
                </div>
                <div>
                  <span>Confidence</span>
                  <strong>{typeof confidenceScore === "number" ? `${confidenceScore.toFixed(1)}%` : "Unavailable"}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
