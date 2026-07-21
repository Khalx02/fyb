# 🍫 CacaoLens — Cocoa Farming AI Assistant & Disease Diagnostic Engine

[![Deployment Status](https://img.shields.io/badge/Render-Live%20🎉-emerald)](https://fyb-oko9.onrender.com)
[![Model Accuracy](https://img.shields.io/badge/Model%20Accuracy-95.03%25-brightgreen)](MODEL_DOCUMENTATION.md)
[![Python Version](https://img.shields.io/badge/Python-3.10%2B-blue)](python_model/)
[![Node Version](https://img.shields.io/badge/Node-20.x-green)](server.ts)

**CacaoLens** is an AI-powered agricultural intelligence platform designed for smallholder cocoa farmers. By analyzing field photos, voice notes, and crop observations, CacaoLens provides real-time diagnostic evaluation for cocoa pod ripeness, yield estimation, and fungal disease management (*Black Pod Rot* & *Frosty Pod Rot*).

---

## 📖 Complete Documentation
For an in-depth, self-explanatory guide covering every technical term, mathematical formula, and step of our AI model, read:
👉 **[MODEL_DOCUMENTATION.md](MODEL_DOCUMENTATION.md)**

---

## 🌟 Key Features
- **12-Step AI Pipeline**: Automated image validation (blur detection), HSV color space conversion, pod bounding-box localization, and ripeness classification.
- **Pretrained MobileNetV3 Backbone**: Deep spatial feature extraction powered by PyTorch `mobilenet_v3_small`.
- **Soft Voting Ensemble Classifier**: Combines `ExtraTrees` and `RandomForest` classifiers achieving **95.03% test accuracy**.
- **6 Target Cocoa Classes**: `Unripe_Pod`, `Ripe_Pod`, `Overripe_Pod`, `Black_Pod_Rot` (*Phytophthora*), `Frosty_Pod_Rot` (*Moniliophthora*), and `Healthy_Leaf`.
- **Actionable Farmer Advisory**: Generates ripeness scores (0–100), harvest windows, yield estimates, risk alerts, and step-by-step care checklists.
- **Single-Container Docker Deployment**: Production-ready deployment for Render with Express Node.js and internal Flask ML microservice.

---

## 🏗️ System Architecture

```
[ React Single Page App (UI) ]
              │
              ▼
[ Express Node.js Server (server.ts) on 0.0.0.0:10000 ]
              │ (Internal Proxy)
              ▼
[ Flask Python ML Microservice (python_model/app.py) on 127.0.0.1:5000 ]
              │
              ├── Step 3: Blur Filter (Laplacian Variance)
              ├── Step 4: HSV Preprocessing & Color Ratios
              ├── Step 6: Pod Candidate Localization (Contour & Solidity)
              └── Step 8: Pretrained MobileNetV3 + Soft Voting Ensemble (95% Acc)
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+

### 1. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install Python ML dependencies
python -m pip install -r python_model/requirements.txt
```

### 2. Fetch Field Dataset & Retrain Model
```bash
# Download real cocoa field dataset images
python python_model/fetch_real_dataset.py

# Train the Soft Voting Ensemble model (creates python_model/model.pkl)
python python_model/train.py
```

### 3. Run Pipeline Test
```bash
python -c "from python_model.pipeline import execute_pipeline; import joblib; m = joblib.load('python_model/model.pkl'); print(execute_pipeline('python_model/dataset_raw/ripe_pod_01.jpg', sklearn_model=m))"
```

### 4. Start Local Development Servers
```bash
# Terminal 1: Start Python Flask ML Service
npm run start-python

# Terminal 2: Start Node Express Server & Vite UI
npm run dev
```

Open `http://localhost:3000` in your web browser.

---

## 🐳 Docker & Render Production Deployment

CacaoLens is containerized using a multi-stage Dockerfile:
- Node.js server binds to `0.0.0.0:$PORT` (serving static production UI from `dist/`).
- Python ML microservice binds to `127.0.0.1:5000` (internal loopback interface).

To build and run locally with Docker:
```bash
docker build -t cacaolens .
docker run -p 3000:3000 cacaolens
```

---

## 📂 Repository Structure

| File / Folder | Purpose |
| :--- | :--- |
| **[MODEL_DOCUMENTATION.md](MODEL_DOCUMENTATION.md)** | **Full self-explanatory AI model & pipeline documentation.** |
| [python_model/pipeline.py](python_model/pipeline.py) | 12-Step pipeline engine, blur filter, pod locator, MobileNetV3 backbone. |
| [python_model/train.py](python_model/train.py) | Training script for Soft Voting Ensemble model. |
| [python_model/fetch_real_dataset.py](python_model/fetch_real_dataset.py) | Research dataset downloader script. |
| [python_model/app.py](python_model/app.py) | Flask web microservice serving `/predict` endpoint. |
| [python_model/model.pkl](python_model/model.pkl) | Serialized trained model weights. |
| [server.ts](server.ts) | Express Node.js server and production asset provider. |
| [src/](src/) | React + TailwindCSS Single Page App source code. |
| [Dockerfile](Dockerfile) | Multi-stage Docker deployment definition for Render. |

---

## 📜 License
Licensed under the [MIT License](LICENSE).
