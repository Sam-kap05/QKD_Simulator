import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

const PYTHON_BASE_URL = process.env.PYTHON_BASE_URL || "http://localhost:8000";

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "node-gateway" });
});

// generic forwarder (optional)
app.post("/api/simulate/:protocol", async (req, res) => {
  const { protocol } = req.params;
  try {
    const resp = await fetch(`${PYTHON_BASE_URL}/simulate/${protocol}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {})
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// --- BB84 ---
app.post("/api/bb84/start", async (req, res) => {
  try {
    const resp = await fetch(`${PYTHON_BASE_URL}/bb84/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {})
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/api/bb84/step/:sid", async (req, res) => {
  try {
    const resp = await fetch(`${PYTHON_BASE_URL}/bb84/step/${req.params.sid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// --- E91 ---
app.post("/api/e91/start", async (req, res) => {
  try {
    const resp = await fetch(`${PYTHON_BASE_URL}/e91/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {})
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/api/e91/step/:sid", async (req, res) => {
  try {
    const resp = await fetch(`${PYTHON_BASE_URL}/e91/step/${req.params.sid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Node gateway running on http://localhost:${PORT}`));
