"""Generate a synthetic cocoa dataset for training/testing CocoaNet.

Creates procedurally-generated images with distinct visual patterns per class:
  - Leaf: green-toned textures with vein-like patterns
  - Pod: brown/yellow oval shapes with surface texture
  - CutSeed: dark circular patterns on light background
  - WalkClip: green canopy mosaic patterns
  - Other: random noise/non-cocoa patterns

This is a placeholder dataset for verifying the training pipeline.
For production, replace with real labeled cocoa images.

Run:
    python python_model/generate_synthetic_data.py
"""
import os
import random
import math
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    print("Pillow is required. Install with: pip install Pillow")
    raise


def make_leaf_image(size=224):
    """Generate a synthetic leaf-like image with green tones and vein patterns."""
    base_g = random.randint(120, 200)
    img = Image.new('RGB', (size, size), (random.randint(20, 60), base_g, random.randint(20, 60)))
    draw = ImageDraw.Draw(img)

    # Draw vein patterns
    cx, cy = size // 2, size // 2
    for _ in range(random.randint(5, 12)):
        angle = random.uniform(0, 2 * math.pi)
        length = random.randint(40, size // 2)
        ex = cx + int(length * math.cos(angle))
        ey = cy + int(length * math.sin(angle))
        g_var = random.randint(-30, 30)
        draw.line([(cx, cy), (ex, ey)], fill=(40, base_g + g_var, 30), width=random.randint(1, 3))

    # Add some spots
    for _ in range(random.randint(3, 10)):
        x, y = random.randint(0, size - 1), random.randint(0, size - 1)
        r = random.randint(3, 12)
        color = (random.randint(80, 130), random.randint(140, 220), random.randint(30, 80))
        draw.ellipse([x - r, y - r, x + r, y + r], fill=color)

    img = img.filter(ImageFilter.GaussianBlur(radius=1.5))
    return img


def make_pod_image(size=224):
    """Generate a synthetic cocoa pod image with brown/yellow oval shapes."""
    bg_color = (random.randint(20, 60), random.randint(40, 80), random.randint(10, 40))
    img = Image.new('RGB', (size, size), bg_color)
    draw = ImageDraw.Draw(img)

    # Draw the pod (oval shape)
    pod_color = (random.randint(150, 220), random.randint(100, 180), random.randint(20, 80))
    margin = size // 6
    draw.ellipse([margin, margin * 2, size - margin, size - margin * 2], fill=pod_color)

    # Surface ridges
    for i in range(random.randint(4, 8)):
        x = margin + i * (size - 2 * margin) // 8
        draw.line([(x, margin * 2 + 10), (x, size - margin * 2 - 10)],
                  fill=(pod_color[0] - 30, pod_color[1] - 30, pod_color[2]),
                  width=random.randint(1, 3))

    img = img.filter(ImageFilter.GaussianBlur(radius=1.0))
    return img


def make_cutseed_image(size=224):
    """Generate a synthetic cut seed cross-section image."""
    img = Image.new('RGB', (size, size), (random.randint(180, 230), random.randint(170, 210), random.randint(150, 190)))
    draw = ImageDraw.Draw(img)

    # Draw circular seed cross-section
    cx, cy = size // 2, size // 2
    outer_r = random.randint(50, 80)
    inner_r = outer_r - random.randint(10, 20)

    seed_color = (random.randint(80, 140), random.randint(40, 90), random.randint(30, 70))
    draw.ellipse([cx - outer_r, cy - outer_r, cx + outer_r, cy + outer_r], fill=seed_color)

    inner_color = (random.randint(140, 200), random.randint(100, 160), random.randint(80, 130))
    draw.ellipse([cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r], fill=inner_color)

    # Fermentation lines
    for _ in range(random.randint(3, 7)):
        angle = random.uniform(0, 2 * math.pi)
        r = random.randint(10, inner_r - 5)
        x = cx + int(r * math.cos(angle))
        y = cy + int(r * math.sin(angle))
        draw.line([(cx, cy), (x, y)], fill=seed_color, width=1)

    img = img.filter(ImageFilter.GaussianBlur(radius=0.8))
    return img


def make_walkclip_image(size=224):
    """Generate a synthetic farm walk/canopy view image."""
    img = Image.new('RGB', (size, size), (30, random.randint(80, 130), 30))
    draw = ImageDraw.Draw(img)

    # Mosaic of green patches (canopy view)
    patch_size = random.randint(15, 35)
    for y in range(0, size, patch_size):
        for x in range(0, size, patch_size):
            g = random.randint(60, 200)
            r = random.randint(10, 60)
            b = random.randint(10, 50)
            draw.rectangle([x, y, x + patch_size - 1, y + patch_size - 1], fill=(r, g, b))

    # Add some trunk/branch lines
    for _ in range(random.randint(1, 4)):
        x = random.randint(0, size)
        trunk_color = (random.randint(60, 100), random.randint(40, 70), random.randint(20, 40))
        draw.line([(x, size), (x + random.randint(-30, 30), 0)], fill=trunk_color, width=random.randint(3, 8))

    img = img.filter(ImageFilter.GaussianBlur(radius=2.0))
    return img


def make_other_image(size=224):
    """Generate a random non-cocoa image (noise patterns, urban textures, etc.)."""
    img = Image.new('RGB', (size, size))
    draw = ImageDraw.Draw(img)

    # Random background
    bg = (random.randint(100, 255), random.randint(100, 255), random.randint(100, 255))
    draw.rectangle([0, 0, size, size], fill=bg)

    # Random geometric shapes
    for _ in range(random.randint(5, 20)):
        shape = random.choice(['rect', 'circle', 'line'])
        color = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
        x1, y1 = random.randint(0, size), random.randint(0, size)
        x2, y2 = random.randint(0, size), random.randint(0, size)
        if shape == 'rect':
            draw.rectangle([min(x1, x2), min(y1, y2), max(x1, x2), max(y1, y2)], fill=color)
        elif shape == 'circle':
            r = random.randint(5, 40)
            draw.ellipse([x1 - r, y1 - r, x1 + r, y1 + r], fill=color)
        else:
            draw.line([(x1, y1), (x2, y2)], fill=color, width=random.randint(1, 5))

    return img


GENERATORS = {
    'Leaf': make_leaf_image,
    'Pod': make_pod_image,
    'CutSeed': make_cutseed_image,
    'WalkClip': make_walkclip_image,
    'Other': make_other_image,
}


def generate_dataset(out_dir: str, train_per_class: int = 80, val_per_class: int = 20, size: int = 224):
    """Generate the full synthetic dataset in ImageFolder layout."""
    out = Path(out_dir)

    total_images = (train_per_class + val_per_class) * len(GENERATORS)
    print(f"Generating {total_images} synthetic images across {len(GENERATORS)} classes...")
    print(f"  Train: {train_per_class} per class = {train_per_class * len(GENERATORS)} total")
    print(f"  Val:   {val_per_class} per class = {val_per_class * len(GENERATORS)} total")
    print(f"  Output: {out}")

    for cls_name, gen_fn in GENERATORS.items():
        # Create train and val directories
        train_dir = out / 'train' / cls_name
        val_dir = out / 'val' / cls_name
        train_dir.mkdir(parents=True, exist_ok=True)
        val_dir.mkdir(parents=True, exist_ok=True)

        # Generate training images
        for i in range(train_per_class):
            img = gen_fn(size)
            img.save(train_dir / f'{cls_name.lower()}_{i:04d}.jpg', 'JPEG', quality=90)

        # Generate validation images
        for i in range(val_per_class):
            img = gen_fn(size)
            img.save(val_dir / f'{cls_name.lower()}_{i:04d}.jpg', 'JPEG', quality=90)

        print(f"  [OK] {cls_name}: {train_per_class} train + {val_per_class} val")

    print(f"\nDataset generation complete! -> {out}")


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Generate synthetic cocoa dataset')
    parser.add_argument('--out', default=os.path.join(os.path.dirname(__file__), 'cocoa_dataset'),
                        help='Output directory for the dataset')
    parser.add_argument('--train-per-class', type=int, default=80,
                        help='Number of training images per class')
    parser.add_argument('--val-per-class', type=int, default=20,
                        help='Number of validation images per class')
    parser.add_argument('--size', type=int, default=224, help='Image size in pixels')
    args = parser.parse_args()
    generate_dataset(args.out, args.train_per_class, args.val_per_class, args.size)
