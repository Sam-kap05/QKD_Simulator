from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Tuple
import uuid
import random

from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator


# Measurement settings (degrees) in X–Z plane.
# We'll map "measure along angle θ" by applying Ry(-2θ) then Z-measure.
ALICE_ANGLES = [0.0, 45.0, 90.0]       # A0, A1 for CHSH; A2 also used
BOB_ANGLES   = [0.0, 22.5, -22.5]      # B0 is key basis (0°), B1/B2 for CHSH

# Key is generated when Alice uses A2 (90°) ??? or we can use A0 (0°) with Bob B0 (0°).
# For simplicity + stable key: use A0=0° and B0=0° as key basis.
KEY_A_IDX = 0
KEY_B_IDX = 0

# CHSH uses:
# a0 = A0 (0°), a1 = A1 (45°)
# b0 = B1 (22.5°), b1 = B2 (-22.5°)
CHSH_A0 = 0
CHSH_A1 = 1
CHSH_B0 = 1
CHSH_B1 = 2


def _ry_measurement_rotation(qc: QuantumCircuit, qubit: int, theta_deg: float):
    # rotation to measure along axis in X–Z plane:
    # Apply Ry(-2θ) then measure Z.
    theta = theta_deg * 3.141592653589793 / 180.0
    qc.ry(-2.0 * theta, qubit)


def _bell_pair_circuit(a_theta: float, b_theta: float) -> QuantumCircuit:
    qc = QuantumCircuit(2, 2)

    # Prepare |Phi+> = (|00> + |11>)/sqrt(2)
    qc.h(0)
    qc.cx(0, 1)

    # Rotate measurement bases
    _ry_measurement_rotation(qc, 0, a_theta)
    _ry_measurement_rotation(qc, 1, b_theta)

    qc.measure(0, 0)
    qc.measure(1, 1)
    return qc


def _sample_pair(sim: AerSimulator, a_theta: float, b_theta: float) -> Tuple[int, int]:
    qc = _bell_pair_circuit(a_theta, b_theta)
    job = sim.run(qc, shots=1)
    counts = job.result().get_counts(qc)
    bitstring = next(iter(counts.keys()))  # e.g. "10" with c1c0 ordering in qiskit counts
    # Qiskit returns classical bits as string with most significant classical bit first.
    # Our classical regs are (c0 for qubit0, c1 for qubit1) but shown as c1c0.
    b1 = int(bitstring[0])
    b0 = int(bitstring[1])
    return b0, b1  # (alice_bit, bob_bit)


def _maybe_flip(bit: int, p: float) -> int:
    return bit ^ 1 if random.random() < p else bit


@dataclass
class E91Session:
    target_n: int
    chunk_size: int
    noise_p: float
    eve_enabled: bool
    eve_strength: float

    iter_no: int = 1
    alice_key: List[int] = field(default_factory=list)
    bob_key: List[int] = field(default_factory=list)

    # error accounting on sifted key
    errors: int = 0

    # correlation tallies for CHSH: map (aIdx,bIdx) -> [sum(product), count]
    # product uses outcomes mapped to ±1 where bit 0->+1, bit 1->-1
    corr_sum: Dict[Tuple[int, int], float] = field(default_factory=dict)
    corr_n: Dict[Tuple[int, int], int] = field(default_factory=dict)


_SESSIONS: Dict[str, E91Session] = {}
_SIM = AerSimulator()


def start_session(target_n: int, chunk_size: int, noise_p: float, eve_enabled: bool, eve_strength: float) -> str:
    sid = str(uuid.uuid4())
    _SESSIONS[sid] = E91Session(
        target_n=target_n,
        chunk_size=chunk_size,
        noise_p=float(noise_p),
        eve_enabled=bool(eve_enabled),
        eve_strength=float(eve_strength),
    )
    return sid


def _outcome_pm1(bit: int) -> int:
    return +1 if bit == 0 else -1


def _update_corr(s: E91Session, a_idx: int, b_idx: int, a_bit: int, b_bit: int):
    key = (a_idx, b_idx)
    prod = _outcome_pm1(a_bit) * _outcome_pm1(b_bit)
    s.corr_sum[key] = s.corr_sum.get(key, 0.0) + prod
    s.corr_n[key] = s.corr_n.get(key, 0) + 1


