import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { jsPDF } from "jspdf";
import http from "../api/http.js";

function formatDate(value) {
  if (!value) return "Unavailable";
  const textValue = String(value);
  const normalizedValue = /^\d+$/.test(textValue)
    ? Number(textValue) * 1000
    : `${textValue.replace(" ", "T")}Z`;
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatProbability(value) {
  return typeof value === "number" ? `${value.toFixed(1)}%` : "Unavailable";
}

function formatPdfProbability(value) {
  return typeof value === "number" ? `${value.toFixed(1)}%` : "Not available";
}

export default function AnalysisHistoryPage() {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");

  function downloadReport(record) {
    try {
      setDownloadError("");

      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const contentLeft = 20;
      const contentWidth = pageWidth - 40;
      let y = 22;

      pdf.setFillColor(13, 17, 34);
      pdf.rect(0, 0, pageWidth, 42, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text("ProofPrint Verification Report", contentLeft, 20);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(190, 194, 216);
      pdf.text("Analysis record verification summary", contentLeft, 29);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, contentLeft, 35);

      y = 54;
      pdf.setTextColor(35, 40, 58);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("Analysis Details", contentLeft, y);

      y += 9;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);

      const details = [
        ["Content Type", record.contentType === "image" ? "Image" : "Text"],
        ["Classification", record.classification?.replaceAll("_", " ") || "Not available"],
        ["AI-Generated Probability", formatPdfProbability(record.aiGeneratedProbability)],
        ["Human Probability", formatPdfProbability(record.humanWrittenProbability)],
        ["Confidence Score", formatPdfProbability(record.confidenceScore)],
        ["Analysis Date", formatDate(record.createdAt)],
      ];

      details.forEach(([label, value]) => {
        pdf.setFont("helvetica", "bold");
        pdf.text(label, contentLeft, y);
        pdf.setFont("helvetica", "normal");
        pdf.text(String(value), contentLeft + 58, y);
        y += 9;
      });

      y += 3;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("Content & Blockchain Information", contentLeft, y);
      y += 9;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);

      pdf.setFont("helvetica", "bold");
      pdf.text("SHA-256 Content Hash", contentLeft, y);
      y += 5;
      pdf.setFont("helvetica", "normal");
      pdf.setFont("courier", "normal");
      const contentHashLines = pdf.splitTextToSize(record.contentHash || "Not available", contentWidth);
      pdf.text(contentHashLines, contentLeft, y);
      y += (contentHashLines.length * 5) + 5;

      pdf.setFont("helvetica", "bold");
      pdf.text("Blockchain Transaction Hash", contentLeft, y);
      y += 5;
      pdf.setFont("courier", "normal");
      const transactionHashLines = pdf.splitTextToSize(
        record.blockchainTransactionHash || "Not available",
        contentWidth
      );
      pdf.text(transactionHashLines, contentLeft, y);
      y += (transactionHashLines.length * 5) + 5;

      pdf.setFont("helvetica", "bold");
      pdf.text("Blockchain Registration Timestamp", contentLeft, y);
      y += 5;
      pdf.setFont("helvetica", "normal");
      pdf.text(record.blockchainTimestamp ? formatDate(record.blockchainTimestamp) : "Not available", contentLeft, y);

      pdf.setDrawColor(220, 223, 234);
      pdf.line(contentLeft, 278, pageWidth - contentLeft, 278);
      pdf.setFontSize(8);
      pdf.setTextColor(120, 126, 145);
      pdf.text("ProofPrint analysis report - original text and image data are not included.", contentLeft, 284);

      const hashSuffix = record.contentHash?.slice(-12) || `record-${record.id || "unknown"}`;
      pdf.save(`proofprint-verification-${hashSuffix}.pdf`);
    } catch {
      setDownloadError("Unable to generate the PDF report. Please try again.");
    }
  }

  async function loadHistory() {
    setIsLoading(true);
    setError("");
    try {
      const response = await http.get("/history");
      setRecords(Array.isArray(response.data?.records) ? response.data.records : []);
    } catch (requestError) {
      setRecords([]);
      setError(
        requestError.response?.data?.error?.message ||
        (requestError.code === "ECONNABORTED"
          ? "The history request timed out. Please try again."
          : "Unable to load analysis history. Check that the backend is running.")
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <section className="analysis-page history-page">
      <div className="history-container">
        <Link className="back-link" to="/">← Back to home</Link>
        <div className="analysis-heading">
          <span className="analysis-label">SAVED ANALYSIS RECORDS</span>
          <h1>Analysis History</h1>
          <p>Review previously saved text and image verification records.</p>
        </div>

        {downloadError && (
          <div className="history-download-error" role="alert">{downloadError}</div>
        )}

        {isLoading && (
          <div className="history-state" aria-live="polite">
            <span className="spinner history-spinner" />
            <span>Loading analysis history...</span>
          </div>
        )}

        {!isLoading && error && (
          <div className="history-state history-error" role="alert">
            <strong>Unable to load history</strong>
            <span>{error}</span>
            <button className="browse-button" type="button" onClick={loadHistory}>Try again</button>
          </div>
        )}

        {!isLoading && !error && records.length === 0 && (
          <div className="history-state">
            <strong>No analysis records yet</strong>
            <span>Completed text and image analyses will appear here.</span>
            <Link className="browse-button history-action" to="/analyze/text">Analyze text</Link>
          </div>
        )}

        {!isLoading && !error && records.length > 0 && (
          <div className="history-list">
            {records.map((record) => (
              <article className="history-card" key={record.id ?? record.contentHash}>
                <div className="history-card-header">
                  <span className={`content-type-badge ${record.contentType}`}>
                    {record.contentType === "image" ? "Image" : "Text"}
                  </span>
                  <time dateTime={record.createdAt || undefined}>{formatDate(record.createdAt)}</time>
                </div>

                <div className="history-classification">
                  <span>Classification</span>
                  <strong>{record.classification?.replaceAll("_", " ") || "Unavailable"}</strong>
                </div>

                <div className="history-metrics">
                  <div>
                    <span>AI-generated</span>
                    <strong>{formatProbability(record.aiGeneratedProbability)}</strong>
                  </div>
                  <div>
                    <span>{record.contentType === "image" ? "Human / non-AI" : "Human-written"}</span>
                    <strong>{formatProbability(record.humanWrittenProbability)}</strong>
                  </div>
                  <div>
                    <span>Confidence</span>
                    <strong>{formatProbability(record.confidenceScore)}</strong>
                  </div>
                </div>

                <div className="history-hash">
                  <span>Content hash</span>
                  <strong>{record.contentHash || "Unavailable"}</strong>
                </div>

                <button
                  className="report-download-button"
                  type="button"
                  onClick={() => downloadReport(record)}
                >
                  Download Verification Report
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
