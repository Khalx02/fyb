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

Supports two model architectures:
  - cocoanet: Custom efficient ~1M parameter model (default, recommended)
  - resnet50/resnet18: Standard torchvision models for comparison

Run:
  python python_model/train_vision.py --data ./cocoa_dataset --model cocoanet --epochs 10
"""
import argparse
import os
import time
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
    p.add_argument('--lr', type=float, default=1e-3)
    p.add_argument('--model', default='cocoanet', choices=['cocoanet', 'resnet50', 'resnet18'],
                   help='Model architecture to use (default: cocoanet)')
    p.add_argument('--out', default=None, help='Output path for saved model (default: python_model/model.pth)')
    p.add_argument('--device', default='cuda' if torch.cuda.is_available() else 'cpu')
    p.add_argument('--amp', action='store_true', default=True,
                   help='Use automatic mixed precision training (default: True)')
    p.add_argument('--no-amp', action='store_true', help='Disable AMP')
    p.add_argument('--workers', type=int, default=0, help='DataLoader workers (0 for Windows compatibility)')
    return p.parse_args()


def build_model(num_classes, base='cocoanet', pretrained=True):
    """Build the model architecture based on the selected base."""
    if base == 'cocoanet':
        from cocoa_net import CocoaNet, count_parameters
        m = CocoaNet(num_classes=num_classes)
        print(f'  Built CocoaNet with {count_parameters(m):,} trainable parameters')
        return m
    elif base == 'resnet50':
        m = models.resnet50(weights='IMAGENET1K_V1' if pretrained else None)
        in_f = m.fc.in_features
        m.fc = nn.Linear(in_f, num_classes)
        return m
    else:
        m = models.resnet18(weights='IMAGENET1K_V1' if pretrained else None)
        in_f = m.fc.in_features
        m.fc = nn.Linear(in_f, num_classes)
        return m


def main():
    args = get_args()
    use_amp = args.amp and not args.no_amp and args.device == 'cuda'

    # Set default output path
    if args.out is None:
        args.out = os.path.join(os.path.dirname(__file__), 'model.pth')

    data_root = Path(args.data)
    train_dir = data_root / 'train'
    val_dir = data_root / 'val'
    assert train_dir.exists(), f"Train dir not found: {train_dir}"

    print(f'\n{"="*60}')
    print(f'  CocoaNet Vision Training Pipeline')
    print(f'{"="*60}')
    print(f'  Model:      {args.model}')
    print(f'  Data:       {data_root}')
    print(f'  Epochs:     {args.epochs}')
    print(f'  Batch size: {args.batch_size}')
    print(f'  LR:         {args.lr}')
    print(f'  Device:     {args.device}')
    print(f'  AMP:        {use_amp}')
    print(f'  Output:     {args.out}')
    print(f'{"="*60}\n')

    tfms = {
        'train': transforms.Compose([
            transforms.RandomResizedCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.RandomVerticalFlip(p=0.2),
            transforms.ColorJitter(0.3, 0.3, 0.3, 0.15),
            transforms.RandomRotation(15),
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

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=args.workers)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=args.workers) if val_ds else None

    num_classes = len(train_ds.classes)
    print(f'Classes ({num_classes}): {train_ds.classes}')
    print(f'Training samples: {len(train_ds)}')
    if val_ds:
        print(f'Validation samples: {len(val_ds)}')

    device = torch.device(args.device)
    model = build_model(num_classes, base=args.model, pretrained=(args.model != 'cocoanet')).to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)

    # Cosine annealing scheduler for better convergence
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=args.lr * 0.01)

    # Mixed precision scaler
    scaler = torch.amp.GradScaler('cuda') if use_amp else None

    best_acc = 0.0
    epochs_no_improve = 0
    start_time = time.time()

    for epoch in range(1, args.epochs + 1):
        epoch_start = time.time()
        model.train()
        running = 0.0
        correct = 0
        total = 0

        for xb, yb in train_loader:
            xb, yb = xb.to(device), yb.to(device)
            optimizer.zero_grad()

            if use_amp:
                with torch.amp.autocast('cuda'):
                    out = model(xb)
                    loss = criterion(out, yb)
                scaler.scale(loss).backward()
                scaler.step(optimizer)
                scaler.update()
            else:
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
        epoch_time = time.time() - epoch_start

        print(f'Epoch {epoch}/{args.epochs}: train_loss={train_loss:.4f} train_acc={train_acc:.4f} '
              f'lr={optimizer.param_groups[0]["lr"]:.6f} time={epoch_time:.1f}s')

        val_acc = 0.0
        if val_loader:
            model.eval()
            v_correct = 0
            v_total = 0
            v_loss = 0.0
            with torch.no_grad():
                for xb, yb in val_loader:
                    xb, yb = xb.to(device), yb.to(device)
                    out = model(xb)
                    loss = criterion(out, yb)
                    v_loss += loss.item() * xb.size(0)
                    _, preds = torch.max(out, 1)
                    v_correct += (preds == yb).sum().item()
                    v_total += xb.size(0)
            val_acc = v_correct / v_total if v_total else 0.0
            val_loss = v_loss / v_total if v_total else 0.0
            print(f'  val_loss={val_loss:.4f} val_acc={val_acc:.4f}')

        # Step cosine annealing
        scheduler.step()

        # Checkpointing
        if val_acc > best_acc:
            best_acc = val_acc
            epochs_no_improve = 0
            torch.save({
                'model_state_dict': model.state_dict(),
                'classes': train_ds.classes,
                'arch': args.model,
                'num_classes': num_classes,
                'best_val_acc': best_acc,
                'epoch': epoch,
            }, args.out)
            print(f'  [OK] Saved best model to {args.out} (val_acc={best_acc:.4f})')
        else:
            epochs_no_improve += 1

        # Early stopping
        if epochs_no_improve >= 7:
            print('Early stopping triggered')
            break

    # Save final model if none saved yet
    if best_acc == 0.0:
        torch.save({
            'model_state_dict': model.state_dict(),
            'classes': train_ds.classes,
            'arch': args.model,
            'num_classes': num_classes,
            'best_val_acc': best_acc,
            'epoch': args.epochs,
        }, args.out)
        print(f'Saved final model to {args.out}')

    total_time = time.time() - start_time
    print(f'\n{"="*60}')
    print(f'  Training Complete!')
    print(f'  Best validation accuracy: {best_acc:.4f}')
    print(f'  Total training time: {total_time:.1f}s')
    print(f'  Model saved to: {args.out}')
    print(f'{"="*60}\n')


if __name__ == '__main__':
    main()
