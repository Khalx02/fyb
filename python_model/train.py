"""Train Cocoa Pod Detection & Ripeness Model based on 12-Step Architecture.

Steps executed:
- Generates/Extracts HSV + Color space + Texture feature vectors
- 80/20 Train / Test split
- Trains RandomForest / ExtraTrees Ensemble Model
- Evaluates Accuracy, Precision, Recall, F1-Score & Confusion Matrix
- Saves trained model to python_model/model.pkl
"""

import os
import sys
import numpy as np
from pathlib import Path
from sklearn.ensemble import ExtraTreesClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix, f1_score
import joblib

DIR = os.path.dirname(os.path.abspath(__file__))
if DIR not in sys.path:
    sys.path.insert(0, DIR)

from generate_synthetic_data import GENERATORS
from pipeline import preprocess_hsv, classify_ripeness, COCOA_DIAGNOSTIC_KNOWLEDGE, cv2, Image


CLASSES = ["Unripe_Pod", "Ripe_Pod", "Overripe_Pod", "Black_Pod_Rot", "Frosty_Pod_Rot", "Healthy_Leaf"]


def generate_class_samples(cls_name: str, n_samples: int = 150):
    """Generates feature vectors for a given cocoa ripeness / disease class."""
    X = []
    y = []

    for _ in range(n_samples):
        # Create visual representation based on class HSV profile
        if cls_name == "Unripe_Pod":
            # Vibrant green pod
            pod_h = np.random.randint(38, 75)
            pod_s = np.random.randint(120, 220)
            pod_v = np.random.randint(100, 200)
        elif cls_name == "Ripe_Pod":
            # Bright yellow/orange pod
            pod_h = np.random.randint(18, 34)
            pod_s = np.random.randint(160, 255)
            pod_v = np.random.randint(180, 255)
        elif cls_name == "Overripe_Pod":
            # Dark brown/dull orange pod
            pod_h = np.random.randint(8, 22)
            pod_s = np.random.randint(80, 160)
            pod_v = np.random.randint(50, 110)
        elif cls_name == "Black_Pod_Rot":
            # Dark necrotic black rot lesions
            pod_h = np.random.randint(0, 180)
            pod_s = np.random.randint(20, 100)
            pod_v = np.random.randint(15, 65)
        elif cls_name == "Frosty_Pod_Rot":
            # White/cream dense fungal spore mat
            pod_h = np.random.randint(0, 180)
            pod_s = np.random.randint(5, 35)
            pod_v = np.random.randint(190, 255)
        else:  # Healthy_Leaf
            pod_h = np.random.randint(40, 80)
            pod_s = np.random.randint(140, 230)
            pod_v = np.random.randint(80, 170)

        # Create synthetic image tensor
        img_np = np.zeros((224, 224, 3), dtype=np.uint8)
        img_np[:, :] = [pod_h, pod_s, pod_v]
        # Add random noise/texture
        noise = np.random.randint(-15, 15, (224, 224, 3))
        img_hsv = np.clip(img_np.astype(int) + noise, 0, 255).astype(np.uint8)
        img_bgr = cv2.cvtColor(img_hsv, cv2.COLOR_HSV2BGR)

        _, _, stats = preprocess_hsv(img_bgr)
        feats = [
            stats['h_mean'], stats['h_std'],
            stats['s_mean'], stats['s_std'],
            stats['v_mean'], stats['v_std'],
            stats['green_ratio'], stats['yellow_ratio'],
            stats['brown_dark_ratio'], stats['white_rot_ratio']
        ]

        X.append(feats)
        y.append(cls_name)

    return X, y


def main():
    out_path = os.path.join(DIR, 'model.pkl')
    print("=" * 60)
    print("  Training Cocoa AI Pod Detection & Ripeness Classifier")
    print("=" * 60)

    X_all = []
    y_all = []

    for cls in CLASSES:
        X_cls, y_cls = generate_class_samples(cls, n_samples=200)
        X_all.extend(X_cls)
        y_all.extend(y_cls)

    X_all = np.array(X_all)
    y_all = np.array(y_all)

    # Step 5: Train / Test Split (80% Train, 20% Test)
    X_train, X_test, y_train, y_test = train_test_split(
        X_all, y_all, test_size=0.20, random_state=42, stratify=y_all
    )

    print(f"Dataset Split (80/20):")
    print(f"  Training samples:   {len(X_train)}")
    print(f"  Testing samples:    {len(X_test)}")
    print(f"  Target Classes ({len(CLASSES)}): {CLASSES}")

    # Train ExtraTrees Ensemble Model
    clf = ExtraTreesClassifier(n_estimators=100, max_depth=15, random_state=42)
    clf.fit(X_train, y_train)

    # Step 10: Classification Evaluation
    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average='weighted')

    print("\n" + "=" * 60)
    print(f"  Model Evaluation Metrics:")
    print(f"  Accuracy:  {acc * 100:.2f}%")
    print(f"  F1-Score:  {f1 * 100:.2f}%")
    print("=" * 60)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))

    # Save model.pkl
    joblib.dump(clf, out_path)
    print(f"\n[OK] Successfully saved trained cocoa AI model to {out_path}")


if __name__ == '__main__':
    main()
