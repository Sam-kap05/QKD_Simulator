# QKD Simulator (BB84 + E91)

An interactive **Quantum Key Distribution (QKD) Simulator** that demonstrates how secure keys can be generated using the **BB84 protocol** and **E91 protocol** 

This project is built to be **interactive**, **visual**, and **step-by-step**, making it useful for demos, assignments, and hands-on-learning.

---

## How to run it

Interested users can go to [https://qkd-simulator.vercel.app/](https://qkd-simulator.vercel.app/) to run the simulator. In the simulator, the user can first select the preferred protocol and enter the key size. The "Generate Key" button will iteratively provide the final length of the key, while the "Step Once" button shows a single iteration.

## Features

- **BB84 QKD Simulation**
  - Choose a target key size
  - Iterative rounds of qubit preparation + measurement
  - Basis matching + sifting to form a raw key
  - Eavesdropping/security check (custom Eve strength + QBER check)
  - Noise simulation (custom depolarizing probability)
  - Special thanks to [Ansh Goel](https://github.com/AnshGoel2425) for inspiration for the BB84 code (Python backend).

- **E91 QKD Simulation**
  - Choose a target key size
  - Generation and distribution of entangled qubit pairs between Alice and Bob
  - Correlation analysis of measurement outcomes
  - Bell inequality (CHSH) and QBER test to detect eavesdropping
  - Noise simulation (custom depolarizing probability)
  - Secure key extraction from strongly correlated measurement results
 
- **Read About Pages**
  - Read in detail about QKD and the protocols implemented in the simulation (BB84 and E91).

- **Interactive UI**
  - Alice ↔ Quantum Channel ↔ Bob visual layout
  - User-defined key sizes, Eve presence and Noise simulation
  - Key progress shown live as iterations run

---

## Tech Stack

**Frontend**
- React (Vite)
- Javascript

**Backend**
- Python API (FastAPI)
- BB84 simulation logic (Python)
- E91 simulation logic (Python)

---
