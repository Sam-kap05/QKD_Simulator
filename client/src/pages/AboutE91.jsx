import React from "react";

const tableStyle = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  overflow: "hidden",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
};

const thTd = {
  padding: "10px 12px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  verticalAlign: "top",
};

const thStyle = {
  ...thTd,
  fontWeight: 700,
  color: "rgba(255,255,255,0.92)",
  background: "rgba(255,255,255,0.04)",
};

const tdStyle = {
  ...thTd,
  color: "rgba(255,255,255,0.78)",
  background: "rgba(0,0,0,0.10)",
};

const h1Style = { textAlign: "left", margin: "0 0 8px" };
const pStyle = { textAlign: "left", margin: "0 0 16px", maxWidth: 980 };
const h2Style = { textAlign: "left", margin: "18px 0 10px", fontSize: 18, fontWeight: 800 };
const smallStyle = { color: "rgba(255,255,255,0.72)", lineHeight: 1.55 };

export default function AboutE91() {
  return (
    <div className="qc-page">
      <div className="qc-bgGradient" aria-hidden="true" />
      <div className="qc-bgGrid" aria-hidden="true" />
      <div className="qc-bgGlow" aria-hidden="true" />

      <main className="qc-shell">
        <section className="qc-card qc-cardWide">
          <h1 className="qc-title qc-titleSm" style={h1Style}>
            E91 Protocol (Entanglement-based QKD)
          </h1>

          <p className="qc-subtitle" style={pStyle}>
            E91 is an entanglement-based QKD protocol. Instead of Alice preparing single-photon states, an entanglement
            source distributes paired quantum systems to Alice and Bob. They measure in different settings, extract a sifted
            key from designated setting pairs, and assess security via Bell/CHSH inequality violation.
          </p>

          <h2 style={h2Style}>What “entanglement-based” changes</h2>
          <p style={{ ...pStyle, ...smallStyle }}>
            In BB84, security intuition is “measurement disturbs states.” In E91, security is tied to observed non-classical
            correlations: if Alice and Bob see a Bell/CHSH violation, the correlations cannot be explained by local hidden variables,
            and (under standard assumptions) Eve’s information is bounded.
          </p>

          <h2 style={h2Style}>Measurement settings and CHSH (high level)</h2>
          <p style={{ ...pStyle, ...smallStyle }}>
            Alice and Bob each choose from a small set of measurement settings (often 3 each in common E91 variants).
            Some setting combinations are used to generate raw key bits; others are used to estimate correlation terms that form
            the CHSH value <b>S</b>. Ideally, quantum mechanics allows |S| up to 2√2, while classical local realism is bounded by 2.
          </p>

          <div style={{ marginTop: 10 }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Data subset</th>
                  <th style={thStyle}>Used for</th>
                  <th style={thStyle}>Publicly revealed?</th>
                  <th style={thStyle}>Kept in final key?</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Designated key-setting pairs</td>
                  <td style={tdStyle}>Raw/sifted key extraction</td>
                  <td style={tdStyle}>No (except small sample for QBER/consistency checks)</td>
                  <td style={tdStyle}>Yes (after post-processing)</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Bell-test setting pairs</td>
                  <td style={tdStyle}>Compute correlations → CHSH S</td>
                  <td style={tdStyle}>Yes (statistics only)</td>
                  <td style={tdStyle}>No</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 style={h2Style}>Protocol steps (compact)</h2>
          <ol style={{ ...smallStyle, marginTop: 8, paddingLeft: 20 }}>
            <li><b>Distribution:</b> an entanglement source emits pairs; one particle goes to Alice, one to Bob.</li>
            <li><b>Random settings:</b> Alice chooses A0/A1/A2; Bob chooses B0/B1/B2 (or similar) for each pair.</li>
            <li><b>Measurement:</b> both record outcomes (bits) for each pair.</li>
            <li><b>Sifting:</b> keep outcomes from a particular setting pair for the raw key (e.g., A2 with B0).</li>
            <li><b>Bell test:</b> use the remaining outcomes to estimate correlations and compute CHSH S.</li>
            <li><b>Abort/Proceed:</b> if S shows no violation (or QBER is too high), abort; else error correction + privacy amplification.</li>
          </ol>

          <h2 style={h2Style}>Where “Eve” shows up in E91</h2>
          <p style={{ ...pStyle, ...smallStyle }}>
            Any intervention that reduces entanglement quality (decoherence, replacement with separable states, or partial
            measurement) tends to reduce Bell violation and/or increase QBER. That’s why E91 frequently visualizes security
            using both <b>QBER</b> and <b>CHSH S</b> trends.
          </p>

          <h2 style={h2Style}>Relationship to device-independent ideas</h2>
          <p style={{ ...pStyle, ...smallStyle }}>
            E91 is historically important because it connects QKD security with Bell inequality violation. This is a stepping
            stone toward device-independent QKD concepts (where security can be argued with fewer assumptions about the internal
            device behavior). In practice, real DI-QKD is demanding; most deployed systems remain assumption-heavy.
          </p>
        </section>
      </main>
    </div>
  );
}
