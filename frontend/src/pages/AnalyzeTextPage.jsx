import { useState } from "react";
import { Link } from "react-router-dom";
import http from "../api/http.js";

export default function AnalyzeTextPage() {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleAnalyze() {
    if (!text.trim()) {
      setError("Enter some text before starting the analysis.");
      return;
    }

    setError("");
    setResult(null);
    setIsLoading(true);

    try {
      const response = await http.post("/analyze/text", { text }, {
        timeout: 60_000
      });
      setResult(response.data);
    } catch (requestError) {
      const message =
        requestError.response?.data?.error?.message ||
        requestError.response?.data?.detail ||
        (requestError.code === "ECONNABORTED"
          ? "The analysis request timed out. Please try again."
          : "Unable to analyze the text. Check that the backend and AI service are running.");
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleClear() {
    setText("");
    setError("");
    setResult(null);
  }

    function formatTimestamp(value) {
      if (!value) return "Unavailable";
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) return String(value);
      const date = new Date(numericValue * 1000);
      return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
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
    result?.human_probability_percent ??
    result?.human_written_probability_percent ??
    result?.human_real_probability_percent;
  const confidenceScore =
    result?.confidence_score ??
    result?.confidenceScore;
  const transactionHash =
    result?.blockchain?.transactionHash ??
    result?.transactionHash;
  const registrationTimestamp =
    result?.blockchain?.timestamp ??
    result?.timestamp ??
    result?.databaseRecord?.blockchainTimestamp;

  return (
    <section className="analysis-page">
      <div className="analysis-container">
        <Link className="back-link" to="/">← Back to home</Link>
        <div className="analysis-heading">
          <span className="analysis-label">TEXT SCREENING</span>
          <h1>Analyze Text</h1>
          <p>Paste text below for an AI-generated content screening preview.</p>
        </div>

        <div className="analysis-card text-card">
          <div className="card-header">
            <label htmlFor="text-input">Text content</label>
            <button className="clear-button" type="button" onClick={handleClear} disabled={!text}>
              Clear text
            </button>
          </div>

          <textarea
            id="text-input"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              if (error && event.target.value.trim()) setError("");
              if (result) setResult(null);
            }}
            placeholder="Paste or type the text you want to verify..."
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "text-error" : undefined}
            maxLength={100000}
          />

          <div className="text-card-footer">
            <span id="text-error" className={error ? "input-error visible" : "input-error"}>
              {error}
            </span>
            <span className="character-count">{text.length.toLocaleString()} / 100,000 characters</span>
          </div>

          <button className="primary-button" type="button" onClick={handleAnalyze} disabled={isLoading}>
            {isLoading && <span className="spinner" />}
            {isLoading ? "Analyzing..." : "Analyze Text"}
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
                  <span>Human-written</span>
                  <strong>{typeof humanProbability === "number" ? `${humanProbability.toFixed(1)}%` : "Unavailable"}</strong>
                </div>
                <div>
                  <span>Confidence</span>
                  <strong>{typeof confidenceScore === "number" ? `${confidenceScore.toFixed(1)}%` : "Unavailable"}</strong>
                </div>
                <div>
                  <span>SHA-256 hash</span>
                  <strong className="hash-value">{result?.contentHash || "Unavailable"}</strong>
                </div>
                <div>
                  <span>Transaction hash</span>
                  <strong className="hash-value">{transactionHash || "Unavailable (recovered on-chain record)"}</strong>
                </div>
                <div>
                  <span>Registration timestamp</span>
                  <strong>{formatTimestamp(registrationTimestamp)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
