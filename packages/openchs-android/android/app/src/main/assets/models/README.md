# Edge Model Assets

Place the TFLite model file here:

```
models/edge_model.tflite
```

This file is loaded at runtime by `TFLiteModule` and accessed via the `edgeModelService`
in rule params (`params.services.edgeModelService.runInference(inputArray)`).

The `.tflite` binary is not checked into the repo. Obtain it from the model training pipeline
and place it here before building the APK.
