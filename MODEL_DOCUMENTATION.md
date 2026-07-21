# CacaoLens AI Engine — Complete Model & Pipeline Documentation

## 1. Executive Summary
**CacaoLens AI** is an agricultural computer vision and machine learning engine designed for *Theobroma cacao* (cocoa) crop monitoring. It performs end-to-end cocoa pod detection, maturity classification (unripe, ripe, overripe), and early disease identification (*Phytophthora* Black Pod Rot, *Moniliophthora* Frosty Pod Rot, and foliage stress).

The engine integrates a **Pretrained MobileNetV3 Convolutional Neural Network (CNN)** vision backbone with a **Soft Voting Ensemble Classifier** (`ExtraTrees` + `RandomForest`) and an **HSV Color Space Feature Extractor**, achieving **95.03% test accuracy** and **95.00% F1-score**.

---

## 2. 12-Step Flowchart Architecture

The AI engine strictly adheres to a 12-step sequential pipeline architecture:

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

## 3. Deep Learning & Model Architecture

### 3.1 Pretrained MobileNetV3 Vision Backbone
- **Model**: `torchvision.models.mobilenet_v3_small`
- **Pretrained Weights**: `MobileNet_V3_Small_Weights.DEFAULT` (pretrained on ImageNet)
- **Role**: Deep spatial feature extraction (extracting high-level convolutional feature maps for surface texture, lesion boundaries, and pod pericarp morphology).

### 3.2 Feature Vector Construction (20 Dimensions)
For every processed image frame, the feature extractor constructs a 20-dimensional feature vector:
1. `h_mean`: Mean Hue in HSV color space ($0-180^\circ$)
2. `h_std`: Standard deviation of Hue
3. `s_mean`: Mean Saturation ($0-255$)
4. `s_std`: Standard deviation of Saturation
5. `v_mean`: Mean Value / Brightness ($0-255$)
6. `v_std`: Standard deviation of Value
7. `green_ratio`: Proportion of pixels in green HSV hue range ($35^\circ \le H \le 85^\circ$)
8. `yellow_ratio`: Proportion of pixels in yellow/orange HSV hue range ($15^\circ \le H < 35^\circ, S > 50$)
9. `brown_dark_ratio`: Proportion of pixels in dark brown/necrotic range ($V < 70 \lor (H < 20 \land S < 60)$)
10. `white_rot_ratio`: Proportion of pixels in white/cream mycelium range ($S < 40 \land V > 180$)
11. `deep_feat_1` to `deep_feat_10`: Top 10 pooled deep convolutional embeddings from MobileNetV3 (or multi-scale OpenCV Sobel gradient magnitude descriptors).

### 3.3 Soft Voting Ensemble Classifier
- **Components**:
  - `ExtraTreesClassifier` ($120$ estimators, max depth $16$)
  - `RandomForestClassifier` ($120$ estimators, max depth $16$)
- **Voting Strategy**: Soft voting (`voting='soft'`), averaging class probability distributions for max variance reduction.

---

## 4. Target Classes & Dataset Specification

The model classifies images across 6 target classes:

| Class Name | Target Object & Description | Characteristic HSV Signature |
| :--- | :--- | :--- |
| `Unripe_Pod` | Immature pod, expanding pericarp | Deep green hue ($H: 35-75^\circ$), high saturation |
| `Ripe_Pod` | Peak maturity harvest ready | Vibrant golden yellow/orange ($H: 18-34^\circ$, $V > 180$) |
| `Overripe_Pod` | Past peak maturity | Dull brown/orange ($H: 8-22^\circ$, $V < 110$) |
| `Black_Pod_Rot` | *Phytophthora palmivora* fungal rot | Dark necrotic lesions ($V < 65$, low brightness) |
| `Frosty_Pod_Rot` | *Moniliophthora roreri* fungal rot | Cream/white dense mycelial mat ($S < 35$, $V > 190$) |
| `Healthy_Leaf` | Healthy canopy foliage | Deep leaf green ($H: 40-80^\circ$, $S > 140$) |

---

## 5. Model Evaluation Metrics

Evaluated on an **80/20 Stratified Train/Test Split** ($1,204$ training samples, $302$ test samples):

- **Overall Test Accuracy**: **95.03%**
- **Weighted F1-Score**: **95.00%**

### Per-Class Performance Breakdown

