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

export default function AboutBB84() {
  return (
    <div className="qc-page">
      <div className="qc-bgGradient" aria-hidden="true" />
      <div className="qc-bgGrid" aria-hidden="true" />
      <div className="qc-bgGlow" aria-hidden="true" />

      <main className="qc-shell">
        <section className="qc-card qc-cardWide">
          <h1 className="qc-title qc-titleSm" style={h1Style}>
            BB84 Protocol
          </h1>
          <p className="qc-subtitle" style={pStyle}>
            BB84 is a prepare-and-measure QKD protocol. Alice encodes random bits into non-orthogonal quantum states
            using randomly chosen bases. Bob measures in randomly chosen bases. Security comes from the fact that
            any eavesdropping attempt introduces errors that Alice and Bob can detect statistically.
          </p>

          <h2 style={h2Style}>State encoding and measurement (intuition)</h2>
          <p style={{ ...pStyle, ...smallStyle }}>
            BB84 uses two conjugate bases: <b>Z</b> (computational) and <b>X</b> (Hadamard). A simple polarization view:
            Z corresponds to two orthogonal polarizations (e.g., 0°/90°), and X corresponds to two diagonals (e.g., 45°/135°).
            If Bob measures in the “wrong” basis, his outcome is effectively random.
          </p>

          <div style={{ marginTop: 10 }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Basis</th>
                  <th style={thStyle}>Bit 0 state</th>
                  <th style={thStyle}>Bit 1 state</th>
                  <th style={thStyle}>If Bob uses other basis…</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Z</td>
                  <td style={tdStyle}>|0⟩ (e.g., 0°)</td>
                  <td style={tdStyle}>|1⟩ (e.g., 90°)</td>
                  <td style={tdStyle}>Random result with ~50/50 probability</td>
                </tr>
                <tr>
                  <td style={tdStyle}>X</td>
                  <td style={tdStyle}>|+⟩ (e.g., 45°)</td>
                  <td style={tdStyle}>|−⟩ (e.g., 135°)</td>
                  <td style={tdStyle}>Random result with ~50/50 probability</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 style={h2Style}>Protocol steps (compact)</h2>
          <ol style={{ ...smallStyle, marginTop: 8, paddingLeft: 20 }}>
            <li><b>Preparation:</b> Alice samples random bits and random bases, encodes each bit into a quantum state.</li>
            <li><b>Transmission:</b> states travel over a quantum channel (loss/noise may occur).</li>
            <li><b>Measurement:</b> Bob chooses random bases and measures each received state.</li>
            <li><b>Sifting:</b> Alice and Bob publicly compare bases and keep only indices where bases match.</li>
            <li><b>Parameter estimation (QBER):</b> reveal a random subset of the sifted bits to estimate error rate; <b>discard revealed bits</b>.</li>
            <li><b>Post-processing:</b> error correction + privacy amplification to produce the final key.</li>
          </ol>

          <h2 style={h2Style}>Security check: QBER and why revealing bits matters</h2>
          <p style={{ ...pStyle, ...smallStyle }}>
            The QBER (quantum bit error rate) is computed on a <b>random test sample</b> from the sifted bits.
            Those bits are publicly revealed (so Eve learns them) and therefore must be discarded from the key.
            In many textbook discussions, a QBER above roughly ~11% is a red flag for BB84 under standard assumptions
            (exact thresholds depend on the security proof and implementation assumptions).
          </p>

          <h2 style={h2Style}>Common eavesdropping intuition: intercept-resend</h2>
          <p style={{ ...pStyle, ...smallStyle }}>
            If Eve measures each photon in a random basis and resends, she sometimes chooses the wrong basis and
            collapses the state. When Bob later measures in Alice’s basis, his bit may flip, causing detectable QBER.
            This is why QBER is a practical indicator of eavesdropping/noise.
          </p>

          <h2 style={h2Style}>Practical notes (what real BB84 adds)</h2>
          <ul style={{ ...smallStyle, marginTop: 8, paddingLeft: 20 }}>
            <li><b>Photon loss:</b> many photons don’t arrive; the protocol operates on detected events.</li>
            <li><b>Decoy states:</b> used to defeat photon-number-splitting attacks in weak-coherent-pulse systems.</li>
            <li><b>Authentication:</b> the public channel must be authenticated (or Eve can MITM the entire run).</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
