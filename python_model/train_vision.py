"""Transfer-learning training script for cocoa image classification.
Expects a directory with ImageFolder structure:
  dataset/
    train/
      Leaf/
      Pod/
      CutSeed/
      WalkClip/
      Other/
    val/

Run:
  python3 python_model/train_vision.py --data ./cocoa_dataset --epochs 10
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
    p.add_argument('--data', required=True, help='Path to dataset root with train/val folders')
    p.add_argument('--epochs', type=int, default=10)
    p.add_argument('--batch-size', type=int, default=32)
    p.add_argument('--lr', type=float, default=1e-4)
    p.add_argument('--model', default='resnet50')
    p.add_argument('--out', default='model.pth')
    p.add_argument('--device', default='cuda' if torch.cuda.is_available() else 'cpu')
    return p.parse_args()


def build_model(num_classes, base='resnet50', pretrained=True):
    if base == 'resnet50':
        m = models.resnet50(pretrained=pretrained)
        in_f = m.fc.in_features
        m.fc = nn.Linear(in_f, num_classes)
    elif base == 'cocoanet':
        import sys
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from cocoa_net import CocoaNet
        m = CocoaNet(num_classes=num_classes)
    else:
        m = models.resnet18(pretrained=pretrained)
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
            transforms.ColorJitter(0.2,0.2,0.2,0.1),
            transforms.ToTensor(),
            transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
        ]),
        'val': transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
        ])
    }

    train_ds = datasets.ImageFolder(str(train_dir), transform=tfms['train'])
    val_ds = datasets.ImageFolder(str(val_dir), transform=tfms['val']) if val_dir.exists() else None

    num_workers = 0 if os.name == 'nt' else 4
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=num_workers) if val_ds else None

    num_classes = len(train_ds.classes)
    print('Classes:', train_ds.classes)

    device = torch.device(args.device)
    model = build_model(num_classes, base=args.model).to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=args.lr)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, factor=0.5, patience=2)

    best_acc = 0.0
    epochs_no_improve = 0
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

        train_loss = running / total
        train_acc = correct / total
        print(f'Epoch {epoch}: train_loss={train_loss:.4f} train_acc={train_acc:.4f}')

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
            val_acc = v_correct / v_total if v_total else 0.0
            print(f'  val_acc={val_acc:.4f}')

        # Scheduler step on validation accuracy
        if val_loader:
            scheduler.step(1.0 - val_acc)

        # Checkpointing
        if val_acc > best_acc:
            best_acc = val_acc
            epochs_no_improve = 0
            torch.save({'model_state_dict': model.state_dict(), 'classes': train_ds.classes, 'arch': args.model, 'best_val_acc': best_acc, 'epoch': epoch}, args.out)
            print('  Saved best model to', args.out)
        else:
            epochs_no_improve += 1

        # Early stopping
        if epochs_no_improve >= 5:
            print('Early stopping triggered')
            break

    # Save final model if none saved
    if best_acc == 0.0:
        torch.save({'model_state_dict': model.state_dict(), 'classes': train_ds.classes, 'arch': args.model, 'best_val_acc': best_acc, 'epoch': args.epochs}, args.out)
        print('Saved final model to', args.out)


if __name__ == '__main__':
    main()
