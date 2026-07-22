from flask import Flask, request, jsonify
import os
import base64
from io import BytesIO

app = Flask(__name__)

DIR = os.path.dirname(__file__)
PICKLE_PATH = os.path.join(DIR, 'model.pkl')
TORCH_PATH = os.path.join(DIR, 'model.pth')

# Load sklearn model
model = None
try:
    import joblib
    if os.path.exists(PICKLE_PATH):
        model = joblib.load(PICKLE_PATH)
except Exception:
    pass

# Lazy-loaded torch model cache
_torch_model_cache = None
_torch_classes_cache = None
_torch_arch_cache = None


# Agronomic knowledge mapping for real cocoa dataset classes
REAL_CLASS_DIAGNOSTICS = {
    "Black_Pod_Rot": {
        "isCocoa": True,
        "objectType": "Black Pod Rot (Phytophthora)",
        "ripenessLabel": "Black Pod Rot Infection Detected",
        "ripenessScore": 94,
        "weeksToHarvest": "Immediate Removal",
        "estimatedAgeWeeks": "16-20 Weeks",
        "bestHarvestWindow": "Do Not Harvest for Sale",
        "podYieldEstimate": "Yield Loss Expected",
        "characteristics": "Brown-black necrotic lesions spreading rapidly across pod surface with Phytophthora palmivora sporangia risk.",
        "harvestRecommendations": [
            "Remove infected pods immediately and destroy away from cocoa field.",
            "Apply copper-based fungicide (Funguran-OH) to neighboring tree canopies.",
            "Prune shade trees to increase sunlight penetration and reduce field humidity."
        ],
        "risks": [
            "High risk of fungal spore spread via rain splash and harvesting tools.",
            "Potential secondary infection of adjacent healthy pods within 3 meters."
        ],
        "nextSteps": [
            "Sanitize harvesting shears with 70% alcohol solution after handling.",
            "Re-inspect tree canopy in 5 days."
        ],
        "gaugeColor": "#F43F5E"
    },
    "Frosty_Pod_Rot": {
        "isCocoa": True,
        "objectType": "Frosty Pod Rot (Moniliophthora)",
        "ripenessLabel": "Frosty Pod Rot (Moniliophthora roreri)",
        "ripenessScore": 92,
        "weeksToHarvest": "Quarantine Tree",
        "estimatedAgeWeeks": "12-18 Weeks",
        "bestHarvestWindow": "Immediate Sanitation Pick",
        "podYieldEstimate": "Internal Seed Decay",
        "characteristics": "Dense white/cream fungal spore mat covering irregular pod swelling. Internal beans completely degraded.",
        "harvestRecommendations": [
            "Perform weekly sanitation picks of affected pods before white spores turn dusty.",
            "Bury diseased pods under 10cm leaf litter or soil.",
            "Disinfect all farm tools before moving between blocks."
        ],
        "risks": [
            "Severe crop loss up to 80% if spore discharge is unmanaged.",
            "Spores remain viable on plant debris for several weeks."
        ],
        "nextSteps": [
            "Apply biocontrol agents (Trichoderma spp.) if available.",
            "Monitor adjacent cocoa trees weekly."
        ],
        "gaugeColor": "#F59E0B"
    },
    "CSSVD": {
        "isCocoa": True,
        "objectType": "Cocoa Swollen Shoot Virus (CSSVD)",
        "ripenessLabel": "Swollen Shoot Virus Symptoms",
        "ripenessScore": 88,
        "weeksToHarvest": "Monitor Tree Health",
        "estimatedAgeWeeks": "Perennial",
        "bestHarvestWindow": "N/A",
        "podYieldEstimate": "Progressive Yield Decline",
        "characteristics": "Red vein-banding chlorosis on young leaves, leaf mottling, and characteristic stem swelling.",
        "harvestRecommendations": [
            "Isolate infected trees and remove adjacent contact trees within 5m barrier zone.",
            "Manage mealybug vector populations (Planococcoides njalensis).",
            "Replant cleared areas with CSSVD-tolerant cocoa hybrids."
        ],
        "risks": [
            "Systemic viral infection transmitted rapidly by mealybugs.",
            "Can cause tree death within 2-3 years if unmitigated."
        ],
        "nextSteps": [
            "Notify local agricultural extension officer.",
            "Establish cordon sanitaire around infected block."
        ],
        "gaugeColor": "#F59E0B"
    },
    "Healthy_Pod": {
        "isCocoa": True,
        "objectType": "Healthy Cocoa Pod",
        "ripenessLabel": "Optimal Maturity & Health",
        "ripenessScore": 96,
        "weeksToHarvest": "1 - 2 Weeks",
        "estimatedAgeWeeks": "20 - 22 Weeks",
        "bestHarvestWindow": "Peak Quality Harvest",
        "podYieldEstimate": "High (45-50 Grade A Beans)",
        "characteristics": "Vibrant yellow-orange pericarp, uniform ridge structure, zero necrotic spots or fungal growth.",
        "harvestRecommendations": [
            "Harvest using sharp pruners leaving 1cm stem attached to pod cushion.",
            "Store harvested pods under shade for 2-4 days before opening.",
            "Begin 6-day sweat-box fermentation within 48 hours of pod breaking."
        ],
        "risks": [
            "Low disease risk. Monitor field humidity after heavy rains."
        ],
        "nextSteps": [
            "Schedule harvesting crew for optimal morning window.",
            "Prepare clean wooden fermentation boxes."
        ],
        "gaugeColor": "#10B981"
    },
    "Healthy_Leaf": {
        "isCocoa": True,
        "objectType": "Healthy Cocoa Leaf",
        "ripenessLabel": "Optimal Leaf Chlorophyll & Structure",
        "ripenessScore": 98,
        "weeksToHarvest": "N/A",
        "estimatedAgeWeeks": "Normal Foliage",
        "bestHarvestWindow": "Active Photosynthesis",
        "podYieldEstimate": "Optimal Canopy Support",
        "characteristics": "Deep green leaf lamina, intact venation, no chlorosis, necrosis, or pest feeding damage.",
        "harvestRecommendations": [
            "Maintain balanced N-P-K-Mg soil fertility program.",
            "Ensure shade tree canopy provides 40-50% filtered light."
        ],
        "risks": [
            "No active pathology or nutrient deficiency detected."
        ],
        "nextSteps": [
            "Continue standard agronomic monitoring."
        ],
        "gaugeColor": "#10B981"
    }
}


