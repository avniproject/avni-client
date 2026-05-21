#!/usr/bin/env python3
"""
make-placeholder-pt.py — produce a tiny TorchScript-traced model for local builds.

Lets a developer exercise the full tanuh build flow (encrypt → APK → on-device inference)
without TANUH's actual MViT2 model. The output:

  • accepts [1, 3, 256, 256] FP32 input — matches `tanuh-mvit2-override.json`'s
    preprocessor output (`mean-target-bgr-rounded` with size [256, 256], CHW, BGR).
  • emits a single FP32 logit — matches the `sigmoid-binary` decoder.

Inference values are *meaningless* (the layer is intentionally near-zero so logit ≈ 0,
probability ≈ 0.5). Use this only to verify build / module-load / preprocessing / decoding
plumbing, not for any kind of accuracy check.

Usage (one-shot, ~500 MB PyTorch CPU wheel):

    python -m venv /tmp/torch-env && source /tmp/torch-env/bin/activate
    pip install torch
    python tools/edge-model/make-placeholder-pt.py

    # Output: tools/edge-model/source/placeholder.pt  (~few KB)

Then drive the regular flow with the placeholder key:

    make tanuh-encrypt TANUH_MODEL_KEY=placeholder
    make run_app_tanuh_dev      # (with `make run_packager` running)

The override JSON `tools/edge-model/tanuh-mvit2-override.json` works as-is: same input
shape, same decoder. The registry will key the model as `placeholder` so JS calls become
`edgeModelService.runInferenceOnImage('placeholder', imagePath)`.
"""
import torch
import torch.nn as nn
from pathlib import Path


class PlaceholderModel(nn.Module):
    """Global-avg-pool over CHW input → tiny linear → 1-D logit."""

    def __init__(self) -> None:
        super().__init__()
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Linear(3, 1)
        # Near-zero weights → output logit ≈ 0 → sigmoid ≈ 0.5 (ambiguous "Positive" decision).
        with torch.no_grad():
            self.fc.weight.zero_()
            self.fc.bias.zero_()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.pool(x).flatten(1)  # [B, 3, 1, 1] → [B, 3]
        return self.fc(x)            # [B, 1]


def main() -> None:
    model = PlaceholderModel().eval()
    example = torch.zeros(1, 3, 256, 256)
    traced = torch.jit.trace(model, example)
    out_path = Path(__file__).resolve().parent / "source" / "placeholder.pt"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    traced.save(str(out_path))
    print(f"wrote {out_path} ({out_path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
