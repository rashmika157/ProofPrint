import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import "./App.css";
import AnalyzeTextPage from "./pages/AnalyzeTextPage.jsx";
import AnalyzeImagePage from "./pages/AnalyzeImagePage.jsx";
import VerifyContentPage from "./pages/VerifyContentPage.jsx";
import AnalysisHistoryPage from "./pages/AnalysisHistoryPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";

const TextIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 5h16M12 5v14M8 19h8M4 5v4M20 5v4" />
  </svg>
);

const ImageIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9" r="1.5" />
    <path d="m4 17 5-5 3.5 3.5 2.5-2.5 5 5" />
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M4 10h11M11 6l4 4-4 4" />
  </svg>
);

const Logo = () => (
  <Link className="logo" to="/" aria-label="ProofPrint home">
    <span className="logo-mark" aria-hidden="true">
      <svg viewBox="0 0 34 34">
        <path d="M17 2 29 8v8c0 8-5 13-12 16C10 29 5 24 5 16V8L17 2Z" />
        <path className="logo-check" d="m11 17 4 4 8-9" />
      </svg>
    </span>
    <span>ProofPrint</span>
  </Link>
);

function Navbar() {
  return (
    <header className="navbar">
      <div className="nav-inner">
        <Logo />
        <nav aria-label="Primary navigation">
          <NavLink to="/">Home</NavLink>
          <Link to="/#how-it-works">How It Works</Link>
          <NavLink to="/analyze/text">Analyze</NavLink>
          <NavLink to="/verify">Verify Content</NavLink>
          <NavLink to="/history">Analysis History</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
        </nav>
        <Link className="nav-button" to="/analyze/text">
          Get Started
          <ArrowIcon />
        </Link>
      </div>
    </header>
  );
}

function OptionCard({ icon, eyebrow, title, description, href }) {
  return (
    <Link className="option-card" to={href}>
      <div className="option-icon">{icon}</div>
      <div className="option-copy">
        <span>{eyebrow}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span className="option-arrow"><ArrowIcon /></span>
    </Link>
  );
}

function Hero() {
  return (
    <section className="hero" id="home">
      <div className="glow glow-one" />
      <div className="glow glow-two" />
      <div className="hero-content">
        <div className="hero-badge">
          <span className="status-dot" />
          AI + Blockchain Verification
        </div>
        <h1>
          Verify What's Real.
          <span>Prove What's Authentic.</span>
        </h1>
        <p className="hero-description">
          ProofPrint combines advanced AI content screening with blockchain-backed
          verification to help you establish authenticity and preserve digital trust.
        </p>
        <div className="options" id="verify">
          <OptionCard
            icon={<TextIcon />}
            eyebrow="TEXT ANALYSIS"
            title="Analyze Text"
            description="Screen text for possible AI-generated patterns."
            href="/analyze/text"
          />
          <OptionCard
            icon={<ImageIcon />}
            eyebrow="IMAGE ANALYSIS"
            title="Analyze Image"
            description="Inspect images for AI and manipulation signals."
            href="/analyze/image"
          />
        </div>
        <p className="disclaimer">
          Screening results are advisory and should be combined with human review.
        </p>
      </div>
    </section>
  );
}

const steps = [
  {
    number: "01",
    title: "Submit Content",
    description: "Upload an image or paste text securely into ProofPrint.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
      </svg>
    )
  },
  {
    number: "02",
    title: "AI Analysis",
    description: "Our screening models identify possible AI-generation and manipulation signals.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    )
  },
  {
    number: "03",
    title: "Blockchain Proof",
    description: "A content hash and concise analysis summary are recorded for immutable verification.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9M8 9l8-4" />
      </svg>
    )
  }
];

function HowItWorks() {
  return (
    <section className="how-section" id="how-it-works">
      <div className="section-heading">
        <span>THE PROCESS</span>
        <h2>How It Works</h2>
        <p>A clear, secure path from content submission to verifiable proof.</p>
      </div>
      <div className="steps">
        {steps.map((step, index) => (
          <article className="step-card" key={step.number}>
            <div className="step-top">
              <div className="step-icon">{step.icon}</div>
              <span>{step.number}</span>
            </div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            {index < steps.length - 1 && <div className="step-line" />}
          </article>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <Logo />
        <p>AI-powered screening. Blockchain-backed provenance.</p>
        <span>© {new Date().getFullYear()} ProofPrint</span>
      </div>
    </footer>
  );
}

export default function App() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/" && location.hash) {
      window.requestAnimationFrame(() => {
        document.querySelector(location.hash)?.scrollIntoView({ behavior: "smooth" });
      });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [location]);

  return (
    <>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<><Hero /><HowItWorks /></>} />
          <Route path="/analyze/text" element={<AnalyzeTextPage />} />
          <Route path="/analyze/image" element={<AnalyzeImagePage />} />
          <Route path="/verify" element={<VerifyContentPage />} />
          <Route path="/history" element={<AnalysisHistoryPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="*" element={<><Hero /><HowItWorks /></>} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
