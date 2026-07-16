# CacaoLens — Cocoa Farming AI Assistant

CocoLens is an application for assisting smallholder cocoa farmers by analysing photos, text observations, and basic measurements to provide practical, actionable agricultural advice. It combines a React frontend and Node backend with a local Python ML service for model training and inference.

Key features
- Image and tabular model inference (local Python ML service)
- Transfer-learning vision training pipeline for cocoa image classification
- Proxy endpoint from Node server to Python service for predictions
- Dataset preparation helper to convert labeled images into ImageFolder layout

Architecture
- Frontend: React + Vite (UI and image capture)
- Backend: Node/Express server in `server.ts` (routes, proxy to Python ML)
- ML service: Flask app in `python_model/app.py` (tabular and image inference)
- Training scripts: `python_model/train.py` (tabular) and `python_model/train_vision.py` (vision transfer learning)

Quick start (local development)

Prerequisites:
- Node.js 18+ and npm
- Python 3.10+ (virtualenv recommended)
- Optional: CUDA-compatible GPU for faster vision training

1. Install Node dependencies

```bash
npm install
```

2. Install Python deps (create and use a virtualenv if desired)

```bash
python3 -m pip install -r python_model/requirements.txt
```

3. Train the small tabular example model (creates `python_model/model.pkl`)

```bash
npm run train-model
```

4. (Optional) Prepare and train a vision model on cocoa images

- Place raw images and a `labels.csv` into `python_model/dataset_raw/`.
- Convert to ImageFolder layout:

```bash
python3 python_model/prepare_dataset.py --raw python_model/dataset_raw --out python_model/cocoa_dataset
```

- Train (CPU training can be slow):

```bash
python3 python_model/train_vision.py --data python_model/cocoa_dataset --epochs 10 --out python_model/model.pth
```

5. Start the Python ML service (Flask)

```bash
npm run start-python
```

6. Start the Node dev server

```bash
npm run dev
```

API endpoints
- `POST /api/predict` — Proxy to the Python ML service. Send JSON with either `features` (tabular) or `image` (base64 data URI). Example:

```json
{ "features": [5.1, 3.5, 1.4, 0.2] }
```

Vision inference example (base64 image):

```json
{ "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..." }
```

Development notes and next steps
- The project contains a working end-to-end local pipeline; to make the model production-grade you should:
  - Curate and label a high-quality cocoa image dataset (leaf, pod, cut seed, walk-clip, other).
  - Use `train_vision.py` with a GPU and larger epochs; experiment with stronger backbones and data augmentation.
  - Consider fine-tuning an LLM or building a multimodal model for richer advisory (Hugging Face Transformers, LoRA for parameter-efficient fine-tuning).

Where to find things
- Node server: `server.ts`
- Python ML service: `python_model/app.py`
- Tabular train: `python_model/train.py`
- Vision train: `python_model/train_vision.py`
- Dataset prep helper: `python_model/prepare_dataset.py`

If you want, I can:
- Run a vision training job here (will install PyTorch; may be slow without GPU).
- Add automated evaluation scripts and sample notebooks for dataset exploration.
- Draft a fine-tuning plan and scripts for an LLM-based advisory system.
