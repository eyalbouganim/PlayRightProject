<div align="center">

# PlayRight

**Intelligent Music Practice Platform with Real-Time Performance Analysis**

[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python)](https://www.python.org/)
[![C++](https://img.shields.io/badge/C%2B%2B-17+-00599C?style=flat-square&logo=c%2B%2B&logoColor=white)](https://isocpp.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![Google Cloud](https://img.shields.io/badge/Google%20Cloud-Cloud%20Run-4285F4?style=flat-square&logo=googlecloud&logoColor=white)](https://cloud.google.com/run)
[![Vertex AI](https://img.shields.io/badge/Vertex%20AI-Gemini%202.5%20Flash-DB4437?style=flat-square&logo=googlecloud&logoColor=white)](https://cloud.google.com/vertex-ai)
[![NVIDIA L4](https://img.shields.io/badge/NVIDIA-L4%20GPU-76B900?style=flat-square&logo=nvidia&logoColor=white)](https://cloud.google.com/compute/docs/gpus)

*Practice smarter with AI-powered performance analysis and real-time feedback*

**[Try it live →](https://frontend-1013568186744.us-central1.run.app/login)**

</div>

---

## About

**PlayRight** is a web application that helps musicians improve through two distinct practice modes. It combines audio analysis, machine learning, and AI feedback to give players meaningful insight into their performance.

The entire application is **containerized with Docker** (three services: React frontend, Node.js backend, Python analysis engine) and **deployed on Google Cloud Run**. The analysis engine runs on an **NVIDIA L4 GPU** via Google Cloud for fast deep learning inference, and AI feedback is powered by **Google Vertex AI (Gemini 2.5 Flash)**.

---

## Practice Modes

### Performance Mode

Record your performance and receive a full analysis and a grade. Under the hood, PlayRight runs a custom **A2SA (Audio-to-Score Alignment)** pipeline:

**Step 1 — Deep Learning Transcription**
The raw audio recording is passed through a ByteDance deep learning model that transcribes it into a performance MIDI file. The model runs on GPU when available and falls back to CPU automatically — on the live deployment this runs on an **NVIDIA L4 GPU** via Google Cloud Run for fast inference.

**Step 2 — Modified C++ HMM Alignment Engine**
Both the score MIDI and the transcribed performance MIDI are fed through a multi-stage C++ pipeline. The C++ engine originates from the academic paper referenced below, but was **significantly modified** to replace its hardcoded parameters with a trained ML model (see Step 3). The pipeline runs in order:
- `midi2pianoroll` — converts both MIDIs to sparse piano roll format
- `SprToFmt3x` / `Fmt3xToHmm` — builds the HMM observation model from the score
- `ScorePerfmMatcher` — initial Viterbi-based alignment of performance to score
- `ErrorDetection` — flags notes where alignment is suspect
- `RealignmentMOHMM` — second-pass alignment using a Multi-Observation HMM (MOHMM) to recover from initial errors
- `MatchToCorresp` — produces the final note correspondence file

The C++ `ScoreFollower` class was modified to load `learned_params.config` at startup and use the trained GMM in **three distinct places** within its Viterbi algorithm:
1. **Kalman filter initialization** — the GMM's weighted variance directly sets `Sig_t`, the measurement noise covariance used for real-time tempo tracking
2. **Per-note likelihood (`UpdateLike`)** — the GMM replaces the original hardcoded single Gaussian when computing inter-onset interval probabilities during alignment
3. **Pitch backtracking** — the learned pitch probabilities replace hardcoded values during Viterbi state selection

**Step 3 — Self-Trained GMM + Domain Adaptation** *(train_params.py)*
The parameters injected into the C++ engine are produced by training a **3-component Gaussian Mixture Model from scratch** on the MAESTRO dataset (professional piano recordings), with a critical addition: **domain adaptation**. Since MAESTRO contains expert performances, synthetic Gaussian jitter (σ=60ms) is injected into each note's timing deviation to simulate amateur playing. Without this, the HMM would be calibrated for concert pianists and would reject real users' notes as misaligned.

The GMM learns three distinct timing behaviors from this adapted data:
- **Component 1**: Precise notes (near-zero deviation)
- **Component 2**: Rushed notes (negative mean)
- **Component 3**: Delayed notes (positive mean)

A pitch error probability model is also built — modeling the likelihood of correct notes, semitone slips (±1), and octave slips (±12) — aligned to the exact 5 error categories the C++ tools use internally.

Once training completes, all parameters are written to `learned_params.config` inside the `cpp/` directory. When `align_eife.py` runs an analysis, it automatically copies this file into a sandboxed temp directory alongside the C++ binaries, so the engine picks it up transparently at startup with no manual intervention. The GMM is validated with **5-fold cross-validation** before the config is written.

**Step 4 — Tempo-Aware Timing Deviation (align_eife.py)**
After the C++ tools produce a note correspondence file, the Python layer computes a **strict pitch check** (the transcribed pitch must exactly match the score pitch to count as played) and calculates a **tempo-aware timing deviation** for each note. Rather than measuring raw time offset, a local linear regression is fit over a sliding window of ±2 neighboring aligned notes, modeling the local tempo. Each note's deviation is then the residual from that local tempo prediction — meaning the score reports how early or late a note is *relative to the player's own tempo*, not a fixed grid. This signed deviation (negative = rushed, positive = delayed) is what drives the color-coded note feedback in the UI.

Finally, time warping via linear interpolation maps all score notes — including missed ones — onto the performance timeline for display.

**Step 5 — AI Feedback**
After receiving a score and a detailed analysis consisting of the played notes in comparison to the sheet music, the user is able to receive tips for improvement from  **Gemini 2.5 Flash**, which generates personalized written feedback identifying patterns like rushing, hesitation, or consistent missed notes, with actionable practice recommendations.

**Result**: A grade based on pitch accuracy (70%) and timing accuracy (30%), a color-coded note-by-note breakdown (Perfect / Good / Imprecise / Missed), and AI-written commentary.

---

### Learn Mode

Practice at your own pace with **real-time note tracking**. The sheet music follows your playing as you go — no grading, no pressure. Designed to help you learn the basics and build muscle memory before moving to performance evaluation. Mostly scales for your left and right hand to get to know piano basics.

---

## Pages & Features

### Statistics
A full performance history dashboard. Shows three summary cards at the top — total sessions, average score, and personal best (song + score). Below that, a filterable table of every past performance with columns for date, song, overall score (color-coded chip), pitch accuracy, and timing accuracy. Each row has a **"View AI Feedback"** button that fetches and displays the Gemini-generated feedback for that specific session in a modal — cached locally so repeat views don't re-fetch.

Filters: by song name, and by score band (Excellent / Good / Fair / Needs Improvement).

### Journal
A personal practice tracker with three panels side by side:

- **The Whiteboard** — an editable weekly goal with a checkbox to mark it achieved (triggers a confetti animation). Below the goal: a practice streak counter and a **GitHub-style contribution heatmap** showing which days you practiced. Mini stats at the bottom: total sessions, number of personal bests, average score.
- **Personal Notes** — freeform notes for thoughts and reflections, with add/edit/delete. Persisted to localStorage.
- **Wish List** — songs to learn and skills to develop, also add/edit/delete, also persisted.

Below the three panels: a **Personal Bests** gallery showing every performance that scored above 85%, displayed as cards with per-performance notes. Paginated with a "Show More" button.

### Music Library
A searchable card grid of all available songs. Each card shows the song image, title, composer, and a difficulty chip (Easy / Medium / Hard). Searching by title or composer filters in real time. Clicking **Practice** on a card navigates directly to Performance Mode or Learn Mode depending on the song type — no extra steps needed. Users can also upload their own songs in MusicXML format.

### Help & Tutorials
An accordion FAQ covering:
- **Microphone setup** — browser permissions, environment tips, optimal distance
- **Feedback color guide** — Green (perfect), Orange (close), Red (missed)
- **Reading your statistics** — how to interpret accuracy score and pitch consistency
- **Troubleshooting** — mic not detected, laggy feedback

---

## Screenshots

### Home

<img width="1902" height="907" alt="Home" src="https://github.com/user-attachments/assets/df484b44-92da-4513-8b5f-497149e00fd6" />

### Performance Mode

<img width="1897" height="906" alt="PlayRightPerformance" src="https://github.com/user-attachments/assets/5e8a1d23-1f1c-4fba-bf31-0e651eb881d3" />

### Analysis Results

<img width="1908" height="905" alt="PlayRightAnalysis" src="https://github.com/user-attachments/assets/1b5b4f48-9fda-40dd-9a96-f79accd98033" />

<img width="1188" height="846" alt="PlayRightAIFeedback" src="https://github.com/user-attachments/assets/3dd69ebe-a474-48bd-a5d6-f9e5506826a4" />

### Statistics Dashboard

<img width="1900" height="906" alt="Statistics" src="https://github.com/user-attachments/assets/b529cf96-40bd-4713-b15c-d3e59176d40a" />

### Learn Mode

<img width="1896" height="902" alt="LearnMode" src="https://github.com/user-attachments/assets/6f2ec6d3-fcee-4946-8385-8336d64e1a6a" />

---

## Technology Stack

| Layer | Stack |
|---|---|
| Frontend | React 18, Material-UI v5, OpenSheetMusicDisplay, Web Audio API |
| Backend | Node.js, Express, PostgreSQL, Sequelize, JWT |
| Analysis | Python, ByteDance deep learning model, Custom GMM (MAESTRO-trained), C++ HMM pipeline |
| AI Feedback | Google Vertex AI — Gemini 2.5 Flash |
| Infrastructure | Docker, Docker Compose, Google Cloud Run |
| GPU | NVIDIA L4 (Google Cloud) — used for deep learning audio transcription |

---

## Getting Started

### Prerequisites

- Node.js v18+
- Python 3.9+
- PostgreSQL 14+
- C++ compiled binaries — the A2SA alignment tools (`ScorePerfmMatcher`, `RealignmentMOHMM`, etc.) are based on [LIMUNIMI/MMSP2021-Audio2ScoreAlignment](https://github.com/LIMUNIMI/MMSP2021-Audio2ScoreAlignment) with modifications to `ScoreFollower.hpp` for GMM integration; compiled binaries must be present in `brain-server/A2SA/cpp/`

### Installation

```bash
git clone https://github.com/eyalbouganim/PlayRightProject.git
cd PlayRightProject
```

**Backend:**
```bash
cd node-server
npm install
```

Create `node-server/.env`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=playright_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
PORT=3001
GCP_PROJECT_ID=your-gcp-project-id
GCP_LOCATION=us-central1
```

**Brain server:**
```bash
cd brain-server
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

**Frontend:**
```bash
cd my-app
npm install
```

### Running

```bash
# Terminal 1
cd node-server && npm start

# Terminal 2
cd my-app && npm start
```

App runs at `http://localhost:3002`, API at `http://localhost:3001`.

---

## References

The A2SA alignment approach was informed by the academic paper:

> **"Audio-to-Score Alignment Using Deep Automatic Music Transcription"**
> Department of Computer Science, University of Milan

The original C++ score-performance matching tools were sourced from their accompanying repository:
[https://github.com/LIMUNIMI/MMSP2021-Audio2ScoreAlignment](https://github.com/LIMUNIMI/MMSP2021-Audio2ScoreAlignment)

The C++ `ScoreFollower` class was then **modified** to replace hardcoded single-Gaussian timing and fixed pitch probabilities with a trained ML model. The GMM training pipeline (with domain adaptation), the pitch error probability model, the `learned_params.config` integration, the ByteDance transcription model integration, the tempo-aware timing deviation algorithm, and the full end-to-end analysis orchestration were all designed and implemented independently on top of these foundations.
