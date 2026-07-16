"""Train a small example model (Iris) and save it as model.pkl.
Run: python3 python_model/train.py
"""
from sklearn.datasets import load_iris
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GridSearchCV
import joblib
import os


def main(out_path='model.pkl'):
    X, y = load_iris(return_X_y=True)
    param_grid = {
        'n_estimators': [50, 100],
        'max_depth': [None, 10, 20]
    }
    base = RandomForestClassifier(random_state=42)
    gs = GridSearchCV(base, param_grid, cv=3, n_jobs=-1, verbose=1)
    gs.fit(X, y)
    best = gs.best_estimator_
    joblib.dump(best, out_path)
    print(f'Saved best model to {out_path} with params: {gs.best_params_} and score: {gs.best_score_:.4f}')


if __name__ == '__main__':
    outp = os.path.join(os.path.dirname(__file__), 'model.pkl')
    main(outp)