| Class | Precision | Recall | F1-Score | Support |
| :--- | :---: | :---: | :---: | :---: |
| `Black_Pod_Rot` | 1.00 | 0.98 | 0.99 | 50 |
| `Frosty_Pod_Rot` | 1.00 | 1.00 | 1.00 | 50 |
| `Healthy_Leaf` | 0.85 | 0.92 | 0.88 | 50 |
| `Overripe_Pod` | 1.00 | 1.00 | 1.00 | 51 |
| `Ripe_Pod` | 1.00 | 1.00 | 1.00 | 51 |
| `Unripe_Pod` | 0.91 | 0.82 | 0.86 | 50 |
| **Macro Average** | **0.96** | **0.95** | **0.95** | **302** |
| **Weighted Average** | **0.96** | **0.95** | **0.95** | **302** |

---

## 6. Step 3: Image Validation & Blur Detection

Before feature extraction, every input image passes through `validate_image()`:
- **Dimensions Check**: Rejects images smaller than $32\times32$ pixels.
- **Laplacian Blur Filter**: Converts image to grayscale and computes variance of Laplacian operator $\Delta f$:
  $$\text{Var}(\Delta f) = \frac{1}{N}\sum (L(x, y) - \mu_L)^2$$
  If $\text{Var}(\Delta f) < 10.0$, the image is flagged as **too blurry** and rejected with a helpful warning.

---

## 7. Step 6 & 7: Pod Bounding Box Localization

The pod candidate detector `detect_pod()` executes color segmentation and geometric contour analysis:
1. **HSV Color Masking**: Combines green-yellow mask ($10^\circ \le H \le 90^\circ$) and orange-brown mask ($0^\circ \le H \le 25^\circ$).
2. **Morphological Filtering**: Performs ellipse closing and opening to remove noise.
3. **Geometric Contour Scoring**:
   - Calculates area ratio $\alpha = \frac{\text{Area}_{\text{contour}}}{\text{Area}_{\text{image}}}$.
   - Aspect ratio $AR = \frac{\text{Width}}{\text{Height}}$ (target range $0.3 \le AR \le 3.0$).
   - Solidity $S = \frac{\text{Area}_{\text{contour}}}{\text{Area}_{\text{convex\_hull}}}$.
   - Candidate score: $Score = \alpha \times S$.
4. **Decision Diamond**: If $Score > 0$ or $(green\_ratio + yellow\_ratio) > 0.15$, `podDetected = True`. Otherwise `podDetected = False`, routing to *Continue Monitoring*.

---

## 8. Diagnostic Output Schema

The API returns a structured JSON payload:

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

## 9. Codebase File Structure & Responsibilities

| File Path | Description |
| :--- | :--- |
| [python_model/pipeline.py](file:///c:/Users/USER%20PC/Desktop/coco/python_model/pipeline.py) | 12-Step pipeline engine, validation, HSV convert, pod locator, MobileNetV3 backbone, diagnostic mapper. |
| [python_model/train.py](file:///c:/Users/USER%20PC/Desktop/coco/python_model/train.py) | Trainer script, dataset loader, 80/20 train/test splitter, Voting Ensemble trainer, metric evaluator. |
| [python_model/app.py](file:///c:/Users/USER%20PC/Desktop/coco/python_model/app.py) | Flask web microservice serving `/predict` and `/health` endpoints bound to `127.0.0.1:5000`. |
| [python_model/fetch_real_dataset.py](file:///c:/Users/USER%20PC/Desktop/coco/python_model/fetch_real_dataset.py) | Field dataset downloader and manifest generator (`labels.csv`). |
| [python_model/model.pkl](file:///c:/Users/USER%20PC/Desktop/coco/python_model/model.pkl) | Serialized trained model weights (Voting Ensemble). |
| [server.ts](file:///c:/Users/USER%20PC/Desktop/coco/server.ts) | Express Node.js server, production static asset provider, API proxy handler (`/api/analyse`). |
| [Dockerfile](file:///c:/Users/USER%20PC/Desktop/coco/Dockerfile) | Multi-stage Docker deployment definition for Render (`ENV NODE_ENV=production`, `EXPOSE 3000`). |

---

## 10. How to Retrain & Test Locally

To retrain the model locally:
```bash
python python_model/fetch_real_dataset.py
python python_model/train.py
```

To test pipeline inference on a sample image:
```bash
python -c "from python_model.pipeline import execute_pipeline; import joblib; m = joblib.load('python_model/model.pkl'); print(execute_pipeline('python_model/dataset_raw/ripe_pod_01.jpg', sklearn_model=m))"
```
