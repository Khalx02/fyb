from flask import Flask, request, jsonify
import os
import joblib
import base64
from io import BytesIO

app = Flask(__name__)

DIR = os.path.dirname(__file__)
PICKLE_PATH = os.path.join(DIR, 'model.pkl')
TORCH_PATH = os.path.join(DIR, 'model.pth')

# Try to load a joblib (sklearn) model first
model = None
model_type = None
if os.path.exists(PICKLE_PATH):
    try:
        model = joblib.load(PICKLE_PATH)
        model_type = 'sklearn'
    except Exception:
        model = None

# Try to detect a torch model
torch_model = None
torch_classes = None
try:
    import torch
    from torchvision import transforms
    from PIL import Image
    if os.path.exists(TORCH_PATH):
        ckpt = torch.load(TORCH_PATH, map_location='cpu')
        # We expect a dict with model_state_dict and classes
        torch_model = ckpt.get('model_state_dict') and ckpt.get('classes')
        # We'll load lazily in predict if available
except Exception:
    # torch may not be installed; ignore
    pass


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
            # Lazy import torch and model loading
            import torch
            from torchvision import transforms, models
            from PIL import Image

            header = ''
            if img_b64.startswith('data:'):
                header, img_b64 = img_b64.split(',', 1)
            img_bytes = base64.b64decode(img_b64)
            img = Image.open(BytesIO(img_bytes)).convert('RGB')

            # Prepare transforms matching training
            tfm = transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
            ])

            x = tfm(img).unsqueeze(0)

            if os.path.exists(TORCH_PATH):
                ckpt = torch.load(TORCH_PATH, map_location='cpu')
                classes = ckpt.get('classes')
                # Rebuild model architecture (assume resnet50)
                model_tf = models.resnet50(pretrained=False)
                in_f = model_tf.fc.in_features
                model_tf.fc = torch.nn.Linear(in_f, len(classes))
                model_tf.load_state_dict(ckpt['model_state_dict'])
                model_tf.eval()
                with torch.no_grad():
                    out = model_tf(x)
                    probs = torch.nn.functional.softmax(out, dim=1).tolist()[0]
                    pred_idx = int(torch.argmax(out, dim=1).item())
                    return jsonify({'prediction': classes[pred_idx], 'probabilities': probs})
            else:
                return jsonify({'error': 'Torch model not found. Train with train_vision.py to create model.pth'}), 500
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return jsonify({'error': 'No supported input provided (features or image required)'}), 400


if __name__ == '__main__':
    # Default to 0.0.0.0:5000 which can be reached from the Node server
    app.run(host='0.0.0.0', port=int(os.environ.get('PYTHON_ML_PORT', 5000)))
