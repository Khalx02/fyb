"""Transfer-learning training script for cocoa image classification on real cocoa dataset.

Expects a directory with ImageFolder structure:
  cocoa_dataset/
    train/
      Black_Pod_Rot/
      Frosty_Pod_Rot/
      CSSVD/
      Healthy_Pod/
      Healthy_Leaf/
    val/

Run:
  python python_model/train_vision.py --data python_model/cocoa_dataset --epochs 5 --out python_model/model.pth
"""
import argparse
import os
from pathlib import Path
import torch
from torch import nn
from torch.utils.data import DataLoader
from torchvision import transforms, datasets, models


def get_args():
    p = argparse.ArgumentParser()
    p.add_argument('--data', default='python_model/cocoa_dataset', help='Path to dataset root with train/val folders')
    p.add_argument('--epochs', type=int, default=5)
    p.add_argument('--batch-size', type=int, default=16)
    p.add_argument('--lr', type=float, default=1e-4)
    p.add_argument('--model', default='resnet50')
    p.add_argument('--out', default='python_model/model.pth')
    p.add_argument('--device', default='cuda' if torch.cuda.is_available() else 'cpu')
    return p.parse_args()


def build_model(num_classes, base='resnet50'):
    if base == 'resnet50':
        try:
            m = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)
        except Exception:
            m = models.resnet50(pretrained=True)
        in_f = m.fc.in_features
        m.fc = nn.Linear(in_f, num_classes)
    elif base == 'cocoanet':
        import sys
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from cocoa_net import CocoaNet
        m = CocoaNet(num_classes=num_classes)
    else:
        try:
            m = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
        except Exception:
            m = models.resnet18(pretrained=True)
        in_f = m.fc.in_features
        m.fc = nn.Linear(in_f, num_classes)
    return m


def main():
    args = get_args()
    data_root = Path(args.data)
    train_dir = data_root / 'train'
    val_dir = data_root / 'val'
    assert train_dir.exists(), f"Train dir not found: {train_dir}"

    tfms = {
        'train': transforms.Compose([
            transforms.RandomResizedCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
        'val': transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
    }

    train_ds = datasets.ImageFolder(str(train_dir), transform=tfms['train'])
    val_ds = datasets.ImageFolder(str(val_dir), transform=tfms['val']) if val_dir.exists() else None

    num_workers = 0 if os.name == 'nt' else 2
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=num_workers) if val_ds else None

    num_classes = len(train_ds.classes)
    print(f'Training Cocoa Vision AI Model across {num_classes} classes: {train_ds.classes}')

    device = torch.device(args.device)
    model = build_model(num_classes, base=args.model).to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)

    best_acc = 0.0
    for epoch in range(1, args.epochs + 1):
        model.train()
        running = 0.0
        correct = 0
        total = 0
        for xb, yb in train_loader:
            xb, yb = xb.to(device), yb.to(device)
            optimizer.zero_grad()
            out = model(xb)
            loss = criterion(out, yb)
            loss.backward()
            optimizer.step()
            running += loss.item() * xb.size(0)
            _, preds = torch.max(out, 1)
            correct += (preds == yb).sum().item()
            total += xb.size(0)

        train_loss = running / total if total > 0 else 0.0
        train_acc = correct / total if total > 0 else 0.0

        val_acc = 0.0
        if val_loader:
            model.eval()
            v_correct = 0
            v_total = 0
            with torch.no_grad():
                for xb, yb in val_loader:
                    xb, yb = xb.to(device), yb.to(device)
                    out = model(xb)
                    _, preds = torch.max(out, 1)
                    v_correct += (preds == yb).sum().item()
                    v_total += xb.size(0)
            val_acc = v_correct / v_total if v_total > 0 else 0.0

        print(f'Epoch {epoch}/{args.epochs}: train_loss={train_loss:.4f} train_acc={train_acc:.4f} val_acc={val_acc:.4f}')

        if val_acc >= best_acc:
            best_acc = val_acc
            out_path = Path(args.out)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            torch.save({
                'model_state_dict': model.state_dict(),
                'classes': train_ds.classes,
                'arch': args.model,
                'num_classes': num_classes,
                'best_val_acc': best_acc,
                'epoch': epoch
            }, str(out_path))
            print(f'  Saved trained model checkpoint to {out_path}')

    print(f"\nTraining complete! Final model saved to {args.out}")


if __name__ == '__main__':
    main()
