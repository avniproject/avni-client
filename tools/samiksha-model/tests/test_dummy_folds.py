import onnx
import pytest

from make_dummy_folds import FOLD_NAMES, write_dummy_folds


@pytest.fixture(scope="module")
def folds(tmp_path_factory):
    paths = write_dummy_folds(tmp_path_factory.mktemp("folds"))
    assert [p.name for p in paths] == [f"{n}.onnx" for n in FOLD_NAMES]
    return [onnx.load(p) for p in paths]


def _dims(value_info):
    return [d.dim_value for d in value_info.type.tensor_type.shape.dim]


def test_dummy_folds_shapes(folds):
    for model in folds:
        onnx.checker.check_model(model)
        assert _dims(model.graph.input[0]) == [1, 3, 256, 256]
        assert model.graph.input[0].type.tensor_type.elem_type == onnx.TensorProto.FLOAT
        assert _dims(model.graph.output[0]) == [1, 1]
