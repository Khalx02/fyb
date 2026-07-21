# 🍫 CacaoLens AI Engine — Complete & Self-Explanatory Documentation

Welcome to the **CacaoLens AI Engine Documentation**! 

This guide explains **everything** about how our cocoa plant AI works. We wrote this document so that **anyone**—from a smallholder cocoa farmer, a curious beginner, or a seasoned machine learning scientist—can understand every detail. 

Every complex term is explained deeply with simple, real-world analogies!

---

## 📚 Table of Contents
1. [What is CacaoLens AI? (Simple Explanation)](#1-what-is-cacaolens-ai-simple-explanation)
2. [Glossary of Terms (Deeply Explained in Plain Language)](#2-glossary-of-terms-deeply-explained-in-plain-language)
3. [The 12-Step AI Flowchart Architecture](#3-the-12-step-ai-flowchart-architecture)
4. [Step-by-Step Deep Explanation of the 12 Pipeline Steps](#4-step-by-step-deep-explanation-of-the-12-pipeline-steps)
5. [The Pretrained MobileNetV3 "Computer Brain"](#5-the-pretrained-mobilenetv3-computer-brain)
6. [The Voting Ensemble Classifier ("The Smart Committee")](#6-the-voting-ensemble-classifier-the-smart-committee)
7. [The 6 Cocoa Classes the AI Recognizes](#7-the-6-cocoa-classes-the-ai-recognizes)
8. [Training Process & 95% Accuracy Exam Results](#8-training-process--95-accuracy-exam-results)
9. [Diagnostic JSON Output Schema](#9-diagnostic-json-output-schema)
10. [Deployment & Container Architecture](#10-deployment--container-architecture)
11. [How to Train & Test the AI Yourself](#11-how-to-train--test-the-ai-yourself)

---

## 1. What is CacaoLens AI? (Simple Explanation)

Imagine having an **expert cocoa farming scientist** standing next to you on your farm 24/7. Whenever you take a photo of a cocoa pod or leaf with your phone, this expert instantly looks at the picture and tells you:
- *"Is this pod ready to harvest today?"*
- *"Is it still green and needs 4 more weeks to grow?"*
- *"Is it infected with Black Pod Rot disease that needs to be removed immediately?"*
- *"How many high-quality cocoa beans will this pod yield?"*

**CacaoLens AI** is that expert scientist, built entirely into a fast computer program!

---

## 2. Glossary of Terms (Deeply Explained in Plain Language)

Here are the key technical concepts explained deeply and simply:

### 🤖 1. Artificial Intelligence (AI)
- **What it means**: A computer program that can learn from examples instead of needing human rules for every single action.
- **Analogy**: Like teaching a child to recognize fruits by showing them 1,000 pictures of apples and bananas until they can recognize them on their own.

### 👁️ 2. Computer Vision (CV)
- **What it means**: The technology that gives computers "eyes" to read digital photos, inspect colors, recognize shapes, and count pixels.
- **Analogy**: Giving a camera a brain so it doesn't just record light, but understands what objects are inside the picture.

### 🧠 3. Pretrained Neural Network (MobileNetV3)
- **What it means**: A deep learning vision model that has already been trained on millions of general images (cars, animals, plants, objects). Because it already knows how to detect edges, curves, and textures, it learns cocoa details instantly.
- **Analogy**: A student who has already graduated from general high school (pretrained) before taking a specialized cocoa farming course.

### 🎨 4. HSV Color Space (Hue, Saturation, Value)
Computers usually read photos in RGB (Red, Green, Blue). But RGB makes it hard to distinguish lighting changes from actual color changes. CacaoLens converts images to **HSV**:
- **Hue (H - Color Tint)**: What color family is it? ($0^\circ-180^\circ$). Green ($40-80^\circ$) means unripe. Yellow ($18-34^\circ$) means ripe. Brown/Dark ($<20^\circ$) means rot or overripe.
- **Saturation (S - Color Purity)**: How rich or intense is the color? High saturation means a bright yellow pod; low saturation means a dull white mold mat.
- **Value (V - Brightness)**: How light or dark is the pixel? Fungal rot spots appear dark (low Value), while white mold spores appear bright (high Value).

### 🔍 5. Laplacian Variance (Blur Detection)
- **What it means**: A math formula that checks if a photo is sharp or blurry.
- **Analogy**: Putting "reading glasses" on the computer. If a farmer takes a shaky, blurry photo, the computer measures the sharpness score ($\text{Var}(\Delta f)$). If the score is under $10.0$, the computer politely asks for a clearer photo instead of making a wrong guess.

### ⭕ 6. Contour & Solidity Analysis (Pod Locator)
- **What it means**: Outlining the border of objects in a picture to locate oval cocoa pods.
- **Solidity ($S$)**: Measures how solid and rounded an object is compared to its boundary box. Cocoa pods are smooth ovals (high solidity), while background branches are jagged sticks (low solidity).

### 🌲 7. Voting Ensemble Classifier (ExtraTrees + RandomForest)
- **What it means**: Combining multiple independent decision tree models into a single "committee".
- **Analogy**: Asking 240 different cocoa expert judges to vote on a photo. If 230 judges say *"Ripe Pod"*, the computer returns *"Ripe Pod"* with high confidence!

### 📊 8. Stratified 80/20 Train/Test Split
- **What it means**: Splitting a dataset into 80% for learning (training) and 20% for testing (final exam). Stratified means both sets get equal shares of unripe, ripe, and diseased pods.

### 🍄 9. Phytophthora & Moniliophthora (Black Pod & Frosty Pod Rot)
- **Black Pod Rot (*Phytophthora*)**: A dangerous fungal disease that turns cocoa pods dark brown/black with wet necrotic rot.
- **Frosty Pod Rot (*Moniliophthora*)**: A destructive disease that causes swollen pods covered in a dense white/cream powdery spore mat.

---

## 3. The 12-Step AI Flowchart Architecture

Below is the complete 12-step visual architecture implemented in [python_model/pipeline.py](file:///c:/Users/USER%20PC/Desktop/coco/python_model/pipeline.py):

```
┌────────────────────────────────────────────────────────┐
│             1. Data Source (Phone / Drone)             │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│   2. Data Collection (6 Labeled Cocoa Crop Classes)    │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ 3. Data Validation (Blur filter via Laplacian Variance)│
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ 4. Data Preprocessing (Resize 224x224 & HSV Conversion)│
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│      5. Train / Test Split (80/20 Stratified Split)    │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│ 6. Pod Detection Model (HSV Mask & Contour Extraction) │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│        7. Decision Check: Pod Detected in Frame?       │
└───────────────┬─────────────────────────┬──────────────┘
                │ yes                     │ no
                │                         ▼
                │           ┌────────────────────────────┐
                │           │ 12. Continue Monitoring    │
                │           │ (Prompt for Next Frame)    │
                │           └─────────────┬──────────────┘
                │                         │ next frame
                ▼                         │
┌───────────────────────────────┐         │
│ 8. Ripeness & Disease CNN     │◄────────┘
│    (MobileNetV3 + Ensemble)   │
└───────────────┬───────────────┘
                │
┌───────────────▼───────────────┐
│ 9, 10, 11. Diagnostic Output  │
│ (Score, Harvest Window, Risks)│
└───────────────────────────────┘
```

---

## 4. Step-by-Step Deep Explanation of the 12 Pipeline Steps

### **Step 1: Data Source**
Field photos taken by cocoa farmers using smartphones or farm monitoring drones.

### **Step 2: Data Collection & Annotation**
Images are categorized into 6 clear labels: `Unripe_Pod`, `Ripe_Pod`, `Overripe_Pod`, `Black_Pod_Rot`, `Frosty_Pod_Rot`, `Healthy_Leaf`.

### **Step 3: Data Validation (`validate_image`)**
Calculates Laplacian variance $\text{Var}(\Delta f)$. If $\text{Var}(\Delta f) < 10.0$ (blurry photo), the pipeline rejects the image to prevent inaccurate diagnoses.

### **Step 4: Data Preprocessing & HSV Conversion (`preprocess_hsv`)**
- Resizes image to standard $224\times 224$ pixels.
- Converts RGB to HSV color space.
- Calculates green ratio, yellow ratio, dark brown ratio, and white rot ratio.

### **Step 5: Train / Test Split**
Divides dataset into 80% training data ($1,204$ samples) and 20% test data ($302$ samples) to validate accuracy.

### **Step 6: Pod Detection Model (`detect_pod`)**
Executes color mask segmentation ($10^\circ \le H \le 90^\circ$) and contour extraction to locate cocoa pod candidate bounding boxes $(x, y, w, h)$.

### **Step 7: Decision Diamond ("Pod Detected?")**
- If a pod is found: Proceeds to Step 8.
- If no pod is found (e.g. background soil): Returns `"No Pod Detected"` and prompts farmer to capture next frame (*Continue Monitoring*).

### **Step 8: Ripeness Classification CNN & Ensemble Model**
Combines pretrained **MobileNetV3** deep spatial feature embeddings with the **Voting Ensemble Classifier** (`ExtraTrees` + `RandomForest`).

### **Step 9: Ripeness Output**
Generates detailed ripeness label, 0–100 ripeness score, weeks to harvest, and pod bean yield estimate.

### **Step 10: Classification Evaluation**
Evaluates performance metrics: **95.03% Accuracy** and **95.00% F1-Score**.

### **Step 11: Deployment**
Deploys via Flask microservice in Docker on Render (`http://127.0.0.1:5000/predict`), integrated with the React frontend SPA.

### **Step 12: Continue Monitoring**
Allows continuous scan loops for real-time camera feeds and field walks.

---

## 5. The Pretrained MobileNetV3 "Computer Brain"

The AI engine uses `torchvision.models.mobilenet_v3_small` with default ImageNet pretrained weights.
- **Why MobileNetV3?**: It is an ultra-lightweight inverted residual convolutional network designed to run fast on edge devices and web servers with minimal memory (~1M parameters).
- **Deep Feature Output**: Extracts 10 deep convolutional feature embeddings representing pericarp ridges, spot gradients, and tissue texture.

---

## 6. The Voting Ensemble Classifier ("The Smart Committee")

The final decision is made by a **Soft Voting Ensemble Classifier**:
- **Tree 1 (ExtraTreesClassifier)**: 120 randomized decision trees analyzing feature thresholds.
- **Tree 2 (RandomForestClassifier)**: 120 decision trees trained on bootstrap sub-samples.
- **Soft Voting Formula**:
  $$P(\text{Class}_c) = \frac{1}{2} \left[ P_{\text{ExtraTrees}}(\text{Class}_c) + P_{\text{RandomForest}}(\text{Class}_c) \right]$$
  The class $c$ with the highest combined probability win!

---

## 7. The 6 Cocoa Classes the AI Recognizes

| Class | Ripeness Score | Harvest Window | Key Visual Traits | Recommended Farmer Action |
| :--- | :---: | :---: | :--- | :--- |
| **`Unripe_Pod`** | 35 / 100 | 4 – 6 Weeks | Deep green pericarp ($H: 35-75^\circ$) | Do not pick yet; allow cocoa fat content to build. |
| **`Ripe_Pod`** | 95 / 100 | 0 – 1 Week | Golden yellow/orange ($H: 18-34^\circ$) | Harvest with sharp shears leaving 1cm stem attached. |
| **`Overripe_Pod`**| 60 / 100 | Immediate Pick | Dull orange-brown ($V < 110$) | Pick today; discard germinated seeds during breaking. |
| **`Black_Pod_Rot`**| 20 / 100 | Do Not Sell | Dark necrotic rot spot ($V < 65$) | Remove pod immediately; apply copper fungicide. |
| **`Frosty_Pod_Rot`**| 15 / 100 | Quarantine | Dense white powdery mold mat | Sanitation pick; bury pod under 10cm soil. |
| **`Healthy_Leaf`**| 92 / 100 | Active Canopy | Deep green lamina ($H: 40-80^\circ$) | Maintain soil N-P-K-Mg fertility schedule. |

---

## 8. Training Process & 95% Accuracy Exam Results

Evaluated on an **80/20 Stratified Train/Test Split** ($1,204$ training samples, $302$ test samples):

- **Overall Test Accuracy**: **95.03%**
- **Weighted F1-Score**: **95.00%**

### Official Classification Report

```
                precision    recall  f1-score   support

 Black_Pod_Rot       1.00      0.98      0.99        50
Frosty_Pod_Rot       1.00      1.00      1.00        50
  Healthy_Leaf       0.85      0.92      0.88        50
  Overripe_Pod       1.00      1.00      1.00        51
      Ripe_Pod       1.00      1.00      1.00        51
    Unripe_Pod       0.91      0.82      0.86        50

      accuracy                           0.95       302
     macro avg       0.96      0.95      0.95       302
  weighted avg       0.96      0.95      0.95       302
```

---

## 9. Diagnostic JSON Output Schema

When a farmer runs a scan, the AI returns this clear JSON structure:

```json
{
  "isCocoa": true,
  "podDetected": true,
  "detectionConfidence": 0.95,
  "objectType": "Ripe Cocoa Pod",
  "ripenessLabel": "Optimal Harvest Maturity",
  "ripenessScore": 95,
  "weeksToHarvest": "0 - 1 Week",
  "estimatedAgeWeeks": "20 - 22 Weeks",
  "bestHarvestWindow": "Peak Quality Harvest (Next 5-7 Days)",
  "podYieldEstimate": "High Yield (~40-48 Grade A Beans)",
  "characteristics": "Vibrant golden-yellow/orange pericarp, uniform ridge structure, optimal fat/cocoa butter development.",
  "harvestRecommendations": [
    "Harvest using sharp shears, cutting pedicel 1cm from trunk cushion.",
    "Store harvested pods under shade for 2-4 days before pod breaking.",
    "Begin 6-day sweat-box fermentation within 48 hours of pod opening."
  ],
  "risks": [
    "High risk of animal damage (rodents/monkeys) if harvest is delayed.",
    "Rain during harvest can initiate fungal rot."
  ],
  "nextSteps": [
    "Mobilize harvesting team for early morning pick.",
    "Prepare clean wooden fermentation boxes with banana leaf lining."
  ],
  "gaugeColor": "#10B981",
  "hsvRatios": {
    "green": 4.2,
    "yellow": 48.6,
    "darkBrown": 2.1
  }
}
```

---

## 10. Deployment & Container Architecture

- **Docker Environment**: Single-container setup using `python:3.11-slim` + Node.js 20.
- **Node.js Express Server**: Runs on `0.0.0.0:$PORT` (Render port 10000), serving React SPA static files from `dist/`.
- **Python Flask ML Service**: Runs on `127.0.0.1:5000` (internal loopback interface inside the container).
- **Communication Flow**:
  1. User browser opens `https://fyb-oko9.onrender.com`.
  2. Browser submits photo to `/api/analyse`.
  3. Node.js server proxies query to internal Python microservice `http://127.0.0.1:5000/predict`.
  4. Python executes `pipeline.py` (Validation $\rightarrow$ Preprocessing $\rightarrow$ Pod Detection $\rightarrow$ MobileNetV3 + Voting Ensemble) and returns JSON diagnostic.

---

## 11. How to Train & Test the AI Yourself

### 1. Download Dataset & Retrain Model
```bash
python python_model/fetch_real_dataset.py
python python_model/train.py
```

### 2. Run Pipeline Test on Any Image
```bash
python -c "from python_model.pipeline import execute_pipeline; import joblib; m = joblib.load('python_model/model.pkl'); print(execute_pipeline('python_model/dataset_raw/ripe_pod_01.jpg', sklearn_model=m))"
```
