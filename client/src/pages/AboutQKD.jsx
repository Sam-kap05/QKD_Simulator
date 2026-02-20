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

export default function AboutQKD() {
  return (
    <div className="qc-page">
      <div className="qc-bgGradient" aria-hidden="true" />
      <div className="qc-bgGrid" aria-hidden="true" />
      <div className="qc-bgGlow" aria-hidden="true" />

      <main className="qc-shell">
        <section className="qc-card qc-cardWide">
          <h1 className="qc-title qc-titleSm" style={h1Style}>
            Quantum Key Distribution (QKD)
          </h1>
          <p className="qc-subtitle" style={pStyle}>
            QKD is a family of protocols that lets two parties (Alice and Bob) establish a shared secret key
            whose security is grounded in quantum physics. Unlike classical key exchange, eavesdropping on the
            quantum states necessarily introduces detectable disturbances.
          </p>

          <h2 style={h2Style}>Why modern cryptography is “at risk” from quantum computing</h2>
          <p style={{ ...pStyle, ...smallStyle }}>
            Today’s internet security relies heavily on public-key cryptography (e.g., RSA, ECC) for key exchange
            and digital signatures. Large fault-tolerant quantum computers would undermine these systems:
            Shor’s algorithm would efficiently factor large integers and solve discrete logarithms (breaking RSA/ECC),
            while Grover’s algorithm gives a quadratic speedup for brute-force search (reducing effective security of
            symmetric keys and hashes).
          </p>

          <div style={{ marginTop: 10, marginBottom: 6 }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Primitive</th>
                  <th style={thStyle}>Common classical assumption</th>
                  <th style={thStyle}>Quantum impact (high level)</th>
                  <th style={thStyle}>Typical mitigation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>RSA / ECC</td>
                  <td style={tdStyle}>Hard factoring / discrete log</td>
                  <td style={tdStyle}>Shor breaks both (once large FTQC exists)</td>
                  <td style={tdStyle}>PQC (lattice/code/hash-based), or QKD for keys</td>
                </tr>
                <tr>
                  <td style={tdStyle}>AES / symmetric ciphers</td>
                  <td style={tdStyle}>Exhaustive search is 2^k</td>
                  <td style={tdStyle}>Grover reduces to ~2^(k/2)</td>
                  <td style={tdStyle}>Double key sizes (e.g., AES-256)</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Hashing</td>
                  <td style={tdStyle}>Preimage ~2^n, collision ~2^(n/2)</td>
                  <td style={tdStyle}>Grover affects preimage resistance</td>
                  <td style={tdStyle}>Larger outputs; PQC signatures often hash-based</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 style={h2Style}>Core idea of QKD</h2>
          <p style={{ ...pStyle, ...smallStyle }}>
            QKD uses quantum states (single photons or entangled pairs) to carry “raw” correlated data.
            The crucial point is that <b>measuring unknown quantum states generally disturbs them</b>.
            Alice and Bob publicly compare some information (over an authenticated classical channel) to estimate
            the disturbance as an error rate. If errors are too high, they abort because an eavesdropper (Eve)
            or excessive noise is likely present.
          </p>

          <h2 style={h2Style}>What every practical QKD system needs</h2>
          <div style={{ marginTop: 8 }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Component</th>
                  <th style={thStyle}>Purpose</th>
                  <th style={thStyle}>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={tdStyle}>Quantum channel</td>
                  <td style={tdStyle}>Carries quantum states (photons / entanglement)</td>
                  <td style={tdStyle}>Fiber/free-space; losses + noise are unavoidable</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Authenticated classical channel</td>
                  <td style={tdStyle}>Public discussion: basis reconciliation, parameter estimation, etc.</td>
                  <td style={tdStyle}>
                    Must be authenticated (pre-shared key or digital signatures), otherwise Eve can do a MITM attack
                  </td>
                </tr>
                <tr>
                  <td style={tdStyle}>Parameter estimation</td>
                  <td style={tdStyle}>Estimate QBER / CHSH violation to bound Eve’s info</td>
                  <td style={tdStyle}>Uses a sacrificed sample, never reused in the final key</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Error correction</td>
                  <td style={tdStyle}>Reconcile Alice/Bob keys over public channel</td>
                  <td style={tdStyle}>Leaks information → must be accounted for</td>
                </tr>
                <tr>
                  <td style={tdStyle}>Privacy amplification</td>
                  <td style={tdStyle}>Compress key to remove Eve’s partial information</td>
                  <td style={tdStyle}>Typically universal hashing</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 style={h2Style}>End-to-end pipeline (conceptual)</h2>
          <ol style={{ ...smallStyle, marginTop: 8, paddingLeft: 20 }}>
            <li><b>Quantum transmission:</b> send prepared states (BB84) or distribute entangled pairs (E91).</li>
            <li><b>Sifting:</b> keep only compatible events (e.g., matching bases) → “sifted key”.</li>
            <li><b>Parameter estimation:</b> reveal a random subset to estimate QBER (or CHSH statistics) → discard revealed bits.</li>
            <li><b>Error correction:</b> reconcile discrepancies using public messages.</li>
            <li><b>Privacy amplification:</b> hash/compress the reconciled key to get a shorter but secure final key.</li>
          </ol>

          <p style={{ ...pStyle, ...smallStyle, marginTop: 10 }}>
            In this simulator, you’ll see the internal steps transparently (choices, bases/settings, kept indices, and
            the evolving key). Real systems do the same logic but optimize heavily for throughput and security proofs.
          </p>
        </section>
      </main>
    </div>
  );
}
