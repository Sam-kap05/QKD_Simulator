import uuid
import random
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional

from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit_aer.noise import NoiseModel, depolarizing_error
TEST_FRACTION = 0.20

# -----------------------------
# Noise model (depolarizing)
# -----------------------------
def build_noise_model(p: float) -> Optional[NoiseModel]:
    if p is None or p <= 0:
        return None
    p = float(p)
    nm = NoiseModel()

    # depolarizing error on 1-qubit gates
    err1 = depolarizing_error(p, 1)
    nm.add_all_qubit_quantum_error(err1, ["x", "h", "id"])
    return nm


def rand_bit() -> int:
    return 1 if random.random() < 0.5 else 0


def rand_basis() -> int:
    # 0 = Z, 1 = X
    return 1 if random.random() < 0.5 else 0


def basis_label(b: int) -> str:
    return "X" if b == 1 else "Z"


def encode_angle(bit: int, basis: int) -> int:
    # matches your original mapping
    # Z: 0->0°, 1->90° ; X: 0->45°, 1->135°
    if bit == 0 and basis == 0: return 0
    if bit == 1 and basis == 0: return 90
    if bit == 0 and basis == 1: return 45
    return 135


def prepare_state_circuit(bit: int, basis: int) -> QuantumCircuit:
    """
    Correct BB84 state prep on |0>:
      Z basis: bit 0 -> |0>, bit 1 -> |1>
      X basis: bit 0 -> |+>, bit 1 -> |->
    """
    qc = QuantumCircuit(1, 1)

    if basis == 0:
        # Z basis
        if bit == 1:
            qc.x(0)
    else:
        # X basis
        qc.h(0)          # |+>
        if bit == 1:
            qc.z(0)      # Z|+> = |->
            # (alternative also correct: qc.x(0); qc.h(0) with X before H)

    return qc

def measure_with_basis(qc: QuantumCircuit, meas_basis: int) -> QuantumCircuit:
    """
    Measure in Z or X basis.
    X basis measurement = H then measure in Z.
    """
    qc2 = qc.copy()
    if meas_basis == 1:
        qc2.h(0)
    qc2.measure(0, 0)
    return qc2


def run_single_shot(qc: QuantumCircuit, noise_model: Optional[NoiseModel]) -> int:
    sim = AerSimulator(noise_model=noise_model) if noise_model else AerSimulator()
    job = sim.run(qc, shots=1)
    result = job.result()
    counts = result.get_counts()
    # counts keys are '0' or '1'
    bit_str = next(iter(counts.keys()))
    return int(bit_str)


def eve_intercept_resend(
    alice_bit: int,
    alice_basis: int,
    noise_model: Optional[NoiseModel],
    intercept_prob: float,
) -> Dict[str, Any]:
    """
    Eve chooses a random basis, measures the incoming qubit (1 shot),
    then re-prepares a qubit with her measurement outcome in her basis.
    """
    did_intercept = random.random() < intercept_prob
    if not did_intercept:
        return {
            "intercepted": False,
            "eveBasis": None,
            "eveMeasured": None,
            "postBit": alice_bit,
            "postBasis": alice_basis,
        }

    eve_basis = rand_basis()

    # Eve measures Alice-prepared state
    prep = prepare_state_circuit(alice_bit, alice_basis)
    eve_meas_circ = measure_with_basis(prep, eve_basis)
    eve_bit = run_single_shot(eve_meas_circ, noise_model)

    # Eve resends her measured bit encoded in her basis
    return {
        "intercepted": True,
        "eveBasis": eve_basis,
        "eveMeasured": eve_bit,
        "postBit": eve_bit,
        "postBasis": eve_basis,
    }


def bob_measure(
    sent_bit: int,
    sent_basis: int,
    bob_basis: int,
    noise_model: Optional[NoiseModel],
) -> int:
    prep = prepare_state_circuit(sent_bit, sent_basis)
    bob_meas_circ = measure_with_basis(prep, bob_basis)
    return run_single_shot(bob_meas_circ, noise_model)


@dataclass
class BB84Session:
    target_n: int
    chunk_size: int
    noise_p: float
    eve_enabled: bool
    eve_intercept_prob: float

    iter_no: int = 1
    alice_key: List[int] = field(default_factory=list)   # sifted key so far (Alice)
    bob_key: List[int] = field(default_factory=list)     # sifted key so far (Bob)
    # QBER is estimated from revealed test bits ONLY (protocol-loyal)
    test_bits_total: int = 0
    test_bits_errors: int = 0
    # mismatches so far in sifted


SESSIONS: Dict[str, BB84Session] = {}


def create_session(
    target_n: int,
    chunk_size: int = 4,
    noise_p: float = 0.0,
    eve_enabled: bool = False,
    eve_intercept_prob: float = 1.0,
) -> str:
    sid = str(uuid.uuid4())
    SESSIONS[sid] = BB84Session(
        target_n=target_n,
        chunk_size=chunk_size,
        noise_p=float(noise_p or 0.0),
        eve_enabled=bool(eve_enabled),
        eve_intercept_prob=float(eve_intercept_prob if eve_intercept_prob is not None else 1.0),
    )
    return sid