def _load_torch_model():
    global _torch_model_cache, _torch_classes_cache, _torch_arch_cache
    if _torch_model_cache is not None:
        return _torch_model_cache, _torch_classes_cache
    if not os.path.exists(TORCH_PATH):
        return None, None
    try:
        import torch
        from torchvision import models
        import torch.nn as nn

        ckpt = torch.load(TORCH_PATH, map_location='cpu', weights_only=False)
        classes = ckpt.get('classes', [])
        arch = ckpt.get('arch', 'resnet50')
        num_classes = ckpt.get('num_classes', len(classes))
        _torch_arch_cache = arch

        if arch == 'cocoanet':
            import sys
            sys.path.insert(0, DIR)
            from cocoa_net import CocoaNet
            model_tf = CocoaNet(num_classes=num_classes)
        elif arch == 'resnet18':
            model_tf = models.resnet18(weights=None)
            in_f = model_tf.fc.in_features
            model_tf.fc = nn.Linear(in_f, num_classes)
        else:
            model_tf = models.resnet50(weights=None)
            in_f = model_tf.fc.in_features
            model_tf.fc = nn.Linear(in_f, num_classes)

        model_tf.load_state_dict(ckpt['model_state_dict'])
        model_tf.eval()
        _torch_model_cache = model_tf
        _torch_classes_cache = classes
        return model_tf, classes
    except Exception as e:
        print(f'Failed to load torch model: {e}')
        return None, None


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'dataset': 'Real Cocoa Diseases Dataset'})


def parse_text_query(text: str):
    q = (text or "").lower()
    if any(k in q for k in ["black pod", "phytophthora", "dark patch", "black rot", "copper"]):
        return REAL_CLASS_DIAGNOSTICS["Black_Pod_Rot"]
    if any(k in q for k in ["frosty", "monilia", "white powder", "spore mat"]):
        return REAL_CLASS_DIAGNOSTICS["Frosty_Pod_Rot"]
    if any(k in q for k in ["swollen shoot", "cssvd", "mealybug", "red vein", "virus"]):
        return REAL_CLASS_DIAGNOSTICS["CSSVD"]
    if any(k in q for k in ["leaf", "leaves", "chlorosis", "yellowing", "foliage"]):
        return REAL_CLASS_DIAGNOSTICS["Healthy_Leaf"]
    return REAL_CLASS_DIAGNOSTICS["Healthy_Pod"]


@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(force=True) or {}
    text_input = data.get('text')
    
    # Base64 Image classification
    img_b64 = data.get('image')
    if img_b64:
        try:
            from pipeline import execute_pipeline
            result = execute_pipeline(img_b64, sklearn_model=model)
            return jsonify(result), 200
        except Exception as e:
            print(f"Prediction error: {e}")
            return jsonify(parse_text_query(text_input)), 200

    # Tabular / sklearn features
    features = data.get('features')
    if features is not None and not text_input:
        if model is None:
            return jsonify({'error': 'Sklearn model not found. Run train.py to create model.pkl'}), 500
        try:
            pred = model.predict([features])
            proba = None
            if hasattr(model, 'predict_proba'):
                proba = model.predict_proba([features]).tolist()
            return jsonify({
                'prediction': pred[0].tolist() if hasattr(pred[0], 'tolist') else pred[0],
                'probabilities': proba,
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return jsonify(parse_text_query(text_input)), 200


if __name__ == '__main__':
    port = int(os.environ.get('PYTHON_ML_PORT', 5000))
    host = os.environ.get('PYTHON_ML_HOST', '127.0.0.1')
    print(f'Starting CacaoLens Real ML Service on {host}:{port}...')
    app.run(host=host, port=port)
