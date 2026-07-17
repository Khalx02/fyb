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
    return jsonify({'status': 'ok'})


@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(force=True) or {}
    # If features provided (tabular/sklearn)
    features = data.get('features')
    if features is not None:
        if model is None:
            return jsonify({'error': 'Sklearn model not found. Run train.py to create model.pkl'}), 500
        try:
            pred = model.predict([features])
            proba = None
            if hasattr(model, 'predict_proba'):
                proba = model.predict_proba([features]).tolist()
            result = {
                'prediction': pred[0].tolist() if hasattr(pred[0], 'tolist') else pred[0],
                'probabilities': proba,
            }
            return jsonify(result)
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    # If image provided (base64)
    img_b64 = data.get('image')
    if img_b64:
        try:
            import torch
            from torchvision import transforms
            from PIL import Image

            if img_b64.startswith('data:'):
                _, img_b64 = img_b64.split(',', 1)
            img_bytes = base64.b64decode(img_b64)
            img = Image.open(BytesIO(img_bytes)).convert('RGB')

            tfm = transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            ])

            x = tfm(img).unsqueeze(0)

            model_tf, classes = _load_torch_model()
            if model_tf is not None:
                with torch.no_grad():
                    out = model_tf(x)
                    probs = torch.nn.functional.softmax(out, dim=1).tolist()[0]
                    pred_idx = int(torch.argmax(out, dim=1).item())
                    pred_class = classes[pred_idx]
                    conf = round(probs[pred_idx], 4)
                    return jsonify({
                        "isCocoa": True,
                        "objectType": pred_class,
                        "ripenessLabel": "Local Model",
                        "ripenessScore": int(conf * 100),
                        "weeksToHarvest": "N/A",
                        "estimatedAgeWeeks": "N/A",
                        "bestHarvestWindow": "N/A",
                        "podYieldEstimate": "N/A",
                        "characteristics": f"Local model classified as '{pred_class}' with {conf*100:.1f}% confidence.",
                        "harvestRecommendations": [],
                        "risks": [],
                        "nextSteps": ["Run analysis with an AI provider (Gemini, OpenAI, etc.) for detailed advisory."],
                        "gaugeColor": "#6366f1" if pred_class == "Pod" else "#22c55e"
                    })
            else:
                return jsonify({'error': 'Torch model not found. Train with train_vision.py to create model.pth'}), 500
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return jsonify({'error': 'No supported input provided (features or image required)'}), 400


if __name__ == '__main__':
    port = int(os.environ.get('PYTHON_ML_PORT', 5000))
    print(f'Starting CacaoLens ML Service on port {port}...')
    if model:
        print(f'  sklearn model loaded from {PICKLE_PATH}')
    _load_torch_model()
    app.run(host='0.0.0.0', port=port)
