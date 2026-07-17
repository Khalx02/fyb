"""Helper to prepare ImageFolder dataset from a CSV mapping.
Place images in `python_model/dataset_raw/` and a `labels.csv` with columns `filename,label`.
This script will split into train/val folders and copy files into ImageFolder layout.
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
    train_dir.mkdir(parents=True, exist_ok=True)
    val_dir.mkdir(parents=True, exist_ok=True)

    labels_file = raw / 'labels.csv'
    if not labels_file.exists():
        raise RuntimeError(f'labels.csv not found in {raw}')

    with open(labels_file, newline='') as f:
        rdr = csv.DictReader(f)
        rows = list(rdr)

    random.seed(seed)
    by_label = {}
    for r in rows:
        fname = r['filename']
        label = r['label']
        by_label.setdefault(label, []).append(fname)

    for label, files in by_label.items():
        random.shuffle(files)
        split = int(len(files) * (1 - val_split))
        train_files = files[:split]
        val_files = files[split:]
        tdir = train_dir / label
        vdir = val_dir / label
        tdir.mkdir(parents=True, exist_ok=True)
        vdir.mkdir(parents=True, exist_ok=True)
        for fn in train_files:
            src = raw / fn
            if src.exists():
                shutil.copy(src, tdir / fn)
        for fn in val_files:
            src = raw / fn
            if src.exists():
                shutil.copy(src, vdir / fn)

    print('Prepared dataset in', out)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--raw', default='python_model/dataset_raw')
    p.add_argument('--out', default='python_model/cocoa_dataset')
    p.add_argument('--val-split', type=float, default=0.2)
    args = p.parse_args()
    main(args.raw, args.out, args.val_split)
