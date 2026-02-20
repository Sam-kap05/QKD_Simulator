import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// const API_BASE = "http://localhost:5000";
const API_BASE = "https://fastapi-pi-three.vercel.app";
// helpers
const basisLabel = (b) => (b === 0 ? "Z" : "X");
const angleLabel = (a) => `${a}°`;

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

/** ---- Channel qubit helpers ---- */
function angleToKet(angle) {
  if (angle === 0) return "|0⟩";
  if (angle === 90) return "|1⟩";
  if (angle === 45) return "|+⟩";
  return "|−⟩";
}
function isXbasisFromAngle(angle) {
  return angle === 45 || angle === 135;
}

export default function BB84() {
  const navigate = useNavigate();

  const [keySize, setKeySize] = useState(16);
  const [chunkSize, setChunkSize] = useState(4); // matches your python loop "num1=4"
  const [isRunning, setIsRunning] = useState(false);

  const [sessionId, setSessionId] = useState(null);

  // protocol data states
  const [iteration, setIteration] = useState(null);
  const [iterNo, setIterNo] = useState(1);
  const [aliceKey, setAliceKey] = useState([]);
  const [bobKey, setBobKey] = useState([]);
  const [log, setLog] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
    // BB84 extras
  const [noiseP, setNoiseP] = useState(0.0);
  const [eveEnabled, setEveEnabled] = useState(false);
  const [eveInterceptProb, setEveInterceptProb] = useState(1.0);

  const [qber, setQber] = useState(0);
  const [eveDetected, setEveDetected] = useState(false);

  // channel animation state
  const [channelQubits, setChannelQubits] = useState([]);

  // stop/cancel controls for loops
  const runTokenRef = useRef(0);

  const target = useMemo(() => Math.max(1, Number(keySize) || 1), [keySize]);

  const progress = useMemo(() => {
    return Math.min(100, Math.floor((bobKey.length / target) * 100));
  }, [bobKey.length, target]);

  const addLogLines = (lines) =>
    setLog((prev) => [...lines, ...prev].slice(0, 200));

  function resetUIState() {
    setIteration(null);
    setIterNo(1);
    setAliceKey([]);
    setBobKey([]);
    setLog([]);
    setErrorMsg("");
    setChannelQubits([]);
    setQber(0);
    setEveDetected(false);
  }

  function enqueueChannelBatch(data) {
    const batch = (data.aAngle || []).map((angle, i) => ({
      id: `${data.iterNo}-${i}-${crypto.randomUUID?.() ?? Math.random()}`,
      label: angleToKet(angle),
      basis: isXbasisFromAngle(angle) ? "X" : "Z",
      delay: i * 0.55, // stagger
      lane: i % 4,     // 4 lanes
    }));
    setChannelQubits((prev) => [...prev, ...batch]);
  }

  function removeChannelQubit(id) {
    setChannelQubits((prev) => prev.filter((q) => q.id !== id));
  }

  /** ---- API calls ---- */
  async function apiStartBB84({ target_n, chunk_size }) {
    const resp = await fetch(`${API_BASE}/api/bb84/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_n,
        chunk_size,
        noise_p: noiseP,
        eve_enabled: eveEnabled,
        eve_intercept_prob: eveInterceptProb,
      }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      throw new Error(data?.detail || data?.error || "Failed to start session");
    }
    return data.sessionId;
  }


  async function apiStepBB84(sid) {
    const resp = await fetch(`${API_BASE}/api/bb84/step/${sid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      throw new Error(data?.detail || data?.error || "Step failed");
    }
    return data;
  }

  function applyStepToUI(data) {
    // update “current iteration”
    setIteration({
      iterNo: data.iterNo,
      chunkSize: data.chunkSize,
      classical: data.classical,
      aBasis: data.aBasis,
      aAngle: data.aAngle,
      bBasis: data.bBasis,
      bAngle: data.bAngle,
      matched: data.matched,
      aKeyChunk: data.aKeyChunk,
      bKeyChunk: data.bKeyChunk,
    });

    setIterNo((n) => Math.max(n, (data.iterNo || n) + 1));

    // keys (authoritative from backend)
    setAliceKey(data.aliceKeySoFar || []);
    setBobKey(data.bobKeySoFar || []);

    const a = data.aliceKeySoFar || [];
    const b = data.bobKeySoFar || [];
    const L = Math.min(a.length, b.length);
    let errs = 0;
    for (let i = 0; i < L; i++) if (a[i] !== b[i]) errs++;
    const qberFrontend = L ? errs / L : 0;
    setQber(data.qberSoFar ?? qberFrontend);

    // qubit visuals for this chunk
    enqueueChannelBatch(data);

    // logs: match your python print style
    addLogLines([
      `--------- Iteration ${data.iterNo} ---------`,
      `Classical string (Alice): ${(data.classical || []).join("")}`,
      `Basis chosen by Alice: ${(data.aBasis || []).map(basisLabel).join(" ")}`,
      `Quantum states sent by Alice (angles): ${(data.aAngle || []).map(angleLabel).join(" ")}`,
      `Basis chosen by Bob: ${(data.bBasis || []).map(basisLabel).join(" ")}`,
      `Angle of polarized films used by Bob: ${(data.bAngle || []).map(angleLabel).join(" ")}`,
      `Basis matched at: [${(data.matched || []).join(", ")}]`,
      `Matched (sifted) bits this iter: ${data.matchedCount ?? 0}`,
      `Revealed for QBER (discarded): ${data.testCount ?? 0} (errors: ${data.testErrors ?? 0})`,
      `Alice’s final key so far: ${(data.aliceKeySoFar || []).join("")}`,
      `Bob’s final key so far:   ${(data.bobKeySoFar || []).join("")}`,
    ]);
        // Eve transparency + QBER
    if (data.eveEnabled) {
      const eveLine = (data.eveInfo || [])
        .map((x, i) => {
          if (!x?.intercepted) return `${i}:—`;
          const b = x.eveBasis === 1 ? "X" : "Z";
          return `${i}:${b}${x.eveMeasured}`;
        })
        .join("  ");
      addLogLines([`Eve (idx:basis+bit): ${eveLine}`]);
    }
    addLogLines([
      `Chunk errors: ${data.chunkErrors ?? 0} | QBER so far: ${((data.qberSoFar ?? 0) * 100).toFixed(2)}%`,
      data.eveDetected ? `⚠ WARNING: QBER exceeded 11% — protocol should ABORT and discard key.` : ``,
    ].filter(Boolean));
  }

  /** ---- actions ---- */
  async function handleGenerate() {
    // increment run token to invalidate any previous loops
    const myToken = ++runTokenRef.current;

    setIsRunning(true);
    resetUIState();

    try {
      const sid = await apiStartBB84({ target_n: target, chunk_size: chunkSize });
      setSessionId(sid);

      addLogLines([`Target key size: ${target}`, `Session started: ${sid}`]);

      // loop steps until done (backend tells done)
      while (runTokenRef.current === myToken) {
        const data = await apiStepBB84(sid);
        applyStepToUI(data);

        if (data.done) break;

        // delay for visibility/animation
        await new Promise((r) => setTimeout(r, 650));
      }
    } catch (e) {
      setErrorMsg(String(e?.message || e));
    } finally {
      // only stop if this is still the active run
      if (runTokenRef.current === myToken) setIsRunning(false);
    }
  }

  async function handleStepOnce() {
    // invalidate any running loop
    ++runTokenRef.current;
    setIsRunning(false);

    try {
      setErrorMsg("");

      let sid = sessionId;
      if (!sid) {
        // Start a new session if none exists yet
        resetUIState();
        sid = await apiStartBB84({ target_n: target, chunk_size: chunkSize });
        setSessionId(sid);
        addLogLines([`Target key size: ${target}`, `Session started: ${sid}`]);
      }

      const data = await apiStepBB84(sid);
      applyStepToUI(data);
    } catch (e) {
      setErrorMsg(String(e?.message || e));
    }
  }

  function handleReset() {
    ++runTokenRef.current; // stop any loop
    setIsRunning(false);
    setSessionId(null);
    resetUIState();
  }

  const laneTops = ["28%", "44%", "60%", "76%"];

  return (
    <div className="qc-page">
      <div className="qc-bgGradient" aria-hidden="true" />
      <div className="qc-bgGrid" aria-hidden="true" />
      <div className="qc-bgGlow" aria-hidden="true" />

      <main className="qc-shell">
        <section className="qc-card qc-cardWide">
          <div className="qc-topbar">
            <button className="qc-linkBtn" onClick={() => navigate("/")}>
              ← Home
            </button>

            <div className="qc-chipRow">
              <span className="qc-chip">Protocol: BB84</span>
              <span className="qc-chip">Iterations: {Math.max(0, iterNo - 1)}</span>
              <span className="qc-chip">
                Key Progress: {bobKey.length}/{target} ({progress}%)
              <span className="qc-chip">QBER: {(qber * 100).toFixed(2)}%</span>
              <span className="qc-chip">Noise p: {Number(noiseP).toFixed(2)}</span>
              <span className="qc-chip">Eve: {eveEnabled ? "ON" : "OFF"}</span>
              {eveDetected ? (
                <span className="qc-chip" style={{ borderColor: "rgba(255,120,120,0.65)" }}>
                  ⚠ Eve Detected
                </span>
              ) : null}
              </span>
            </div>
          </div>

          <h1 className="qc-title qc-titleSm">BB84 Simulator</h1>
          <p className="qc-subtitle">
            Enter target key size, then generate. Each iteration shows Alice’s random bits, basis choices,
            polarization angles, Bob’s measurement basis, matched indices, and both keys building up.
          </p>

          <div className="bb84-controls">
            <label className="bb84-field">
              <span className="bb84-label">Target Key Size</span>
              <input
                className="bb84-input"
                type="number"
                min={1}
                step={1}
                value={keySize}
                onChange={(e) => setKeySize(e.target.value)}
                disabled={isRunning}
              />
            </label>

            <label className="bb84-field" style={{ minWidth: 160 }}>
              <span className="bb84-label">Chunk Size</span>
              <input
                className="bb84-input"
                type="number"
                min={1}
                step={1}
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value))}
                disabled={isRunning}
              />
            </label>
                        <label className="bb84-field" style={{ minWidth: 200 }}>
              <span className="bb84-label">Noise (depolarizing p)</span>
              <input
                className="bb84-input"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={noiseP}
                onChange={(e) => setNoiseP(Number(e.target.value))}
                disabled={isRunning}
              />
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
                <span className="bb84-muted">{eveEnabled ? "Intercept-Resend ON" : "OFF"}</span>
              </div>
            </label>

            <label className="bb84-field" style={{ minWidth: 220 }}>
              <span className="bb84-label">Eve intercept probability</span>
              <input
                className="bb84-input"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={eveInterceptProb}
                onChange={(e) => setEveInterceptProb(Number(e.target.value))}
                disabled={isRunning || !eveEnabled}
              />
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
                  <div className="bb84-role">Sender</div>
                </div>
              </div>

              <div className="bb84-panel">
                <div className="bb84-panelTitle">This Iteration</div>
                {!iteration ? (
                  <div className="bb84-muted">Press “Generate Key” or “Step Once”.</div>
                ) : (
                  <div className="bb84-grid">
                    <div className="bb84-kv">
                      <span>Classical bits</span>
                      <strong>{iteration.classical.join(" ")}</strong>
                    </div>
                    <div className="bb84-kv">
                      <span>Basis</span>
                      <strong>{iteration.aBasis.map(basisLabel).join(" ")}</strong>
                    </div>
                    <div className="bb84-kv">
                      <span>Angles</span>
                      <strong>{iteration.aAngle.map(angleLabel).join(" ")}</strong>
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

            {/* Channel */}
            <div className="bb84-channel">
              <div className="bb84-channelTitle">Quantum Channel</div>

              <div className="bb84-channelLine">
                {channelQubits.map((q) => (
                  <span
                    key={q.id}
                    className={`bb84-qubit ${q.basis === "X" ? "xBasis" : "zBasis"}`}
                    style={{
                      animationDelay: `${q.delay}s`,
                      top: laneTops[q.lane],
                    }}
                    onAnimationEnd={() => removeChannelQubit(q.id)}
                  >
                    {q.label}
                  </span>
                ))}
              </div>

              <div className="bb84-matchCard">
                <div className="bb84-panelTitle">Basis Matching</div>
                {!iteration ? (
                  <div className="bb84-muted">Waiting for iteration…</div>
                ) : (
                  <>
                    <div className="bb84-kv">
                      <span>Matched indices</span>
                      <strong>[{iteration.matched.join(", ")}]</strong>
                    </div>
                    <div className="bb84-kv">
                      <span>Kept bits (chunk)</span>
                      <strong>{iteration.aKeyChunk.join("") || "—"}</strong>
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
                  <div className="bb84-role">Receiver</div>
                </div>
              </div>

              <div className="bb84-panel">
                <div className="bb84-panelTitle">This Iteration</div>
                {!iteration ? (
                  <div className="bb84-muted">Press “Generate Key” or “Step Once”.</div>
                ) : (
                  <div className="bb84-grid">
                    <div className="bb84-kv">
                      <span>Basis</span>
                      <strong>{iteration.bBasis.map(basisLabel).join(" ")}</strong>
                    </div>
                    <div className="bb84-kv">
                      <span>Film angles</span>
                      <strong>{iteration.bAngle.map(angleLabel).join(" ")}</strong>
                    </div>
                    <div className="bb84-kv">
                      <span>Measured bits (kept)</span>
                      <strong>{iteration.bKeyChunk.join("") || "—"}</strong>
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
                  <div key={idx} className="bb84-logLine">
                    {line}
                  </div>
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
