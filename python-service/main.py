from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from bb84_engine import create_session, step_bb84
from e91_engine import start_session as e91_start_session, step_session as e91_step_session

app = FastAPI(title="QKD Protocol Engine", version="0.2.0")


# ---------------- BB84 ----------------
class BB84StartReq(BaseModel):
    target_n: int = Field(ge=1)
    chunk_size: int = Field(default=4, ge=1)
    noise_p: float = Field(default=0.0, ge=0.0, le=1.0)
    eve_enabled: bool = False
    eve_intercept_prob: float = Field(default=1.0, ge=0.0, le=1.0)


@app.get("/health")
def health():
    return {"ok": True, "service": "python-protocol-engine"}


@app.post("/bb84/start")
def bb84_start(req: BB84StartReq):
    sid = create_session(
        target_n=req.target_n,
        chunk_size=req.chunk_size,
        noise_p=req.noise_p,
        eve_enabled=req.eve_enabled,
        eve_intercept_prob=req.eve_intercept_prob,
    )
    return {"ok": True, "sessionId": sid}


@app.post("/bb84/step/{session_id}")
def bb84_step(session_id: str):
    data = step_bb84(session_id)
    if not data.get("ok"):
        raise HTTPException(status_code=404, detail=data.get("error", "Invalid session id"))
    return data


# ---------------- E91 ----------------
class E91StartReq(BaseModel):
    target_n: int = Field(ge=1)
    chunk_size: int = Field(default=12, ge=1)
    noise_p: float = Field(default=0.0, ge=0.0, le=1.0)
    eve_enabled: bool = False
    eve_strength: float = Field(default=0.35, ge=0.0, le=1.0)


@app.post("/e91/start")
def e91_start(req: E91StartReq):
    sid = e91_start_session(
        target_n=req.target_n,
        chunk_size=req.chunk_size,
        noise_p=req.noise_p,
        eve_enabled=req.eve_enabled,
        eve_strength=req.eve_strength,
    )
    return {"ok": True, "sessionId": sid}


@app.post("/e91/step/{session_id}")
def e91_step(session_id: str):
    try:
        return e91_step_session(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="session not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
        
from fastapi.middleware.cors import CORSMiddleware

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://qkd-simulator-1.onrender.com/",
    # If you have a custom domain, add it too:
    # "https://yourdomain.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,  # keep False unless you use cookies/auth
    allow_methods=["*"],
    allow_headers=["*"],
)
