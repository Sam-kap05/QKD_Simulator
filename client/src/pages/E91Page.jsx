import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// const API_BASE = "http://localhost:5000";
const API_BASE = "https://fastapi-pi-three.vercel.app";

// helpers
const angleLabel = (a) => `${a}°`;
const choiceLabelA = (idx) => (idx === 0 ? "A0" : idx === 1 ? "A1" : "A2");
const choiceLabelB = (idx) => (idx === 0 ? "B0" : idx === 1 ? "B1" : "B2");

function AliceIcon() {
  return (
    <svg width="54" height="54" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(98,154,255,0.9)" />
          <stop offset="1" stopColor="rgba(172,84,255,0.9)" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#a)" opacity="0.22" />
      <circle cx="32" cy="26" r="10" fill="rgba(255,255,255,0.9)" opacity="0.9" />
      <path d="M18 52c2-10 26-10 28 0" fill="rgba(255,255,255,0.8)" opacity="0.85" />
    </svg>
  );
}

function BobIcon() {
  return (
    <svg width="54" height="54" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="b" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(84,255,209,0.9)" />
          <stop offset="1" stopColor="rgba(98,154,255,0.9)" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#b)" opacity="0.22" />
      <circle cx="32" cy="26" r="10" fill="rgba(255,255,255,0.9)" opacity="0.9" />
      <path d="M18 52c2-10 26-10 28 0" fill="rgba(255,255,255,0.8)" opacity="0.85" />
    </svg>
  );
}

