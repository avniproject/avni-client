import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {NativeModules} from "react-native";

const MODEL_ASSET_PATH = 'models/edge_model.tflite';

/**
 * Wraps the TFLiteModule native module with a lazy-load singleton pattern.
 *
 * The native interpreter is loaded once on first use and kept alive for subsequent calls.
 * Access from decision rules via: params.services.edgeModelService.runInference([...])
 *
 * Example rule usage:
 *   const result = await params.services.edgeModelService.runInference([1.0, 2.0, 3.0]);
 *   // result is a number[] matching the model's output tensor shape
 */
@Service("edgeModelService")
class EdgeModelService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this._modelLoaded = false;
    }

    init() {}

    async runInference(inputData) {
        if (!this._modelLoaded) {
            await NativeModules.TFLiteModule.loadModel(MODEL_ASSET_PATH);
            this._modelLoaded = true;
        }
        return NativeModules.TFLiteModule.runInference(MODEL_ASSET_PATH, inputData);
    }

    /**
     * Run inference on an image file.
     * imagePath — absolute path on the device (e.g. from react-native-image-picker: response.assets[0].uri stripped of 'file://')
     * Returns Promise<number[]> — same output array as runInference.
     */
    async runInferenceOnImage(imagePath) {
        if (!this._modelLoaded) {
            await NativeModules.TFLiteModule.loadModel(MODEL_ASSET_PATH);
            this._modelLoaded = true;
        }
        return NativeModules.TFLiteModule.runInferenceOnImage(MODEL_ASSET_PATH, imagePath);
    }
}

export default EdgeModelService;