def _E(s: E91Session, a_idx: int, b_idx: int) -> float | None:
    n = s.corr_n.get((a_idx, b_idx), 0)
    if n == 0:
        return None
    return s.corr_sum[(a_idx, b_idx)] / n


def _compute_CHSH(s: E91Session) -> float | None:
    E_a0b0 = _E(s, CHSH_A0, CHSH_B0)
    E_a0b1 = _E(s, CHSH_A0, CHSH_B1)
    E_a1b0 = _E(s, CHSH_A1, CHSH_B0)
    E_a1b1 = _E(s, CHSH_A1, CHSH_B1)
    if None in (E_a0b0, E_a0b1, E_a1b0, E_a1b1):
        return None
    # S = E(a0,b0) + E(a0,b1) + E(a1,b0) - E(a1,b1)
    return float(E_a0b0 + E_a0b1 + E_a1b0 - E_a1b1)


def step_session(session_id: str) -> Dict:
    if session_id not in _SESSIONS:
        raise KeyError("session not found")
    s = _SESSIONS[session_id]

    # Effective noise: if Eve ON, she reduces entanglement (model as extra flip noise)
    eff_noise = s.noise_p + (s.eve_strength if s.eve_enabled else 0.0)
    eff_noise = max(0.0, min(1.0, eff_noise))

    a_choices: List[int] = [random.randint(0, len(ALICE_ANGLES) - 1) for _ in range(s.chunk_size)]
    b_choices: List[int] = [random.randint(0, len(BOB_ANGLES) - 1) for _ in range(s.chunk_size)]

    a_angles = [ALICE_ANGLES[i] for i in a_choices]
    b_angles = [BOB_ANGLES[i] for i in b_choices]

    a_bits: List[int] = []
    b_bits: List[int] = []

    key_indices: List[int] = []
    a_key_chunk: List[int] = []
    b_key_chunk: List[int] = []

    for i in range(s.chunk_size):
        a_bit, b_bit = _sample_pair(_SIM, a_angles[i], b_angles[i])

        # apply simple classical flip noise model (keeps sim fast + stable)
        a_bit = _maybe_flip(a_bit, eff_noise)
        b_bit = _maybe_flip(b_bit, eff_noise)

        a_bits.append(a_bit)
        b_bits.append(b_bit)

        # update correlation stats for CHSH-relevant pairs
        _update_corr(s, a_choices[i], b_choices[i], a_bit, b_bit)

        # key basis condition
        if a_choices[i] == KEY_A_IDX and b_choices[i] == KEY_B_IDX:
            key_indices.append(i)
            a_key_chunk.append(a_bit)
            b_key_chunk.append(b_bit)

    # ---- enforce exact target length (no overshoot) ----
    remaining = max(0, s.target_n - len(s.bob_key))
    a_key_chunk_final = a_key_chunk[:remaining]
    b_key_chunk_final = b_key_chunk[:remaining]

    s.alice_key.extend(a_key_chunk_final)
    s.bob_key.extend(b_key_chunk_final)

    chunk_errors = sum(1 for a, b in zip(a_key_chunk_final, b_key_chunk_final) if a != b)
    s.errors += chunk_errors

    sifted_len = len(s.bob_key)
    qber = (s.errors / sifted_len) if sifted_len > 0 else 0.0

    S = _compute_CHSH(s)
    bell = (S is not None) and (S > 2.0)

    done = sifted_len >= s.target_n

    payload = {
        "ok": True,
        "iterNo": s.iter_no,
        "chunkSize": s.chunk_size,

        "aChoices": a_choices,
        "aAngles": a_angles,
        "aBits": a_bits,

        "bChoices": b_choices,
        "bAngles": b_angles,
        "bBits": b_bits,

        "keyIndices": key_indices,
        "aKeyChunk": a_key_chunk_final,
        "bKeyChunk": b_key_chunk_final,

        "aliceKeySoFar": s.alice_key,
        "bobKeySoFar": s.bob_key,

        "chunkErrors": chunk_errors,
        "qberSoFar": qber,

        "S": S,
        "bellViolated": bell,

        "done": done,
    }

    s.iter_no += 1
    return payload
