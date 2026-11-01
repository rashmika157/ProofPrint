import { useState } from "react";
import { Link } from "react-router-dom";
import http from "../api/http.js";

const hashPattern = /^0x[0-9a-fA-F]{64}$/;

export default function VerifyContentPage() {
  const [contentHash, setContentHash] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleVerify() {
    const hash = contentHash.trim();

    if (!hashPattern.test(hash)) {
      setError("Enter a valid SHA-256 hash beginning with 0x and followed by 64 hexadecimal characters.");
      setResult(null);
      return;
    }

    setError("");
    setResult(null);
    setIsLoading(true);

    try {
      const response = await http.get(
        `/blockchain/verify/${encodeURIComponent(hash)}`
      );
      setResult(response.data);
    } catch (requestError) {
      const message =
        requestError.response?.data?.error?.message ||
        (requestError.code === "ECONNABORTED"
          ? "The verification request timed out. Please try again."
          : "Unable to verify the content. Check that the backend and blockchain service are running.");
      setError(message);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }

  function handleClear() {
    setContentHash("");
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

  const registered = result?.registered === true;
  const blockchainRecord = result?.record ?? null;
  const transactionHash =
    result?.transactionHash ??
    blockchainRecord?.transactionHash ??
    result?.databaseRecord?.blockchainTransactionHash ??
    null;
  const timestamp =
    result?.timestamp ??
    blockchainRecord?.timestamp ??
    result?.databaseRecord?.blockchainTimestamp ??
    null;

  return (
    <section className="analysis-page">
      <div className="analysis-container verify-container">
        <Link className="back-link" to="/">← Back to home</Link>
        <div className="analysis-heading">
          <span className="analysis-label">BLOCKCHAIN VERIFICATION</span>
          <h1>Verify Content</h1>
          <p>Enter a SHA-256 content hash to check its blockchain registration.</p>
        </div>

        <div className="analysis-card verify-card">
          <div className="card-header">
            <label htmlFor="content-hash">SHA-256 content hash</label>
            <button
              className="clear-button"
              type="button"
              onClick={handleClear}
              disabled={!contentHash}
            >
              Clear
            </button>
          </div>

          <input
            id="content-hash"
            className="verify-input"
            type="text"
            value={contentHash}
            onChange={(event) => {
              setContentHash(event.target.value);
              if (error) setError("");
              if (result) setResult(null);
            }}
            placeholder="0x..."
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "verify-error" : undefined}
            autoComplete="off"
            spellCheck="false"
          />

          <span
            id="verify-error"
            className={error ? "input-error verify-error visible" : "input-error verify-error"}
          >
            {error}
          </span>

          <button
            className="primary-button"
            type="button"
            onClick={handleVerify}
            disabled={isLoading}
          >
            {isLoading && <span className="spinner" />}
            {isLoading ? "Verifying..." : "Verify"}
          </button>

          {result && (
            <div className="analysis-result verify-result" aria-live="polite">
              <div className="analysis-result-header">
                <span>Verification result</span>
                <strong className={registered ? "status-registered" : "status-unregistered"}>
                  {registered ? "Registered" : "Not registered"}
                </strong>
              </div>

              <div className="verify-details">
                <div>
                  <span>Content hash</span>
                  <strong className="hash-value">{result.contentHash ?? contentHash.trim()}</strong>
                </div>

                {registered && (
                  <>
                    <div>
                      <span>Transaction hash</span>
                      <strong className="hash-value">{transactionHash || "Unavailable"}</strong>
                    </div>
                    <div>
                      <span>Registration timestamp</span>
                      <strong>{formatTimestamp(timestamp)}</strong>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