def step_bb84(session_id: str) -> Dict[str, Any]:
    if session_id not in SESSIONS:
        return {"ok": False, "error": "Invalid session id"}

    s = SESSIONS[session_id]
    nm = build_noise_model(s.noise_p)

    n = s.chunk_size

    classical = [rand_bit() for _ in range(n)]
    a_basis = [rand_basis() for _ in range(n)]
    a_angle = [encode_angle(bit, bas) for bit, bas in zip(classical, a_basis)]

    b_basis = [rand_basis() for _ in range(n)]
    # purely for display like your UI
    b_angle = [135 if b == 1 else 90 for b in b_basis]

    matched = []
    a_key_chunk: List[int] = []
    b_key_chunk: List[int] = []

    eve_info = []  # per-qubit transparency

    for i in range(n):
        alice_bit = classical[i]
        alice_bas = a_basis[i]

        sent_bit = alice_bit
        sent_basis = alice_bas

        eve_item = {"intercepted": False, "eveBasis": None, "eveMeasured": None}
        if s.eve_enabled:
            eve_result = eve_intercept_resend(
                alice_bit=alice_bit,
                alice_basis=alice_bas,
                noise_model=nm,
                intercept_prob=s.eve_intercept_prob,
            )
            sent_bit = eve_result["postBit"]
            sent_basis = eve_result["postBasis"]
            eve_item = {
                "intercepted": eve_result["intercepted"],
                "eveBasis": eve_result["eveBasis"],
                "eveMeasured": eve_result["eveMeasured"],
            }
        eve_info.append(eve_item)

        # Bob measures what he receives
        bob_bit = bob_measure(
            sent_bit=sent_bit,
            sent_basis=sent_basis,
            bob_basis=b_basis[i],
            noise_model=nm,
        )

        # sifting: keep only when bases match (Alice basis vs Bob basis)
        if a_basis[i] == b_basis[i]:
            matched.append(i)
            a_key_chunk.append(alice_bit)
            b_key_chunk.append(bob_bit)

    # ---- enforce exact target length (no overshoot) ----
    # -----------------------------
    # QBER sampling (protocol-loyal)
    # reveal TEST_FRACTION of sifted bits, DISCARD them, keep rest as raw key
    # -----------------------------
    m = len(a_key_chunk)  # number of matched/sifted bits in this iteration

    if m == 0:
        num_test = 0
    else:
        # 20% of m, but at least 1 whenever we have any sifted bits
        num_test = max(1, int(round(TEST_FRACTION * m)))
    test_pos = set(random.sample(range(m), num_test)) if num_test > 0 else set()

    # revealed bits (discarded)
    test_a = [a_key_chunk[j] for j in test_pos]
    test_b = [b_key_chunk[j] for j in test_pos]
    test_errors = sum(1 for a, b in zip(test_a, test_b) if a != b)
    test_total = len(test_a)

    # remaining bits become key material
    a_key_kept = [a_key_chunk[j] for j in range(m) if j not in test_pos]
    b_key_kept = [b_key_chunk[j] for j in range(m) if j not in test_pos]

    # ---- enforce exact target length (no overshoot) ----
    remaining = max(0, s.target_n - len(s.bob_key))
    if remaining == 0:
        a_key_chunk_final = []
        b_key_chunk_final = []
    else:
        a_key_chunk_final = a_key_kept[:remaining]
        b_key_chunk_final = b_key_kept[:remaining]

    # update session keys with NON-REVEALED bits only
    s.alice_key.extend(a_key_chunk_final)
    s.bob_key.extend(b_key_chunk_final)

    # update QBER stats using REVEALED bits only
    s.test_bits_total += test_total
    s.test_bits_errors += test_errors

    qber = (s.test_bits_errors / s.test_bits_total) if s.test_bits_total > 0 else 0.0
    eve_detected = qber > 0.11

    sifted_len = len(s.bob_key)

    payload = {
        "ok": True,
        "sessionId": session_id,
        "iterNo": s.iter_no,
        "chunkSize": n,

        "classical": classical,
        "aBasis": a_basis,
        "aAngle": a_angle,

        "bBasis": b_basis,
        "bAngle": b_angle,

        "matched": matched,

        # For transparency: these are the bits kept AFTER discarding test bits
        "aKeyChunk": a_key_chunk_final,
        "bKeyChunk": b_key_chunk_final,

        "aliceKeySoFar": s.alice_key,
        "bobKeySoFar": s.bob_key,

        # New transparency fields for the QBER sampling step
        "matchedCount": m,
        "testFraction": TEST_FRACTION,
        "testCount": test_total,
        "testErrors": test_errors,
        "testPosInSifted": sorted(list(test_pos)),  # positions within sifted chunk (0..m-1)

        "testBitsTotalSoFar": s.test_bits_total,
        "testBitsErrorsSoFar": s.test_bits_errors,
        "qberSoFar": qber,
        "eveDetected": eve_detected,

        "noiseP": s.noise_p,
        "eveEnabled": s.eve_enabled,
        "eveInterceptProb": s.eve_intercept_prob,
        "eveInfo": eve_info,

        "targetN": s.target_n,
        "done": sifted_len >= s.target_n,
    }

    s.iter_no += 1
    return payload
