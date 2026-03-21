/**
 * EdgeModelService unit tests.
 *
 * Verifies the lazy-load singleton behaviour: the native TFLiteModule is called once
 * for loadModel (first runInference call) and skipped on subsequent calls.
 */

jest.mock('react-native', () => ({
    NativeModules: {
        TFLiteModule: {
            loadModel: jest.fn(() => Promise.resolve(true)),
            runInference: jest.fn(() => Promise.resolve([0.9, 0.1])),
        },
    },
}));

// The @Service decorator needs a no-op so the module loads outside the app container
jest.mock('../../src/framework/bean/Service', () => () => (target) => target);

import {NativeModules} from 'react-native';
import EdgeModelService from '../../src/service/EdgeModelService';

describe('EdgeModelService', () => {
    let service;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new EdgeModelService(null, null);
    });

    it('loads the model on first runInference call', async () => {
        await service.runInference([1.0, 2.0, 3.0]);

        expect(NativeModules.TFLiteModule.loadModel).toHaveBeenCalledTimes(1);
        expect(NativeModules.TFLiteModule.loadModel).toHaveBeenCalledWith(
            'models/edge_model.tflite'
        );
    });

    it('does not reload the model on subsequent runInference calls', async () => {
        await service.runInference([1.0]);
        await service.runInference([2.0]);
        await service.runInference([3.0]);

        expect(NativeModules.TFLiteModule.loadModel).toHaveBeenCalledTimes(1);
    });

    it('calls runInference with correct model path and input on each call', async () => {
        await service.runInference([1.0, 2.0]);

        expect(NativeModules.TFLiteModule.runInference).toHaveBeenCalledWith(
            'models/edge_model.tflite',
            [1.0, 2.0]
        );
    });

    it('returns the output array from the native module', async () => {
        const result = await service.runInference([1.0, 0.0]);

        expect(result).toEqual([0.9, 0.1]);
    });

    it('propagates load errors from the native module', async () => {
        NativeModules.TFLiteModule.loadModel.mockRejectedValueOnce(
            new Error('TFLITE_LOAD_ERROR: model file not found')
        );

        await expect(service.runInference([1.0])).rejects.toThrow('model file not found');
    });

    it('propagates inference errors from the native module', async () => {
        // First call succeeds so model is marked as loaded
        await service.runInference([1.0]);

        NativeModules.TFLiteModule.runInference.mockRejectedValueOnce(
            new Error('TFLITE_INFERENCE_ERROR: shape mismatch')
        );

        await expect(service.runInference([1.0])).rejects.toThrow('shape mismatch');
    });
});
