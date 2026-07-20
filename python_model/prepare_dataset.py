"""Helper to prepare ImageFolder dataset from a CSV mapping.
Place images in `python_model/dataset_raw/` and a `labels.csv` with columns `filename,label`.
Splits into train/val folders and copies files into ImageFolder layout for PyTorch.
"""
import csv
import shutil
from pathlib import Path
import argparse
import random


def main(raw_dir, out_dir, val_split=0.2, seed=42):
    raw = Path(raw_dir)
    out = Path(out_dir)
    train_dir = out / 'train'
    val_dir = out / 'val'

    # Reset out directory
    if out.exists():
        shutil.rmtree(out)

    train_dir.mkdir(parents=True, exist_ok=True)
    val_dir.mkdir(parents=True, exist_ok=True)

    labels_file = raw / 'labels.csv'
    if not labels_file.exists():
        raise RuntimeError(f'labels.csv not found in {raw}. Run fetch_real_dataset.py first.')

    with open(labels_file, newline='', encoding='utf-8') as f:
        rdr = csv.DictReader(f)
        rows = list(rdr)

    random.seed(seed)
    by_label = {}
    for r in rows:
        fname = r['filename']
        label = r['label']
        by_label.setdefault(label, []).append(fname)

    total_train = 0
    total_val = 0

    for label, files in by_label.items():
        random.shuffle(files)
        # Ensure at least 1 image in train and val if possible
        if len(files) > 1:
            split = max(1, int(len(files) * (1 - val_split)))
        else:
            split = 1
        
        train_files = files[:split]
        val_files = files[split:] if len(files) > 1 else files[:1]

        tdir = train_dir / label
        vdir = val_dir / label
        tdir.mkdir(parents=True, exist_ok=True)
        vdir.mkdir(parents=True, exist_ok=True)

        for fn in train_files:
            src = raw / fn
            if src.exists():
                shutil.copy(src, tdir / fn)
                total_train += 1
        for fn in val_files:
            src = raw / fn
            if src.exists():
                shutil.copy(src, vdir / fn)
                total_val += 1

    print(f"Prepared real cocoa dataset in {out}:")
    print(f"  Classes ({len(by_label)}): {list(by_label.keys())}")
    print(f"  Train samples: {total_train}")
    print(f"  Val samples: {total_val}")


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--raw', default='python_model/dataset_raw')
    p.add_argument('--out', default='python_model/cocoa_dataset')
    p.add_argument('--val-split', type=float, default=0.2)
    args = p.parse_args()
    main(args.raw, args.out, args.val_split)
