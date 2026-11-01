import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import http from "../api/http.js";

function createStatistics(records) {
  const aiGenerated = records.filter((record) => {
    const classification = String(record.classification || "").toLowerCase();
    return classification === "potentially_ai_generated" ||
      classification === "likely_ai_generated" ||
      classification.includes("ai_generated");
  }).length;

  const humanWritten = records.filter((record) => {
    const classification = String(record.classification || "").toLowerCase();
    return classification === "likely_human" ||
      classification === "human_written";
  }).length;

  return {
    total: records.length,
    text: records.filter((record) => record.contentType === "text").length,
    image: records.filter((record) => record.contentType === "image").length,
    aiGenerated,
    humanWritten,
    blockchain: records.filter((record) =>
      Boolean(record.blockchainTransactionHash || record.blockchainTimestamp)
    ).length
  };
}

export default function DashboardPage() {
  const [statistics, setStatistics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setIsLoading(true);
    setError("");
    try {
      const response = await http.get("/history");
      const records = Array.isArray(response.data?.records) ? response.data.records : [];
      setStatistics(createStatistics(records));
    } catch (requestError) {
      setStatistics(null);
      setError(
        requestError.response?.data?.error?.message ||
        (requestError.code === "ECONNABORTED"
          ? "The dashboard request timed out. Please try again."
          : "Unable to load dashboard statistics. Check that the backend is running.")
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const cards = statistics ? [
    { label: "Total Analyses", value: statistics.total, accent: "violet" },
    { label: "Text Analyses", value: statistics.text, accent: "blue" },
    { label: "Image Analyses", value: statistics.image, accent: "cyan" },
    { label: "AI-Generated", value: statistics.aiGenerated, accent: "purple" },
    { label: "Human / Likely Human", value: statistics.humanWritten, accent: "green" },
    { label: "Blockchain Registrations", value: statistics.blockchain, accent: "gold" }
  ] : [];

  return (
    <section className="analysis-page dashboard-page">
      <div className="history-container">
        <Link className="back-link" to="/">← Back to home</Link>
        <div className="analysis-heading">
          <span className="analysis-label">SYSTEM OVERVIEW</span>
          <h1>Dashboard</h1>
          <p>Statistics from the saved ProofPrint analysis records.</p>
        </div>

        {isLoading && (
          <div className="history-state dashboard-state" aria-live="polite">
            <span className="spinner history-spinner" />
            <span>Loading dashboard statistics...</span>
          </div>
        )}

        {!isLoading && error && (
          <div className="history-state history-error dashboard-state" role="alert">
            <strong>Unable to load dashboard</strong>
            <span>{error}</span>
            <button className="browse-button" type="button" onClick={loadDashboard}>
              Try again
            </button>
          </div>
        )}

        {!isLoading && !error && statistics && (
          <div className="dashboard-grid">
            {cards.map((card) => (
              <article className={`dashboard-card ${card.accent}`} key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
