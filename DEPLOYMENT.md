# CacaoLens Deployment Guide

This guide provides step-by-step instructions to deploy **CacaoLens** seamlessly to production with zero issues.

---

## Architecture Overview

CacaoLens consists of two complementary services:
1. **Node.js Express + React Frontend (`server.ts` & `dist/`)**: Handles UI rendering, API proxies, and LLM advisory endpoints (`/api/analyse`).
2. **Python Flask ML Service (`python_model/app.py`)**: Runs PyTorch (`model.pth`) and Scikit-learn (`model.pkl`) vision and crop model inference.

---

## Deployment Option 1: Render (Recommended - Free / Low Cost)

Render natively supports multi-service repositories via `render.yaml`.

### Steps:
1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "add deployment configuration"
   git push origin main
   ```
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Blueprint**.
3. Connect your GitHub repository `Khalx02/fyb`.
4. Render will automatically detect `render.yaml` and provision both:
   - **`cacaolens-python-ml`** (Python Flask Web Service)
   - **`cacaolens-node-app`** (Node.js Web App)
5. Add your optional `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY` under Environment Variables in Render.

---

## Deployment Option 2: Docker / Docker Compose (Universal & Portable)

Ideal for deployment on AWS ECS, DigitalOcean App Platform, Railway, or any Virtual Private Server (VPS).

### One-Command Deployment:
```bash
docker-compose up -d --build
```
This builds and launches the application container running both the Node server (Port `3000`) and the Python ML service (Port `5000`).

---

## Deployment Option 3: VPS / Ubuntu Cloud Instance

To run directly on an Ubuntu server (AWS EC2, DigitalOcean, Linode, Vultr):

### 1. Prerequisites Installation
```bash
sudo apt update && sudo apt install -y nodejs npm python3 python3-pip nginx git
npm install -g pm2
```

### 2. Clone Repository & Install Dependencies
```bash
git clone https://github.com/Khalx02/fyb.git
cd fyb
npm install
npm run build
pip3 install -r python_model/requirements.txt gunicorn
```

### 3. Start Services with PM2 Process Manager
```bash
# Start Python ML service
pm2 start "python3 python_model/app.py" --name "python-ml"

# Start Node server
pm2 start "npm start" --name "cacaolens-node"

# Save PM2 process list
pm2 save
pm2 startup
```

---

## Environment Variables Reference

Create a `.env` file or set environment variables in your cloud provider dashboard:

| Variable Name | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Node HTTP server port | `3000` |
| `PYTHON_ML_URL` | Endpoint URL for Python ML service | `http://localhost:5000/predict` |
| `GEMINI_API_KEY` | (Optional) Google Gemini API Key | `None` |
| `OPENAI_API_KEY` | (Optional) OpenAI API Key | `None` |
| `ANTHROPIC_API_KEY` | (Optional) Anthropic Claude Key | `None` |
