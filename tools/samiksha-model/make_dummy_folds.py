"""Writes three made-up ONNX folds with the same input and output shape as the real ones.

Each fold takes `[1, 3, 256, 256]` float32 and returns one logit: 12 times an offset minus
the mean over pixels of the smallest of the three channels. The preprocessing scales every
channel to the same mean, so a large pale patch pulls the rest of the image, and that mean,
down; a lower mean gives a higher logit. The offsets differ per fold, so the folds disagree on
images near the middle. They hold no
trained weights and stand in for the real folds in tests and in the `dummy` image.

Usage: `python make_dummy_folds.py OUT_DIR`.
"""

import sys
from pathlib import Path

import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper

FOLD_NAMES = ("model6", "model8", "model8-2")
OFFSETS = (0.38, 0.41, 0.44)
SLOPE = 12.0


def _graph(offset: float) -> onnx.ModelProto:
    def const(name, value):
        return numpy_helper.from_array(np.array(value, dtype=np.float32), name)

    nodes = [
        helper.make_node("ReduceMin", ["input"], ["lowest"], axes=[1], keepdims=0),
        helper.make_node("ReduceMean", ["lowest"], ["paleness"], axes=[1, 2], keepdims=1),
        helper.make_node("Sub", ["offset", "paleness"], ["shifted"]),
        helper.make_node("Mul", ["shifted", "slope"], ["scaled"]),
        helper.make_node("Reshape", ["scaled", "shape"], ["logit"]),
    ]
    graph = helper.make_graph(
        nodes,
        "dummy_fold",
        [helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, 3, 256, 256])],
        [helper.make_tensor_value_info("logit", TensorProto.FLOAT, [1, 1])],
        initializer=[
            const("offset", offset),
            const("slope", SLOPE),
            numpy_helper.from_array(np.array([1, 1], dtype=np.int64), "shape"),
        ],
    )
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 13)])
    model.ir_version = 8
    onnx.checker.check_model(model)
    return model


def write_dummy_folds(out_dir: Path) -> list[Path]:
    """Writes `model6.onnx`, `model8.onnx` and `model8-2.onnx` into `out_dir`; returns the paths."""
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for name, offset in zip(FOLD_NAMES, OFFSETS, strict=True):
        path = out_dir / f"{name}.onnx"
        onnx.save(_graph(offset), path)
        paths.append(path)
    return paths


if __name__ == "__main__":
    for written in write_dummy_folds(Path(sys.argv[1])):
        print(written)
