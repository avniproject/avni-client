/**
 * Runs the table of combining cases in tools/samiksha-model/combining-cases.json through
 * EdgeModelService.runEnsembleInferenceOnImage.
 *
 * The Samiksha model container (tools/samiksha-model) copies this combining into Kotlin and runs
 * the same table in its own tests. If the combining here changes, this test fails until the table
 * and the Kotlin copy are updated.
 */

jest.mock('react-native-fs', () => ({
    DocumentDirectoryPath: '/mock/private',
    ExternalDirectoryPath: '/mock/external',
    exists: jest.fn(() => Promise.resolve(true)),
    readFile: jest.fn(() => Promise.resolve('base64-key')),
    unlink: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native', () => ({
    NativeModules: {
        EdgeModelModule: {
            loadEncryptedModelFromFile: jest.fn(() => Promise.resolve(true)),
            runInferenceOnImage: jest.fn(),
        },
    },
}));

jest.mock('../../src/framework/bean/Service', () => () => (target) => target);

jest.mock('../../src/utility/Analytics', () => ({
    firebaseEvents: {
        MODEL_INFERENCE_CONSOLIDATED: 'model_inference_consolidated',
        MODEL_INFERENCE_INDIVIDUAL: 'model_inference_individual'
    },
    logEvent: jest.fn()
}));

import fs from 'fs';
import path from 'path';
import {NativeModules} from 'react-native';
import EdgeModelService from '../../src/service/EdgeModelService';

const TABLE = JSON.parse(fs.readFileSync(
    path.resolve(__dirname, '../../../../tools/samiksha-model/combining-cases.json'), 'utf8'));

const SHAS = ['fold1', 'fold2', 'fold3'];

const OVERRIDE = {
    engine: 'onnx',
    input: {preprocessor: 'mean-target-bgr-rounded', params: {size: [256, 256]}},
    output: {decoder: 'sigmoid-binary', params: {threshold: 0.5}},
};

// The table writes non-finite numbers as strings, which JSON cannot hold.
const toNumbers = (fold) => Object.fromEntries(Object.entries(fold).map(([k, v]) =>
    [k, v === 'NaN' ? NaN : v === 'Infinity' ? Infinity : v]));

const row = (sha256, params) => {
    const payload = {...OVERRIDE, output: {...OVERRIDE.output, params}};
    return {
        category: 'edgeModel', sha256, contentKey: `models/${sha256}.bin`, needsKey: true, voided: false,
        payload: JSON.stringify(payload),
        getPayload() { return JSON.parse(this.payload); },
    };
};

describe('EdgeModelService combining, shared table of cases', () => {
    TABLE.cases.forEach((c) => {
        it(c.name, async () => {
            const service = new EdgeModelService(null, null);
            service.getAllNonVoided = () => SHAS.map(sha => row(sha, c.params));
            service._ensureLoaded = jest.fn(() => Promise.resolve());
            NativeModules.EdgeModelModule.runInferenceOnImage.mockImplementation((sha) => {
                const fold = c.folds[SHAS.indexOf(sha)];
                return fold.error ? Promise.reject(new Error(fold.error)) : Promise.resolve(toNumbers(fold));
            });

            const run = service.runEnsembleInferenceOnImage('/tmp/x.jpg');

            if (c.expect === 'throws') {
                await expect(run).rejects.toThrow();
            } else {
                const result = await run;
                expect(result.label).toBe(c.expect.label);
                expect(result.confidence).toBeCloseTo(c.expect.confidence, 9);
            }
            if (service._flushTimer) {
                clearTimeout(service._flushTimer);
            }
        });
    });
});
