# Multi-stage Dockerfile for CacaoLens (Node.js + Python ML Service)
FROM python:3.11-slim AS base

# Install Node.js 20 and system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python dependencies and install
COPY python_model/requirements.txt python_model/requirements.txt
RUN pip install --no-cache-dir -r python_model/requirements.txt gunicorn

# Copy Node dependencies and install
COPY package*.json ./
RUN npm ci

# Copy full application code
COPY . .

# Build Vite frontend and Express server bundle
RUN npm run build

# Expose Node server port
EXPOSE 3000

# Start Python ML service on 127.0.0.1 in background and Node server in foreground
CMD python3 python_model/app.py & npm start