export default function E91Page() {
  const navigate = useNavigate();

  const [keySize, setKeySize] = useState(32);
  const [chunkSize, setChunkSize] = useState(12);
  const [noiseP, setNoiseP] = useState(0.0);

  const [eveEnabled, setEveEnabled] = useState(false);
  const [eveStrength, setEveStrength] = useState(0.35); // “how much decoherence Eve introduces”

  const [isRunning, setIsRunning] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  // entanglement animation tokens
  const [pairPulses, setPairPulses] = useState([]);

  // protocol data states
  const [iteration, setIteration] = useState(null);
  const [iterNo, setIterNo] = useState(1);
  const [aliceKey, setAliceKey] = useState([]);
  const [bobKey, setBobKey] = useState([]);

  const [qber, setQber] = useState(0);
  const [S, setS] = useState(null);
  const [bellViolated, setBellViolated] = useState(false);

  const [log, setLog] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  // stop/cancel controls for loops
  const runTokenRef = useRef(0);

  const target = useMemo(() => Math.max(1, Number(keySize) || 1), [keySize]);

  const progress = useMemo(() => {
    return Math.min(100, Math.floor((bobKey.length / target) * 100));
  }, [bobKey.length, target]);
  
  const eveDetected = useMemo(() => (qber ?? 0) > 0.11, [qber])

  const addLogLines = (lines) => setLog((prev) => [...lines, ...prev].slice(0, 240));

  function resetUIState() {
    setIteration(null);
    setIterNo(1);
    setAliceKey([]);
    setBobKey([]);
    setQber(0);
    setS(null);
    setBellViolated(false);
    setLog([]);
    setErrorMsg("");
  }

  /** ---- API calls ---- */
  async function apiStartE91({ target_n, chunk_size }) {
    const resp = await fetch(`${API_BASE}/api/e91/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_n,
        chunk_size,
        noise_p: noiseP,
        eve_enabled: eveEnabled,
        eve_strength: eveStrength,
      }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) throw new Error(data?.detail || data?.error || "Failed to start session");
    return data.sessionId;
  }

  async function apiStepE91(sid) {
    const resp = await fetch(`${API_BASE}/api/e91/step/${sid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) throw new Error(data?.detail || data?.error || "Step failed");
    return data;
  }
    const laneTops = ["28%", "44%", "60%", "76%"];

  function enqueuePairPulses(data) {
    const n = data.chunkSize || 0;

    const pulses = Array.from({ length: n }).map((_, i) => {
      const idBase = `${data.iterNo}-${i}-${crypto.randomUUID?.() ?? Math.random()}`;
      const lane = i % laneTops.length;
      const delay = i * 0.12; // stagger so it looks like stream

      // Use small labels so it’s not too noisy visually
      const aLbl = "q"; // or `A${data.aChoices?.[i] ?? ""}`
      const bLbl = "q"; // or `B${data.bChoices?.[i] ?? ""}`

      return [
        { id: `L-${idBase}`, dir: "L", lane, delay, label: aLbl },
        { id: `R-${idBase}`, dir: "R", lane, delay, label: bLbl },
      ];
    }).flat();

    setPairPulses((prev) => [...prev, ...pulses]);
  }

  function removePulse(id) {
    setPairPulses((prev) => prev.filter((p) => p.id !== id));
  }

  function applyStepToUI(data) {
    setIteration({
      iterNo: data.iterNo,
      chunkSize: data.chunkSize,

      aChoices: data.aChoices,
      aAngles: data.aAngles,
      aBits: data.aBits,

      bChoices: data.bChoices,
      bAngles: data.bAngles,
      bBits: data.bBits,

      keyIndices: data.keyIndices,
      aKeyChunk: data.aKeyChunk,
      bKeyChunk: data.bKeyChunk,
    });

    setIterNo((n) => Math.max(n, (data.iterNo || n) + 1));

    setAliceKey(data.aliceKeySoFar || []);
    setBobKey(data.bobKeySoFar || []);
    enqueuePairPulses(data);

    setQber(data.qberSoFar ?? 0);
    setS(data.S ?? null);
    setBellViolated(!!data.bellViolated);

    addLogLines([
      `--------- Iteration ${data.iterNo} ---------`,
      `Pairs in chunk: ${data.chunkSize}`,
      `Alice choices: ${(data.aChoices || []).map(choiceLabelA).join(" ")}`,
      `Alice angles:  ${(data.aAngles || []).map(angleLabel).join(" ")}`,
      `Alice bits:    ${(data.aBits || []).join("")}`,
      `Bob choices:   ${(data.bChoices || []).map(choiceLabelB).join(" ")}`,
      `Bob angles:    ${(data.bAngles || []).map(angleLabel).join(" ")}`,
      `Bob bits:      ${(data.bBits || []).join("")}`,
      `Key indices (A2 & B0): [${(data.keyIndices || []).join(", ")}]`,
      `Kept bits (Alice): ${(data.aKeyChunk || []).join("") || "—"}`,
      `Kept bits (Bob):   ${(data.bKeyChunk || []).join("") || "—"}`,
      `QBER so far: ${((data.qberSoFar ?? 0) * 100).toFixed(2)}%`,
      data.S != null ? `CHSH S so far: ${Number(data.S).toFixed(3)} (${data.bellViolated ? "Bell violation ✅" : "No violation ❌"})` : `CHSH S so far: (collecting...)`,
      eveEnabled ? `Eve model: decoherence strength=${Number(eveStrength).toFixed(2)}` : `Eve: OFF`,
    ]);
        if ((data.qberSoFar ?? 0) > 0.11) {
      addLogLines([`⚠ WARNING: QBER exceeded 11% — protocol should ABORT and discard key.`]);
    }
  }

  /** ---- actions ---- */
  async function handleGenerate() {
    const myToken = ++runTokenRef.current;

    setIsRunning(true);
    resetUIState();

    try {
      const sid = await apiStartE91({ target_n: target, chunk_size: chunkSize });
      setSessionId(sid);

      addLogLines([`Target key size: ${target}`, `Session started: ${sid}`]);

      while (runTokenRef.current === myToken) {
        const data = await apiStepE91(sid);
        applyStepToUI(data);
        if (data.done) break;
        await new Promise((r) => setTimeout(r, 650));
      }
    } catch (e) {
      setErrorMsg(String(e?.message || e));
    } finally {
      if (runTokenRef.current === myToken) setIsRunning(false);
    }
  }

  async function handleStepOnce() {
    ++runTokenRef.current;
    setIsRunning(false);

    try {
      setErrorMsg("");

      let sid = sessionId;
      if (!sid) {
        resetUIState();
        sid = await apiStartE91({ target_n: target, chunk_size: chunkSize });
        setSessionId(sid);
        addLogLines([`Target key size: ${target}`, `Session started: ${sid}`]);
      }

      const data = await apiStepE91(sid);
      applyStepToUI(data);
    } catch (e) {
      setErrorMsg(String(e?.message || e));
    }
  }

  function handleReset() {
    ++runTokenRef.current;
    setIsRunning(false);
    setSessionId(null);
    resetUIState();
  }

  return (
    <div className="qc-page">
      <div className="qc-bgGradient" aria-hidden="true" />
      <div className="qc-bgGrid" aria-hidden="true" />
      <div className="qc-bgGlow" aria-hidden="true" />

      <main className="qc-shell">
        <section className="qc-card qc-cardWide">
          <div className="qc-topbar">
            <button className="qc-linkBtn" onClick={() => navigate("/")}>← Home</button>

            <div className="qc-chipRow">
              <span className="qc-chip">Protocol: E91</span>
              <span className="qc-chip">Iterations: {Math.max(0, iterNo - 1)}</span>
              <span className="qc-chip">Key Progress: {bobKey.length}/{target} ({progress}%)</span>
              <span className="qc-chip">QBER: {(qber * 100).toFixed(2)}%</span>
              <span className="qc-chip">S: {S == null ? "—" : Number(S).toFixed(3)}</span>
              <span className="qc-chip">{bellViolated ? "Bell ✅" : "Bell ❌"}</span>
              <span className="qc-chip">Noise p: {Number(noiseP).toFixed(2)}</span>
              <span className="qc-chip">Eve: {eveEnabled ? "ON" : "OFF"}</span>
            </div>
          </div>

          <h1 className="qc-title qc-titleSm">E91 Simulator</h1>
          <p className="qc-subtitle">
            Entangled pairs are distributed to Alice and Bob. They choose measurement settings, generate a sifted key from a
            designated setting pair, and estimate security by CHSH/Bell violation.
          </p>

          <div className="bb84-controls">
            <label className="bb84-field">
              <span className="bb84-label">Target Key Size</span>
              <input className="bb84-input" type="number" min={1} step={1}
                value={keySize} onChange={(e) => setKeySize(e.target.value)} disabled={isRunning} />
            </label>

            <label className="bb84-field" style={{ minWidth: 160 }}>
              <span className="bb84-label">Chunk Size (pairs)</span>
              <input className="bb84-input" type="number" min={1} step={1}
                value={chunkSize} onChange={(e) => setChunkSize(Number(e.target.value))} disabled={isRunning} />
            </label>

            <label className="bb84-field" style={{ minWidth: 200 }}>
              <span className="bb84-label">Noise (measurement flip p)</span>
              <input className="bb84-input" type="number" min={0} max={1} step={0.01}
                value={noiseP} onChange={(e) => setNoiseP(Number(e.target.value))} disabled={isRunning} />
            </label>

            <label className="bb84-field" style={{ minWidth: 170 }}>
              <span className="bb84-label">Eve</span>
              <div style={{ display: "flex", gap: 10, alignItems: "center", paddingTop: 6 }}>
                <input
                  type="checkbox"
                  checked={eveEnabled}
                  onChange={(e) => setEveEnabled(e.target.checked)}
                  disabled={isRunning}
                  style={{ transform: "scale(1.15)" }}
                />
                <span className="bb84-muted">{eveEnabled ? "Decoherence ON" : "OFF"}</span>
              </div>
            </label>

            <label className="bb84-field" style={{ minWidth: 220 }}>
              <span className="bb84-label">Eve strength</span>
              <input className="bb84-input" type="number" min={0} max={1} step={0.05}
                value={eveStrength} onChange={(e) => setEveStrength(Number(e.target.value))}
                disabled={isRunning || !eveEnabled} />
            </label>

            <button className="qc-button" onClick={handleGenerate} disabled={isRunning}>
              {isRunning ? "Generating..." : "Generate Key"}
            </button>

            <button className="qc-button qc-buttonSecondary" onClick={handleReset} disabled={isRunning}>
              Reset
            </button>

            <button className="qc-button qc-buttonSecondary" onClick={handleStepOnce} disabled={isRunning}>
              Step Once
            </button>
          </div>

          {errorMsg ? (
            <div className="bb84-panel" style={{ marginBottom: 14, borderColor: "rgba(255,120,120,0.35)" }}>
              <div className="bb84-panelTitle">Error</div>
              <div className="bb84-muted">{errorMsg}</div>
            </div>
          ) : null}

          <div className="bb84-stage">
            {/* Alice */}
            <div className="bb84-person">
              <div className="bb84-personHeader">
                <AliceIcon />
                <div>
                  <div className="bb84-name">Alice</div>
                  <div className="bb84-role">Receiver of half the pair</div>
                </div>
              </div>

              <div className="bb84-panel">
                <div className="bb84-panelTitle">This Iteration</div>
                {!iteration ? (
                  <div className="bb84-muted">Press “Generate Key” or “Step Once”.</div>
                ) : (
                  <div className="bb84-grid">
                    <div className="bb84-kv">
                      <span>Choices</span>
                      <strong>{iteration.aChoices.map(choiceLabelA).join(" ")}</strong>
                    </div>
                    <div className="bb84-kv">
                      <span>Angles</span>
                      <strong>{iteration.aAngles.map(angleLabel).join(" ")}</strong>
                    </div>
                    <div className="bb84-kv">
                      <span>Measured bits</span>
                      <strong>{iteration.aBits.join("")}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="bb84-panel">
                <div className="bb84-panelTitle">Final Key So Far</div>
                <div className="bb84-keyBox">
                  {aliceKey.length ? aliceKey.join("") : <span className="bb84-muted">—</span>}
                </div>
              </div>
            </div>

            {/* Center: Entanglement + Bell test */}
            <div className="bb84-channel">
              <div className="bb84-channelTitle">Entanglement Source</div>

              <div className="e91-channelLine">
                {/* Center dot/source */}
                <span className="e91-sourceDot" aria-hidden="true" />

                {pairPulses.map((p) => (
                    <span
                    key={p.id}
                    className={`e91-pulse ${p.dir === "L" ? "toLeft" : "toRight"}`}
                    style={{
                        top: laneTops[p.lane],
                        animationDelay: `${p.delay}s`,
                    }}
                    onAnimationEnd={() => removePulse(p.id)}
                    >
                    {p.label}
                    </span>
                ))}
              </div>
              <div className="bb84-matchCard">
                <div className="bb84-panelTitle">Bell / CHSH Test</div>
                {S == null ? (
                  <div className="bb84-muted">Collecting correlations…</div>
                ) : (
                  <>
                    <div className="bb84-kv">
                      <span>CHSH S</span>
                      <strong>{Number(S).toFixed(3)}</strong>
                    </div>
                    <div className="bb84-kv">
                      <span>Verdict</span>
                      <strong>{bellViolated ? "Bell violation ✅" : "No violation ❌"}</strong>
                    </div>
                    <div className="bb84-kv">
                      <span>QBER</span>
                      <strong>{(qber * 100).toFixed(2)}%</strong>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bob */}
            <div className="bb84-person">
              <div className="bb84-personHeader">
                <BobIcon />
                <div>
                  <div className="bb84-name">Bob</div>
                  <div className="bb84-role">Receiver of half the pair</div>
                </div>
              </div>

              <div className="bb84-panel">
                <div className="bb84-panelTitle">This Iteration</div>
                {!iteration ? (
                  <div className="bb84-muted">Press “Generate Key” or “Step Once”.</div>
                ) : (
                  <div className="bb84-grid">
                    <div className="bb84-kv">
                      <span>Choices</span>
                      <strong>{iteration.bChoices.map(choiceLabelB).join(" ")}</strong>
                    </div>
                    <div className="bb84-kv">
                      <span>Angles</span>
                      <strong>{iteration.bAngles.map(angleLabel).join(" ")}</strong>
                    </div>
                    <div className="bb84-kv">
                      <span>Measured bits</span>
                      <strong>{iteration.bBits.join("")}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="bb84-panel">
                <div className="bb84-panelTitle">Final Key So Far</div>
                <div className="bb84-keyBox">
                  {bobKey.length ? bobKey.join("") : <span className="bb84-muted">—</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Log */}
          <div className="bb84-log">
            <div className="bb84-panelTitle">Transparent Output (Console-style)</div>
            <div className="bb84-logBox">
              {log.length ? (
                log.map((line, idx) => (
                  <div key={idx} className="bb84-logLine">{line}</div>
                ))
              ) : (
                <div className="bb84-muted">No output yet.</div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
