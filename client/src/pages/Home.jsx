import React from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="qc-page">
      {/* background layers */}
      <div className="qc-bgGradient" aria-hidden="true" />
      <div className="qc-bgGrid" aria-hidden="true" />
      <div className="qc-bgGlow" aria-hidden="true" />

      <main className="qc-shell">
        <section className="qc-card">
          <h1 className="qc-title">Quantum Key Distribution Simulator</h1>
          <p>&nbsp;</p>
          <p className="qc-subtitle">Select the QKD protocol to be simulated</p>

          <div className="qc-actions">
            <button
              className="qc-button"
              onClick={() => navigate("/bb84")}
              type="button"
            >
              BB84
            </button>

            <button
              className="qc-button qc-buttonSecondary"
              onClick={() => navigate("/e91")}
              type="button"
            >
              E91
            </button>
          </div>
        </section>

        <footer className="qc-footer">
          <span className="qc-footNote">
            MERN UI • Node API Gateway • Python Protocol Engine
          </span>
        </footer>
      </main>
    </div>
  );
}
