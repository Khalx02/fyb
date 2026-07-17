"""CocoaNet — A custom lightweight CNN (~1M parameters) for cocoa image classification.

Architecture uses depthwise separable convolutions and inverted residual blocks
with squeeze-and-excitation (SE) attention for maximum parameter efficiency.
Designed for 5-class cocoa classification: Leaf, Pod, CutSeed, WalkClip, Other.

Run standalone to verify parameter count:
    python python_model/cocoa_net.py
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class SqueezeExcitation(nn.Module):
    """Squeeze-and-Excitation channel attention block."""

    def __init__(self, channels: int, reduction: int = 4):
        super().__init__()
        mid = max(channels // reduction, 8)
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Sequential(
            nn.Linear(channels, mid, bias=False),
            nn.SiLU(inplace=True),
            nn.Linear(mid, channels, bias=False),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        b, c, _, _ = x.shape
        w = self.pool(x).view(b, c)
        w = self.fc(w).view(b, c, 1, 1)
        return x * w


class DepthwiseSeparableConv(nn.Module):
    """Depthwise separable convolution: depthwise + pointwise.
    
    Far more parameter-efficient than standard convolutions.
    A standard 3×3 conv with C_in→C_out costs C_in * C_out * 9 params.
    Depthwise separable costs C_in * 9 + C_in * C_out params — roughly 9× cheaper.
    """

    def __init__(self, in_channels: int, out_channels: int, stride: int = 1):
        super().__init__()
        self.depthwise = nn.Conv2d(
            in_channels, in_channels, kernel_size=3, stride=stride,
            padding=1, groups=in_channels, bias=False
        )
        self.bn1 = nn.BatchNorm2d(in_channels)
        self.pointwise = nn.Conv2d(in_channels, out_channels, kernel_size=1, bias=False)
        self.bn2 = nn.BatchNorm2d(out_channels)
        self.act = nn.SiLU(inplace=True)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.act(self.bn1(self.depthwise(x)))
        x = self.act(self.bn2(self.pointwise(x)))
        return x


class InvertedResidualBlock(nn.Module):
    """MobileNetV2-style inverted residual block with SE attention.
    
    1. Pointwise expansion (1×1 conv to expand channels)
    2. Depthwise convolution (3×3 conv, per-channel)
    3. Squeeze-and-Excitation attention
    4. Pointwise projection (1×1 conv to reduce channels)
    5. Residual connection if input/output shapes match
    """

    def __init__(self, in_channels: int, out_channels: int, expand_ratio: int = 4,
                 stride: int = 1, use_se: bool = True):
        super().__init__()
        mid_channels = in_channels * expand_ratio
        self.use_residual = (stride == 1 and in_channels == out_channels)

        layers = []
        # Expansion phase (pointwise)
        if expand_ratio != 1:
            layers.extend([
                nn.Conv2d(in_channels, mid_channels, 1, bias=False),
                nn.BatchNorm2d(mid_channels),
                nn.SiLU(inplace=True),
            ])

        # Depthwise phase
        layers.extend([
            nn.Conv2d(mid_channels, mid_channels, 3, stride=stride,
                      padding=1, groups=mid_channels, bias=False),
            nn.BatchNorm2d(mid_channels),
            nn.SiLU(inplace=True),
        ])

        # Squeeze-and-excitation
        if use_se:
            layers.append(SqueezeExcitation(mid_channels, reduction=4))

        # Projection phase (pointwise, no activation — linear bottleneck)
        layers.extend([
            nn.Conv2d(mid_channels, out_channels, 1, bias=False),
            nn.BatchNorm2d(out_channels),
        ])

        self.block = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out = self.block(x)
        if self.use_residual:
            out = out + x
        return out


class CocoaNet(nn.Module):
    """Custom efficient CNN for cocoa image classification.
    
    Architecture summary (224×224 input):
        Stem:   3→32    (standard conv, stride 2) → 112×112
        Stage1: 32→24   (IRB ×2, stride 2)       → 56×56
        Stage2: 24→48   (IRB ×3, stride 2)        → 28×28
        Stage3: 48→96   (IRB ×3, stride 2)        → 14×14
        Stage4: 96→160  (IRB ×3, stride 2)        → 7×7
        Stage5: 160→256 (IRB ×1, stride 1)        → 7×7
        Head:   256→num_classes (GAP + dropout + FC)
    
    Total: ~1,000,000 parameters
    """

    def __init__(self, num_classes: int = 5, dropout: float = 0.2):
        super().__init__()

        # Stem: standard conv for initial feature extraction
        self.stem = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, stride=2, padding=1, bias=False),
            nn.BatchNorm2d(32),
            nn.SiLU(inplace=True),
        )

        # Build stages using inverted residual blocks
        # Config: (in_ch, out_ch, expand_ratio, stride, num_blocks)
        stage_configs = [
            (32,  24,  3, 2, 2),   # Stage 1
            (24,  48,  3, 2, 3),   # Stage 2
            (48,  96,  4, 2, 3),   # Stage 3
            (96,  160, 4, 2, 3),   # Stage 4
            (160, 256, 4, 1, 1),   # Stage 5
        ]

        stages = []
        for in_ch, out_ch, expand, stride, n_blocks in stage_configs:
            for i in range(n_blocks):
                s = stride if i == 0 else 1
                c_in = in_ch if i == 0 else out_ch
                stages.append(InvertedResidualBlock(c_in, out_ch, expand_ratio=expand, stride=s))

        self.stages = nn.Sequential(*stages)

        # Classification head
        self.head = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Dropout(p=dropout),
            nn.Linear(256, num_classes),
        )

        # Initialize weights
        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode='fan_out', nonlinearity='relu')
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.ones_(m.weight)
                nn.init.zeros_(m.bias)
            elif isinstance(m, nn.Linear):
                nn.init.normal_(m.weight, 0, 0.01)
                if m.bias is not None:
                    nn.init.zeros_(m.bias)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.stem(x)
        x = self.stages(x)
        x = self.head(x)
        return x


def count_parameters(model: nn.Module) -> int:
    """Count total trainable parameters in a model."""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


def model_summary(model: nn.Module, input_size: tuple = (1, 3, 224, 224)):
    """Print a summary of the model architecture and parameter count."""
    total = count_parameters(model)
    print(f"\n{'='*60}")
    print(f"  CocoaNet Model Summary")
    print(f"{'='*60}")
    print(f"  Total trainable parameters: {total:,}")
    print(f"  Model size (approx):        {total * 4 / 1024 / 1024:.2f} MB (FP32)")
    print(f"  Model size (approx):        {total * 2 / 1024 / 1024:.2f} MB (FP16)")
    print(f"{'='*60}")

    # Per-stage breakdown
    print(f"\n  Layer breakdown:")
    print(f"  {'Component':<30} {'Parameters':>12}")
    print(f"  {'-'*42}")
    
    stem_params = sum(p.numel() for p in model.stem.parameters() if p.requires_grad)
    print(f"  {'Stem':<30} {stem_params:>12,}")
    
    stages_params = sum(p.numel() for p in model.stages.parameters() if p.requires_grad)
    print(f"  {'Stages (IRB blocks)':<30} {stages_params:>12,}")
    
    head_params = sum(p.numel() for p in model.head.parameters() if p.requires_grad)
    print(f"  {'Head (GAP + FC)':<30} {head_params:>12,}")
    
    print(f"  {'-'*42}")
    print(f"  {'TOTAL':<30} {total:>12,}")

    # Verify forward pass works
    dummy = torch.randn(*input_size)
    with torch.no_grad():
        out = model(dummy)
    print(f"\n  Input shape:  {list(dummy.shape)}")
    print(f"  Output shape: {list(out.shape)}")
    print(f"{'='*60}\n")
    return total


if __name__ == '__main__':
    # Build model and verify parameter count
    model = CocoaNet(num_classes=5)
    total = model_summary(model)
    
    # Verify target
    target = 1_000_000
    diff_pct = abs(total - target) / target * 100
    if diff_pct <= 15:
        print(f"  ✓ Parameter count {total:,} is within 15% of target {target:,} ({diff_pct:.1f}% off)")
    else:
        print(f"  ✗ Parameter count {total:,} is {diff_pct:.1f}% off from target {target:,}")
        print(f"    Adjust stage configs to get closer to target.")
