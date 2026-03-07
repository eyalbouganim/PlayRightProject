<div align="center">

# PlayRight

**Intelligent Music Practice Platform with Real-Time Performance Analysis**

[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql)](https://www.postgresql.org/)

*Practice smarter with AI-powered performance analysis and real-time feedback*

</div>

---

## About

**PlayRight** is a web application that helps musicians improve through two distinct practice modes. It combines audio analysis, machine learning, and AI feedback to give players meaningful insight into their performance.

---

## Practice Modes

### Performance Mode

Record your performance and receive a full analysis and grade. Under the hood, PlayRight runs an **A2SA (Audio-to-Score Alignment)** pipeline:

1. **Deep Learning Transcription** — A ByteDance AI model transcribes your audio recording into MIDI
2. **HMM Alignment** — A Hidden Markov Model (trained from scratch on the MAESTRO dataset) aligns your performance to the score
3. **GMM Timing Analysis** — A Gaussian Mixture Model (also self-trained) classifies timing deviations into precise, rushed, and delayed components
4. **C++ Processing Engine** — High-performance native C++ tools handle the score-performance matching pipeline
5. **AI Feedback** — Gemini 2.5 Flash generates personalized, actionable feedback based on the detected errors

The result is a grade based on pitch accuracy (70%) and timing accuracy (30%), with a color-coded note-by-note breakdown and AI-written commentary.

### Learn Mode

Practice at your own pace with **real-time note tracking**. The sheet music follows your playing as you go — no grading, no pressure. Designed to help you learn the basics and build muscle memory before moving to performance evaluation.

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
| Analysis | Python, ByteDance ML model, Custom HMM + GMM, C++ pipeline |
| AI Feedback | Google Vertex AI (Gemini 2.5 Flash) |
| Infrastructure | Docker, Google Cloud Run |

---

## Getting Started

### Prerequisites

- Node.js v18+
- Python 3.9+
- PostgreSQL 14+

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

## ML Implementation Notes

The HMM-GMM pipeline in Performance Mode was built and trained independently:

- **[`brain-server/A2SA/python/train_params.py`](brain-server/A2SA/python/train_params.py)** — Trains both the GMM timing model and pitch probability distributions from scratch using the MAESTRO dataset, with domain adaptation (synthetic amateur jitter) to generalize beyond professional recordings.
- **[`brain-server/A2SA/python/align_eife.py`](brain-server/A2SA/python/align_eife.py)** — Orchestrates the full alignment pipeline: runs the ByteDance deep learning transcription model, feeds the output through the C++ HMM tools, and parses the correspondence file to produce per-note timing deviations and pitch correctness scores.

---

## References

The A2SA alignment approach was informed by the academic paper:

> **"Audio-to-Score Alignment Using Deep Automatic Music Transcription"**
> Department of Computer Science, University of Milan

The C++ score-performance matching tools were sourced from their accompanying repository:
[https://github.com/LIMUNIMI/MMSP2021-Audio2ScoreAlignment](https://github.com/LIMUNIMI/MMSP2021-Audio2ScoreAlignment)

The HMM-GMM training, domain adaptation, AI transcription integration, and full analysis pipeline were designed and implemented independently on top of these foundations.
