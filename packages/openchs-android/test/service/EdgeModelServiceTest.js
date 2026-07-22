/**
 * EdgeModelService unit tests.
 *
 * Verifies the DownloadableContent-driven design (avniproject/avni-client#1949):
 *   • The model is resolved from synced `edgeModel` content rows, not an in-APK registry.
 *   • Each row loads via loadEncryptedModelFromFile with its cached blob path, app-private
 *     key, sha256, and overrideJson built from the row's payload.
 *   • An ensemble = multiple rows, each loaded from its own path/key.
 *   • A missing cached blob or key degrades gracefully (no native load, no throw via schedule;
 *     inference absent).
 *   • An unknown/empty engine in the payload fails loud.
 */

const mockFsState = {existing: new Set(), files: {}};
jest.mock('react-native-fs', () => ({
    DocumentDirectoryPath: '/mock/private',
    ExternalDirectoryPath: '/mock/external',
    exists: jest.fn((p) => Promise.resolve(mockFsState.existing.has(p))),
    readFile: jest.fn((p) => Promise.resolve(mockFsState.files[p])),
    unlink: jest.fn((p) => { mockFsState.existing.delete(p); return Promise.resolve(); }),
}));

jest.mock('react-native', () => ({
    NativeModules: {
        EdgeModelModule: {
            loadEncryptedModelFromFile: jest.fn(() => Promise.resolve(true)),
            runInferenceOnImage: jest.fn(() => Promise.resolve({label: 'Positive', confidence: 0.9})),
        },
    },
}));

// The @Service decorator needs a no-op so the module loads outside the app container.
jest.mock('../../src/framework/bean/Service', () => () => (target) => target);

import {NativeModules} from 'react-native';
import fs from 'react-native-fs';
import EdgeModelService from '../../src/service/EdgeModelService';
import FileSystem from '../../src/model/FileSystem';
import General from '../../src/utility/General';

const MODELS_DIR = FileSystem.getModelsDir();
const KEYS_DIR = FileSystem.getModelKeysDir();
const blobPath = (sha) => `${MODELS_DIR}/${sha}.bin`;
const keyPath = (sha) => `${KEYS_DIR}/${sha}.key`;

const OVERRIDE = {
    engine: 'onnx',
    input: {preprocessor: 'mean-target-bgr-rounded', params: {size: [256, 256]}},
    output: {decoder: 'sigmoid-binary', params: {threshold: 0.5, labels: ['Negative', 'Positive']}},
};

// Mirrors DownloadableContent: payload is a JSON string, getPayload() parses it.
const row = (overrides = {}) => {
    const base = {
        category: 'edgeModel', sha256: 'sha-a', contentKey: 'models/sha-a.bin', needsKey: true, voided: false,
        payload: JSON.stringify(OVERRIDE), ...overrides,
    };
    return {
        ...base,
        getPayload() {
            if (!this.payload) return {};
            try {
                const p = JSON.parse(this.payload);
                return p && typeof p === 'object' && !Array.isArray(p) ? p : {};
            } catch (e) {
                return {};
            }
        },
    };
};

// Marks a row's blob (+ key if needsKey) as present in the cache with the given key bytes.
const cacheRow = (r, keyBytes = 'base64-key') => {
    mockFsState.existing.add(blobPath(r.sha256));
    if (r.needsKey) {
        mockFsState.existing.add(keyPath(r.sha256));
        mockFsState.files[keyPath(r.sha256)] = keyBytes;
    }
};

describe('EdgeModelService', () => {
    let service;
    let rows;

    beforeEach(() => {
        jest.clearAllMocks();
        mockFsState.existing = new Set();
        mockFsState.files = {};
        rows = [];

        service = new EdgeModelService(null, null);
        service.getAllNonVoided = () => rows;
    });

    const flushInference = () => service._flushPendingResults();

    afterEach(() => {
        if (service && service._flushTimer) {
            clearTimeout(service._flushTimer);
            service._flushTimer = null;
        }
    });

    describe('resolution from DownloadableContent', () => {
        it('loads a single edgeModel row via loadEncryptedModelFromFile with cached path, key, sha256 and overrideJson from payload', async () => {
            const r = row();
            rows = [r];
            cacheRow(r);

            await service.runInferenceOnImage('/tmp/x.jpg');

            expect(NativeModules.EdgeModelModule.loadEncryptedModelFromFile).toHaveBeenCalledTimes(1);
            const [modelKey, path, key, sha, overrideJson] =
                NativeModules.EdgeModelModule.loadEncryptedModelFromFile.mock.calls[0];
            expect(modelKey).toBe('sha-a');
            expect(path).toBe(blobPath('sha-a'));
            expect(key).toBe('base64-key');
            expect(sha).toBe('sha-a');
            expect(JSON.parse(overrideJson)).toEqual(OVERRIDE);
        });

        it('runs inference against the row sha256 after loading', async () => {
            const r = row();
            rows = [r];
            cacheRow(r);

            await service.runInferenceOnImage('/tmp/x.jpg');

            expect(NativeModules.EdgeModelModule.runInferenceOnImage).toHaveBeenCalledWith('sha-a', '/tmp/x.jpg');
        });

        it('passes a null key for a row that does not need one', async () => {
            const r = row({needsKey: false});
            rows = [r];
            cacheRow(r);

            await service.runInferenceOnImage('/tmp/x.jpg');

            const [, , key] = NativeModules.EdgeModelModule.loadEncryptedModelFromFile.mock.calls[0];
            expect(key).toBeNull();
        });

        it('does not reload the model on subsequent inference calls', async () => {
            const r = row();
            rows = [r];
            cacheRow(r);

            await service.runInferenceOnImage('/tmp/a.jpg');
            await service.runInferenceOnImage('/tmp/b.jpg');

            expect(NativeModules.EdgeModelModule.loadEncryptedModelFromFile).toHaveBeenCalledTimes(1);
        });

        it('throws when no edgeModel row is synced', async () => {
            rows = [];
            await expect(service.runInferenceOnImage('/tmp/x.jpg'))
                .rejects.toThrow('no edgeModel content row is synced');
        });

        it('ignores rows of other categories', async () => {
            const r = row();
            rows = [r, row({category: 'other', sha256: 'sha-other'})];
            cacheRow(r);

            await service.runInferenceOnImage('/tmp/x.jpg');

            expect(NativeModules.EdgeModelModule.loadEncryptedModelFromFile).toHaveBeenCalledTimes(1);
            expect(NativeModules.EdgeModelModule.loadEncryptedModelFromFile.mock.calls[0][0]).toBe('sha-a');
        });
    });

    describe('model-version change (sha256 changes)', () => {
        it('loads the new blob/key/sha256 when a row sha256 changes — does not serve the stale handle', async () => {
            const v1 = row({sha256: 'sha-v1'});
            rows = [v1];
            cacheRow(v1, 'key-v1');

            await service.runInferenceOnImage('/tmp/x.jpg');
            expect(NativeModules.EdgeModelModule.loadEncryptedModelFromFile).toHaveBeenCalledTimes(1);
            expect(NativeModules.EdgeModelModule.loadEncryptedModelFromFile.mock.calls[0][0]).toBe('sha-v1');

            // Admin republishes the model: the synced row now carries a new sha256.
            const v2 = row({sha256: 'sha-v2'});
            rows = [v2];
            cacheRow(v2, 'key-v2');

            await service.runInferenceOnImage('/tmp/x.jpg');

            // A new cache key ⇒ a fresh native load with the new blob/key/sha256.
            expect(NativeModules.EdgeModelModule.loadEncryptedModelFromFile).toHaveBeenCalledTimes(2);
            const [modelKey, path, key, sha] =
                NativeModules.EdgeModelModule.loadEncryptedModelFromFile.mock.calls[1];
            expect(modelKey).toBe('sha-v2');
            expect(path).toBe(blobPath('sha-v2'));
            expect(key).toBe('key-v2');
            expect(sha).toBe('sha-v2');
            // Inference runs against the new version, not the cached one.
            expect(NativeModules.EdgeModelModule.runInferenceOnImage).toHaveBeenLastCalledWith('sha-v2', '/tmp/x.jpg');
        });
    });

    describe('overrideJson mapping', () => {
        it('builds overrideJson verbatim from the row payload (engine/preprocessor/decoder DSL)', async () => {
            const r = row();
            rows = [r];
            cacheRow(r);

            await service.runInferenceOnImage('/tmp/x.jpg');

            const overrideJson = NativeModules.EdgeModelModule.loadEncryptedModelFromFile.mock.calls[0][4];
            const parsed = JSON.parse(overrideJson);
            expect(parsed.engine).toBe('onnx');
            expect(parsed.input.preprocessor).toBe('mean-target-bgr-rounded');
            expect(parsed.output.decoder).toBe('sigmoid-binary');
        });

        it('fails loud on an unknown engine — passes the faithful payload mapping to native, then propagates its rejection', async () => {
            const unknownEnginePayload = {
                engine: 'made-up-engine',
                input: {preprocessor: 'mean-target-bgr-rounded', params: {size: [128, 128]}},
                output: {decoder: 'sigmoid-binary', params: {threshold: 0.4}},
            };
            const r = row({payload: JSON.stringify(unknownEnginePayload)});
            rows = [r];
            cacheRow(r);
            NativeModules.EdgeModelModule.loadEncryptedModelFromFile.mockRejectedValueOnce(
                new Error("Unknown or unavailable engine.")
            );

            await expect(service.runInferenceOnImage('/tmp/x.jpg'))
                .rejects.toThrow('Unknown or unavailable engine.');

            // The JS must have handed native exactly the payload-derived overrideJson — the
            // rejection is the native engine rejecting that mapping, not a JS-side shortcut.
            expect(NativeModules.EdgeModelModule.loadEncryptedModelFromFile).toHaveBeenCalledTimes(1);
            const sentOverride = NativeModules.EdgeModelModule.loadEncryptedModelFromFile.mock.calls[0][4];
            expect(JSON.parse(sentOverride)).toEqual(unknownEnginePayload);
            // The bad engine reached native, so inference must never have been attempted.
            expect(NativeModules.EdgeModelModule.runInferenceOnImage).not.toHaveBeenCalled();
        });

        it('fails loud when payload is absent — passes null overrideJson and propagates the native rejection', async () => {
            const r = row({payload: null});
            rows = [r];
            cacheRow(r);
            // The native side rejects a null override loudly.
            NativeModules.EdgeModelModule.loadEncryptedModelFromFile.mockRejectedValueOnce(
                new Error("Missing model override.")
            );

            await expect(service.runInferenceOnImage('/tmp/x.jpg'))
                .rejects.toThrow('Missing model override.');

            expect(NativeModules.EdgeModelModule.loadEncryptedModelFromFile.mock.calls[0][4]).toBeNull();
            expect(NativeModules.EdgeModelModule.runInferenceOnImage).not.toHaveBeenCalled();
        });

        it('passes null overrideJson when payload is an empty object', async () => {
            const r = row({payload: JSON.stringify({})});
            rows = [r];
            cacheRow(r);

            await service.runInferenceOnImage('/tmp/x.jpg');

            expect(NativeModules.EdgeModelModule.loadEncryptedModelFromFile.mock.calls[0][4]).toBeNull();
        });
    });

    describe('ensemble (multiple rows)', () => {
        const FOLDS = [
            row({sha256: 'fold1'}),
            row({sha256: 'fold2'}),
            row({sha256: 'fold3'}),
        ];

        const mockPerFold = (byKey) =>
            NativeModules.EdgeModelModule.runInferenceOnImage.mockImplementation((sha) => Promise.resolve(byKey[sha]));

        beforeEach(() => {
            rows = FOLDS;
            FOLDS.forEach(r => cacheRow(r));
        });

        it('loads each fold from its own cached path and key', async () => {
            mockPerFold({
                fold1: {confidence: 0.8, logit: 1.0}, fold2: {confidence: 0.6, logit: 0.4}, fold3: {confidence: 0.7, logit: 0.8},
            });

            await service.runInferenceOnImage('/tmp/x.jpg');

            expect(NativeModules.EdgeModelModule.loadEncryptedModelFromFile).toHaveBeenCalledTimes(3);
            const calls = NativeModules.EdgeModelModule.loadEncryptedModelFromFile.mock.calls;
            const byKey = Object.fromEntries(calls.map(c => [c[0], c]));
            for (const sha of ['fold1', 'fold2', 'fold3']) {
                expect(byKey[sha][1]).toBe(blobPath(sha));
                expect(byKey[sha][3]).toBe(sha);
            }
        });

        it('unanimous-and (default): Positive only when all folds decode positive', async () => {
            mockPerFold({
                fold1: {label: 'Positive', confidence: 0.8, logit: 1.2},
                fold2: {label: 'Positive', confidence: 0.6, logit: 0.4},
                fold3: {label: 'Positive', confidence: 0.9, logit: 2.0},
            });

            const r = await service.runInferenceOnImage('/tmp/x.jpg');

            expect(NativeModules.EdgeModelModule.runInferenceOnImage).toHaveBeenCalledTimes(3);
            expect(r.positive).toBe(true);
            expect(r.label).toBe('Positive');
            expect(r.confidence).toBeCloseTo(0.6, 6); // min(perModel.confidence) — the weakest fold
            expect(r.perModel.map(p => p.sha256)).toEqual(['fold1', 'fold2', 'fold3']);
        });

        it('any single fold Negative ⇒ Negative (AND truth table)', async () => {
            const positives = {
                fold1: {label: 'Positive', confidence: 0.8, logit: 1.2},
                fold2: {label: 'Positive', confidence: 0.6, logit: 0.4},
                fold3: {label: 'Positive', confidence: 0.9, logit: 2.0},
            };
            for (const neg of ['fold1', 'fold2', 'fold3']) {
                mockPerFold({...positives, [neg]: {label: 'Negative', confidence: 0.2, logit: -1.2}});

                const r = await service.runInferenceOnImage('/tmp/x.jpg');

                expect(r.positive).toBe(false);
                expect(r.label).toBe('Negative');
            }
        });

        it('all folds Negative ⇒ Negative', async () => {
            mockPerFold({
                fold1: {label: 'Negative', confidence: 0.1, logit: -2.2},
                fold2: {label: 'Negative', confidence: 0.2, logit: -1.4},
                fold3: {label: 'Negative', confidence: 0.3, logit: -0.8},
            });

            const r = await service.runInferenceOnImage('/tmp/x.jpg');

            expect(r.positive).toBe(false);
            expect(r.label).toBe('Negative');
        });

        it('fails loud on a fold with a non-finite logit — no silent negative (#1985 code-review)', async () => {
            // A fold whose model output is NaN: the native decoder yields sigmoid(NaN)>threshold = false
            // → label 'Negative'. Without the guard the ensemble would resolve NEGATIVE ("nothing
            // suspicious") on a malformed fold — a clinical false-negative. It must fail loud instead.
            mockPerFold({
                fold1: {label: 'Positive', confidence: 0.8, logit: 1.2},
                fold2: {label: 'Positive', confidence: 0.6, logit: 0.4},
                fold3: {label: 'Negative', confidence: NaN, logit: NaN},
            });

            await expect(service.runInferenceOnImage('/tmp/x.jpg'))
                .rejects.toThrow('non-finite logit');
        });

        it('a non-finite-logit fold via scheduleImageInference writes no verdict and flags it unavailable (fail-loud contract)', async () => {
            service.dispatchAction = jest.fn();
            mockPerFold({
                fold1: {label: 'Positive', confidence: 0.8, logit: 1.2},
                fold2: {label: 'Negative', confidence: NaN, logit: NaN},
                fold3: {label: 'Positive', confidence: 0.9, logit: 2.0},
            });
            const entity = {uuid: 'e1', getObservationValue: jest.fn(() => undefined)};

            service.scheduleImageInference('/tmp/x.jpg', entity, 'AI Suspicion Result');
            await new Promise(res => setImmediate(res));

            flushInference();
            // No verdict is written (not a defaulted negative); a runtime failure surfaces as unavailable.
            expect(service.dispatchAction).toHaveBeenCalledWith('EDGE_MODEL.INFERENCE_UNAVAILABLE', {
                conceptName: 'AI Suspicion Result', questionGroupConceptName: null,
                questionGroupIndex: null, messageKey: 'aiInferenceFailed',
            });
        });

        it('keeps the per-model breakdown (sha256/logit/confidence/label)', async () => {
            mockPerFold({
                fold1: {label: 'Positive', confidence: 0.8, logit: 1.2},
                fold2: {label: 'Positive', confidence: 0.6, logit: 0.4},
                fold3: {label: 'Positive', confidence: 0.9, logit: 2.0},
            });

            const r = await service.runInferenceOnImage('/tmp/x.jpg');

            expect(r.perModel).toEqual([
                {sha256: 'fold1', logit: 1.2, confidence: 0.8, label: 'Positive'},
                {sha256: 'fold2', logit: 0.4, confidence: 0.6, label: 'Positive'},
                {sha256: 'fold3', logit: 2.0, confidence: 0.9, label: 'Positive'},
            ]);
        });

        it('rejects an unsupported combiner in the payload (only unanimous-and is shipped)', async () => {
            const meanProbOverride = {...OVERRIDE, output: {...OVERRIDE.output,
                params: {...OVERRIDE.output.params, combine: 'mean-prob'}}};
            rows = [row({sha256: 'fold1', payload: JSON.stringify(meanProbOverride)}), FOLDS[1], FOLDS[2]];
            rows.forEach(r => cacheRow(r));
            mockPerFold({
                fold1: {label: 'Positive', confidence: 0.8},
                fold2: {label: 'Positive', confidence: 0.6},
                fold3: {label: 'Positive', confidence: 0.9},
            });

            await expect(service.runEnsembleInferenceOnImage('/tmp/x.jpg'))
                .rejects.toThrow("unsupported combine='mean-prob'");
        });

        describe('partial degradation (one fold not cached)', () => {
            beforeEach(() => {
                // Reset the cache: cache only fold1 and fold3 — fold2 is degraded below.
                mockFsState.existing = new Set();
                mockFsState.files = {};
                cacheRow(FOLDS[0]);
                cacheRow(FOLDS[2]);
                mockPerFold({
                    fold1: {confidence: 0.8}, fold2: {confidence: 0.6}, fold3: {confidence: 0.7},
                });
            });

            it('one fold blob missing ⇒ the whole ensemble rejects — no combined verdict is produced', async () => {
                // fold2 blob absent (key present): not cached.
                mockFsState.existing.add(keyPath('fold2'));
                mockFsState.files[keyPath('fold2')] = 'base64-key';

                // The ensemble fails as a unit: it never returns a (partial) verdict object.
                await expect(service.runEnsembleInferenceOnImage('/tmp/x.jpg'))
                    .rejects.toThrow('blob not cached');
                // The missing fold is never loaded — no partial-ensemble scoring across the rest.
                const loadedShas = NativeModules.EdgeModelModule.loadEncryptedModelFromFile.mock.calls.map(c => c[0]);
                expect(loadedShas).not.toContain('fold2');
            });

            it('one fold key missing ⇒ the whole ensemble rejects — no combined verdict is produced', async () => {
                // fold2 blob present, key absent.
                mockFsState.existing.add(blobPath('fold2'));

                await expect(service.runEnsembleInferenceOnImage('/tmp/x.jpg'))
                    .rejects.toThrow('AES key not cached');
            });

            it('via scheduleImageInference: a degraded ensemble flags model-unavailable without throwing (verdict absent)', async () => {
                // fold2 not cached at all ⇒ ensemble cannot be scored.
                service.dispatchAction = jest.fn();
                const entity = {uuid: 'e1', getObservationValue: jest.fn(() => undefined)};

                // Must not throw out of the synchronous schedule call.
                expect(() =>
                    service.scheduleImageInference('/tmp/x.jpg', entity, 'AI Suspicion Result')
                ).not.toThrow();
                await new Promise(res => setImmediate(res));
                flushInference();

                // Every failing fold is merely uncached ⇒ the sync-and-retry message.
                expect(service.dispatchAction).toHaveBeenCalledWith('EDGE_MODEL.INFERENCE_UNAVAILABLE', {
                    conceptName: 'AI Suspicion Result', questionGroupConceptName: null,
                    questionGroupIndex: null, messageKey: 'aiModelUnavailable',
                });
            });
        });
    });

    describe('graceful degradation (not cached yet)', () => {
        it('does not call native load and throws a recognisable error when the blob is missing', async () => {
            const r = row();
            rows = [r];
            // blob NOT cached; key present
            mockFsState.existing.add(keyPath(r.sha256));
            mockFsState.files[keyPath(r.sha256)] = 'base64-key';

            await expect(service.runInferenceOnImage('/tmp/x.jpg'))
                .rejects.toThrow('blob not cached');
            expect(NativeModules.EdgeModelModule.loadEncryptedModelFromFile).not.toHaveBeenCalled();
        });

        it('does not call native load and throws when the key is missing for a needsKey row', async () => {
            const r = row();
            rows = [r];
            mockFsState.existing.add(blobPath(r.sha256));  // blob present, key absent

            await expect(service.runInferenceOnImage('/tmp/x.jpg'))
                .rejects.toThrow('AES key not cached');
            expect(NativeModules.EdgeModelModule.loadEncryptedModelFromFile).not.toHaveBeenCalled();
        });

        it('via scheduleImageInference: missing cache yields no native load, no throw, and flags model-unavailable (verdict absent)', async () => {
            const r = row();
            rows = [r];  // nothing cached
            service.dispatchAction = jest.fn();

            const entity = {uuid: 'e1', getObservationValue: jest.fn(() => undefined)};
            service.scheduleImageInference('/tmp/x.jpg', entity, 'AI Suspicion Result');
            await new Promise(res => setImmediate(res));
            flushInference();

            expect(NativeModules.EdgeModelModule.loadEncryptedModelFromFile).not.toHaveBeenCalled();
            expect(service.dispatchAction).toHaveBeenCalledWith('EDGE_MODEL.INFERENCE_UNAVAILABLE', {
                conceptName: 'AI Suspicion Result', questionGroupConceptName: null,
                questionGroupIndex: null, messageKey: 'aiModelUnavailable',
            });
        });
    });

    describe('scheduleImageInference', () => {
        const fakeEntity = (uuid, existingValue) => ({
            uuid,
            getObservationValue: jest.fn(() => existingValue),
        });

        beforeEach(() => {
            const r = row();
            rows = [r];
            cacheRow(r);
            NativeModules.EdgeModelModule.runInferenceOnImage.mockResolvedValue({label: 'Positive', confidence: 0.91});
            service.dispatchAction = jest.fn();
        });

        it('queues a batched result with the decoder label on resolve', async () => {
            service.scheduleImageInference('/tmp/x.jpg', fakeEntity('e1'), 'AI Suspicion Result');
            await new Promise(res => setImmediate(res));

            expect(NativeModules.EdgeModelModule.runInferenceOnImage).toHaveBeenCalledTimes(1);
            flushInference();
            expect(service.dispatchAction).toHaveBeenCalledWith(
                'EDGE_MODEL.INFERENCE_RESULTS_BATCH',
                {results: [{conceptName: 'AI Suspicion Result', value: 'Positive'}]}
            );
        });

        it('applies labelMap before queuing so the obs holds the user-facing string', async () => {
            service.scheduleImageInference('/tmp/x.jpg', fakeEntity('e1'), 'AI Suspicion Result',
                {'Positive': 'Suspicious', 'Negative': 'Non Suspicious'});
            await new Promise(res => setImmediate(res));

            flushInference();
            expect(service.dispatchAction).toHaveBeenCalledWith(
                'EDGE_MODEL.INFERENCE_RESULTS_BATCH',
                {results: [{conceptName: 'AI Suspicion Result', value: 'Suspicious'}]}
            );
        });

        it('dedups repeated calls for the same (entity, imagePath) while in flight', async () => {
            let resolveFn;
            NativeModules.EdgeModelModule.runInferenceOnImage.mockReturnValueOnce(new Promise(res => { resolveFn = res; }));
            const entity = fakeEntity('e1');

            service.scheduleImageInference('/tmp/x.jpg', entity, 'AI Suspicion Result');
            service.scheduleImageInference('/tmp/x.jpg', entity, 'AI Suspicion Result');
            service.scheduleImageInference('/tmp/x.jpg', entity, 'AI Suspicion Result');

            await new Promise(res => setImmediate(res));
            expect(NativeModules.EdgeModelModule.runInferenceOnImage).toHaveBeenCalledTimes(1);

            resolveFn({label: 'Positive'});
            await new Promise(res => setImmediate(res));
            flushInference();
            expect(service.dispatchAction).toHaveBeenCalledTimes(1);
        });

        it('recomputes on cold start when the entity already has the target obs — edit heal (#1988)', async () => {
            const entity = fakeEntity('e1', 'Suspicious');  // persisted verdict, cold session cache

            service.scheduleImageInference('/tmp/x.jpg', entity, 'AI Suspicion Result');
            await new Promise(res => setImmediate(res));

            expect(NativeModules.EdgeModelModule.runInferenceOnImage).toHaveBeenCalledTimes(1);
            flushInference();
            expect(service.dispatchAction).toHaveBeenCalledWith(
                'EDGE_MODEL.INFERENCE_RESULTS_BATCH',
                {results: [{conceptName: 'AI Suspicion Result', value: 'Positive'}]}
            );
        });

        it('flags a native inference error as unavailable and does not retry the same image', async () => {
            NativeModules.EdgeModelModule.runInferenceOnImage.mockRejectedValue(new Error('inference error'));
            const entity = fakeEntity('e1');

            service.scheduleImageInference('/tmp/x.jpg', entity, 'AI Suspicion Result');
            await new Promise(res => setImmediate(res));

            flushInference();
            expect(service.dispatchAction).toHaveBeenCalledWith('EDGE_MODEL.INFERENCE_UNAVAILABLE', {
                conceptName: 'AI Suspicion Result', questionGroupConceptName: null,
                questionGroupIndex: null, messageKey: 'aiInferenceFailed',
            });

            // Same image re-scheduled (e.g. the failure dispatch re-ran the rule): no retry, no re-dispatch.
            service.dispatchAction.mockClear();
            service.scheduleImageInference('/tmp/x.jpg', entity, 'AI Suspicion Result');
            await new Promise(res => setImmediate(res));
            expect(NativeModules.EdgeModelModule.runInferenceOnImage).toHaveBeenCalledTimes(1);
            expect(service.dispatchAction).not.toHaveBeenCalled();
        });

        it('re-attempts a previously-failed image after a model-content sync clears the retry cap', async () => {
            NativeModules.EdgeModelModule.runInferenceOnImage.mockRejectedValueOnce(new Error('inference error'));
            const entity = fakeEntity('e1');

            service.scheduleImageInference('/tmp/x.jpg', entity, 'AI Suspicion Result');
            await new Promise(res => setImmediate(res));
            flushInference();
            expect(NativeModules.EdgeModelModule.runInferenceOnImage).toHaveBeenCalledTimes(1);

            // Sync brought the model on device — the give-up cap must reset so the same image retries.
            service.onModelContentSynced();
            NativeModules.EdgeModelModule.runInferenceOnImage.mockResolvedValue({label: 'Positive', confidence: 0.9});
            service.dispatchAction.mockClear();

            service.scheduleImageInference('/tmp/x.jpg', entity, 'AI Suspicion Result');
            await new Promise(res => setImmediate(res));
            expect(NativeModules.EdgeModelModule.runInferenceOnImage).toHaveBeenCalledTimes(2);  // retried
            flushInference();
            expect(service.dispatchAction).toHaveBeenCalledWith(
                'EDGE_MODEL.INFERENCE_RESULTS_BATCH',
                {results: [{conceptName: 'AI Suspicion Result', value: 'Positive'}]}
            );
        });
    });

    describe('scheduleImageInferenceIntoGroup', () => {
        const fakeRqgEntity = (uuid, groupRows) => ({
            uuid,
            findObservation: jest.fn(() => groupRows == null ? undefined : ({
                getValueWrapper: () => ({
                    size: () => groupRows.length,
                    getGroupObservationAtIndex: (idx) => {
                        const r = groupRows[idx];
                        return r == null ? null : ({
                            findObservationByConceptUUID: (target) =>
                                Object.prototype.hasOwnProperty.call(r, target)
                                    ? {getValue: () => r[target]}
                                    : undefined,
                        });
                    },
                }),
            })),
        });

        beforeEach(() => {
            const r = row();
            rows = [r];
            cacheRow(r);
            NativeModules.EdgeModelModule.runInferenceOnImage.mockResolvedValue({label: 'Positive', confidence: 0.91});
            service.dispatchAction = jest.fn();
        });

        it('queues a batched result with the question group coordinates on resolve', async () => {
            service.scheduleImageInferenceIntoGroup('/tmp/x.jpg', fakeRqgEntity('e1', [{}]),
                'Lesion Group', 'AI Suspicion Result', 0);
            await new Promise(res => setImmediate(res));

            flushInference();
            expect(service.dispatchAction).toHaveBeenCalledWith(
                'EDGE_MODEL.INFERENCE_RESULTS_BATCH',
                {results: [{questionGroupConceptName: 'Lesion Group', conceptName: 'AI Suspicion Result', questionGroupIndex: 0, value: 'Positive'}]}
            );
        });

        it('recomputes on cold start when the RQG row already has the target obs — same image is idempotent (#1988)', async () => {
            const entity = fakeRqgEntity('e1', [{'AI Suspicion Result': 'Suspicious'}]);  // persisted verdict, cold cache

            service.scheduleImageInferenceIntoGroup('/tmp/x.jpg', entity, 'Lesion Group', 'AI Suspicion Result', 0,
                {Positive: 'Suspicious', Negative: 'Non Suspicious'});
            await new Promise(res => setImmediate(res));

            expect(NativeModules.EdgeModelModule.runInferenceOnImage).toHaveBeenCalledTimes(1);
            flushInference();
            // Positive → 'Suspicious', identical to the persisted verdict — the rewrite is invisible.
            expect(service.dispatchAction).toHaveBeenCalledWith(
                'EDGE_MODEL.INFERENCE_RESULTS_BATCH',
                {results: [{questionGroupConceptName: 'Lesion Group', conceptName: 'AI Suspicion Result', questionGroupIndex: 0, value: 'Suspicious'}]}
            );
        });

        it('recomputes for the new image when an existing RQG row already carries a (stale) verdict — edit swap (#1988)', async () => {
            NativeModules.EdgeModelModule.runInferenceOnImage.mockResolvedValue({label: 'Negative', confidence: 0.2});
            const entity = fakeRqgEntity('e1', [{'AI Verdict': 'Suspicious'}]);  // stale verdict from image A

            service.scheduleImageInferenceIntoGroup('/tmp/new-image-B.jpg', entity,
                'Image-wise AI Assessment', 'AI Verdict', 0,
                {Positive: 'Suspicious', Negative: 'Non Suspicious'});
            await new Promise(res => setImmediate(res));

            expect(NativeModules.EdgeModelModule.runInferenceOnImage).toHaveBeenCalledTimes(1);
            flushInference();
            expect(service.dispatchAction).toHaveBeenCalledWith(
                'EDGE_MODEL.INFERENCE_RESULTS_BATCH',
                {results: [{questionGroupConceptName: 'Image-wise AI Assessment', conceptName: 'AI Verdict', questionGroupIndex: 0, value: 'Non Suspicious'}]}
            );
        });

        it('cold-start blanks the possibly-stale verdict first when the media file is present (#2010)', async () => {
            mockFsState.existing.add('/tmp/x.jpg');   // media on device ⇒ recompute will resolve ⇒ safe to blank
            const entity = fakeRqgEntity('e1', [{'AI Verdict': 'Suspicious'}]);

            service.scheduleImageInferenceIntoGroup('/tmp/x.jpg', entity,
                'Image-wise AI Assessment', 'AI Verdict', 0, {Positive: 'Suspicious', Negative: 'Non Suspicious'});
            await new Promise(res => setImmediate(res));
            flushInference();

            const dispatched = service.dispatchAction.mock.calls
                .flatMap(c => (c[1] && c[1].results) || []);
            expect(dispatched).toContainEqual(
                {questionGroupConceptName: 'Image-wise AI Assessment', conceptName: 'AI Verdict', questionGroupIndex: 0, value: null, clear: true});
            expect(dispatched).toContainEqual(
                {questionGroupConceptName: 'Image-wise AI Assessment', conceptName: 'AI Verdict', questionGroupIndex: 0, value: 'Suspicious'});
        });

        it('cold-start does NOT blank the verdict when the media file is missing — fail closed (#2010)', async () => {
            // Synced-in encounter whose media never downloaded: presence unknown ⇒ keep the verdict.
            const entity = fakeRqgEntity('e1', [{'AI Verdict': 'Suspicious'}]);

            service.scheduleImageInferenceIntoGroup('/tmp/missing.jpg', entity,
                'Image-wise AI Assessment', 'AI Verdict', 0, {Positive: 'Suspicious', Negative: 'Non Suspicious'});
            await new Promise(res => setImmediate(res));
            flushInference();

            const clears = service.dispatchAction.mock.calls
                .flatMap(c => (c[1] && c[1].results) || []).filter(r => r.clear);
            expect(clears).toHaveLength(0);
        });

        it('invalidates the stale verdict immediately when the row image is replaced in-session (#2010)', async () => {
            mockFsState.existing.add('/tmp/A.jpg');
            const entity = fakeRqgEntity('e1', [{'AI Verdict': 'Suspicious'}]);
            // Phase 1 — cold start on image A: seed lastImage via a resolved run.
            service.scheduleImageInferenceIntoGroup('/tmp/A.jpg', entity, 'Image-wise AI Assessment', 'AI Verdict', 0);
            await new Promise(res => setImmediate(res));
            flushInference();
            service.dispatchAction.mockClear();

            // Phase 2 — replace with image B; keep inference pending so the clear is observable alone.
            NativeModules.EdgeModelModule.runInferenceOnImage.mockImplementation(() => new Promise(() => {}));
            service.scheduleImageInferenceIntoGroup('/tmp/B.jpg', entity, 'Image-wise AI Assessment', 'AI Verdict', 0);
            flushInference();
            expect(service.dispatchAction).toHaveBeenCalledWith(
                'EDGE_MODEL.INFERENCE_RESULTS_BATCH',
                {results: [{questionGroupConceptName: 'Image-wise AI Assessment', conceptName: 'AI Verdict', questionGroupIndex: 0, value: null, clear: true}]}
            );
        });

        it('dispatches the in-session invalidation on its own 0ms tick, without a manual flush (#2010)', async () => {
            mockFsState.existing.add('/tmp/A.jpg');
            const entity = fakeRqgEntity('e1', [{'AI Verdict': 'Suspicious'}]);
            service.scheduleImageInferenceIntoGroup('/tmp/A.jpg', entity, 'Image-wise AI Assessment', 'AI Verdict', 0);
            await new Promise(res => setImmediate(res));
            flushInference();
            service.dispatchAction.mockClear();

            NativeModules.EdgeModelModule.runInferenceOnImage.mockImplementation(() => new Promise(() => {}));
            service.scheduleImageInferenceIntoGroup('/tmp/B.jpg', entity, 'Image-wise AI Assessment', 'AI Verdict', 0);
            await new Promise(res => setTimeout(res, 0));   // NO manual flush — the 0ms timer must fire it
            expect(service.dispatchAction).toHaveBeenCalledWith(
                'EDGE_MODEL.INFERENCE_RESULTS_BATCH',
                {results: [{questionGroupConceptName: 'Image-wise AI Assessment', conceptName: 'AI Verdict', questionGroupIndex: 0, value: null, clear: true}]}
            );
        });

        it('queues exactly ONE clear per replacement even when the rule re-fires while in flight (#2010)', async () => {
            mockFsState.existing.add('/tmp/A.jpg');
            const entity = fakeRqgEntity('e1', [{'AI Verdict': 'Suspicious'}]);
            service.scheduleImageInferenceIntoGroup('/tmp/A.jpg', entity, 'Image-wise AI Assessment', 'AI Verdict', 0);
            await new Promise(res => setImmediate(res));
            flushInference();
            service.dispatchAction.mockClear();

            NativeModules.EdgeModelModule.runInferenceOnImage.mockImplementation(() => new Promise(() => {}));
            service.scheduleImageInferenceIntoGroup('/tmp/B.jpg', entity, 'Image-wise AI Assessment', 'AI Verdict', 0);
            service.scheduleImageInferenceIntoGroup('/tmp/B.jpg', entity, 'Image-wise AI Assessment', 'AI Verdict', 0);
            service.scheduleImageInferenceIntoGroup('/tmp/B.jpg', entity, 'Image-wise AI Assessment', 'AI Verdict', 0);
            await new Promise(res => setTimeout(res, 0));
            const clears = service.dispatchAction.mock.calls
                .flatMap(c => (c[1] && c[1].results) || []).filter(r => r.clear);
            expect(clears).toHaveLength(1);
        });

        it('caps cold-start recompute to one attempt per image per session when the media file is missing', async () => {
            NativeModules.EdgeModelModule.runInferenceOnImage.mockRejectedValue(new Error('IMAGE_NOT_FOUND'));
            const entity = fakeRqgEntity('e1', [{'AI Verdict': 'Suspicious'}]);

            service.scheduleImageInferenceIntoGroup('/tmp/missing.jpg', entity, 'Image-wise AI Assessment', 'AI Verdict', 0);
            await new Promise(res => setImmediate(res));
            expect(NativeModules.EdgeModelModule.runInferenceOnImage).toHaveBeenCalledTimes(1);
            flushInference();
            // The persisted verdict isn't overwritten, and the failed recompute surfaces as unavailable.
            expect(service.dispatchAction).toHaveBeenCalledWith('EDGE_MODEL.INFERENCE_UNAVAILABLE', {
                conceptName: 'AI Verdict', questionGroupConceptName: 'Image-wise AI Assessment',
                questionGroupIndex: 0, messageKey: 'aiInferenceFailed',
            });

            service.scheduleImageInferenceIntoGroup('/tmp/missing.jpg', entity, 'Image-wise AI Assessment', 'AI Verdict', 0);
            await new Promise(res => setImmediate(res));
            expect(NativeModules.EdgeModelModule.runInferenceOnImage).toHaveBeenCalledTimes(1);  // no retry
        });

        it('coalesces a burst of N RQG results into a single batched dispatch', async () => {
            const entity = fakeRqgEntity('e1', [{}, {}, {}]);
            service.scheduleImageInferenceIntoGroup('/tmp/a.jpg', entity, 'Lesion Group', 'AI Suspicion Result', 0);
            service.scheduleImageInferenceIntoGroup('/tmp/b.jpg', entity, 'Lesion Group', 'AI Suspicion Result', 1);
            service.scheduleImageInferenceIntoGroup('/tmp/c.jpg', entity, 'Lesion Group', 'AI Suspicion Result', 2);
            for (let i = 0; i < 5; i++) await new Promise(res => setImmediate(res));

            flushInference();
            expect(service.dispatchAction).toHaveBeenCalledTimes(1);
            const [, payload] = service.dispatchAction.mock.calls[0];
            expect(payload.results).toHaveLength(3);
            expect(payload.results.map(r => r.questionGroupIndex).sort()).toEqual([0, 1, 2]);
        });
    });

    describe('result shape', () => {
        it('the single-model result includes the derived `positive` boolean (matches the ensemble shape)', async () => {
            const r = row();
            rows = [r];
            cacheRow(r);
            // Native single-model result omits `positive`; the service must derive it.
            NativeModules.EdgeModelModule.runInferenceOnImage.mockResolvedValueOnce({label: 'Positive', confidence: 0.9});

            const result = await service.runInferenceOnImage('/tmp/x.jpg');

            expect(result.positive).toBe(true);
            expect(result.label).toBe('Positive');
            expect(result.confidence).toBe(0.9);
        });

        it('derives positive=false when the single-model label is the negative class', async () => {
            const r = row();
            rows = [r];
            cacheRow(r);
            NativeModules.EdgeModelModule.runInferenceOnImage.mockResolvedValueOnce({label: 'Negative', confidence: 0.1});

            const result = await service.runInferenceOnImage('/tmp/x.jpg');

            expect(result.positive).toBe(false);
        });
    });

    describe('_edgeModelRows predicate (matches the downloader)', () => {
        it('excludes a row with a null contentKey — it is never downloaded, so it is not a loadable fold', () => {
            const ok = row({sha256: 'sha-ok', contentKey: 'models/sha-ok.bin'});
            const noKey = row({sha256: 'sha-nokey', contentKey: null});
            rows = [ok, noKey];

            const resolved = service._edgeModelRows();

            expect(resolved.map(r => r.sha256)).toEqual(['sha-ok']);
        });
    });

    describe('self-heal a poisoned blob', () => {
        it('unlinks the cached blob when the native load throws (corrupt/GCM/sha failure)', async () => {
            const r = row();
            rows = [r];
            cacheRow(r);
            NativeModules.EdgeModelModule.loadEncryptedModelFromFile.mockRejectedValueOnce(new Error('GCM tag mismatch'));

            await expect(service.runInferenceOnImage('/tmp/x.jpg')).rejects.toThrow('GCM tag mismatch');

            expect(fs.unlink).toHaveBeenCalledWith(blobPath(r.sha256));
            expect(mockFsState.existing.has(blobPath(r.sha256))).toBe(false);
        });

        it('does not unlink the blob for a pre-native guard throw (key not cached yet)', async () => {
            const r = row();
            rows = [r];
            // Blob present, key absent ⇒ throws before the native load is attempted.
            mockFsState.existing.add(blobPath(r.sha256));

            await expect(service.runInferenceOnImage('/tmp/x.jpg')).rejects.toThrow('AES key not cached');

            expect(fs.unlink).not.toHaveBeenCalled();
            expect(mockFsState.existing.has(blobPath(r.sha256))).toBe(true);
        });
    });

    // #1984 — accept the legacy newmodel shape (leading modelKey) and the 17.0 shape.
    // Discriminator is args[1]: imagePath (string) in the legacy shape, entity (object) in 17.0.
    describe('backward-compatible dispatch (#1984)', () => {
        let captured;
        beforeEach(() => {
            captured = null;
            service._scheduleImageInference = jest.fn((normalized) => { captured = normalized; });
        });
        const entity = () => ({uuid: 'e1', getObservationValue: jest.fn()});
        const labelMap = {Positive: 'Suspicious', Negative: 'Non Suspicious'};

        it('group: legacy 7-arg (modelKey, imagePath, entity, qg, target, rqgIdx, labelMap) → shifted, modelKey dropped, rqgIdx numeric', () => {
            const e = entity();
            service.scheduleImageInferenceIntoGroup('sha-a', '/tmp/x.jpg', e, 'Lesion Group', 'AI Verdict', 3, labelMap);
            expect(captured).toEqual({
                imagePath: '/tmp/x.jpg', entity: e, targetConceptName: 'AI Verdict', labelMap,
                questionGroupConceptName: 'Lesion Group', rqgIdx: 3,
            });
        });

        it('group: new 6-arg (imagePath, entity, qg, target, rqgIdx, labelMap) → unchanged', () => {
            const e = entity();
            service.scheduleImageInferenceIntoGroup('/tmp/x.jpg', e, 'Lesion Group', 'AI Verdict', 3, labelMap);
            expect(captured).toEqual({
                imagePath: '/tmp/x.jpg', entity: e, targetConceptName: 'AI Verdict', labelMap,
                questionGroupConceptName: 'Lesion Group', rqgIdx: 3,
            });
        });

        it('group: legacy with an ENSEMBLE array modelKey → still detected via args[1] and shifted', () => {
            const e = entity();
            service.scheduleImageInferenceIntoGroup(['fold1', 'fold2'], '/tmp/x.jpg', e, 'Lesion Group', 'AI Verdict', 0);
            expect(captured).toMatchObject({
                imagePath: '/tmp/x.jpg', entity: e, questionGroupConceptName: 'Lesion Group',
                targetConceptName: 'AI Verdict', rqgIdx: 0,
            });
        });

        it('non-group: legacy 5-arg (modelKey, imagePath, entity, target, labelMap) → shifted', () => {
            const e = entity();
            service.scheduleImageInference('sha-a', '/tmp/x.jpg', e, 'AI Suspicion Result', labelMap);
            expect(captured).toEqual({
                imagePath: '/tmp/x.jpg', entity: e, targetConceptName: 'AI Suspicion Result', labelMap,
                questionGroupConceptName: null, rqgIdx: null,
            });
        });

        it('non-group: new 4-arg (imagePath, entity, target, labelMap) → unchanged', () => {
            const e = entity();
            service.scheduleImageInference('/tmp/x.jpg', e, 'AI Suspicion Result');
            expect(captured).toMatchObject({
                imagePath: '/tmp/x.jpg', entity: e, targetConceptName: 'AI Suspicion Result',
                questionGroupConceptName: null, rqgIdx: null,
            });
        });

        it('guard still fires on a genuinely malformed call — the shift does not mask real errors', () => {
            delete service._scheduleImageInference;   // remove the beforeEach stub → use the real prototype method
            const logSpy = jest.spyOn(General, 'logError').mockImplementation(() => {});
            const e = entity();
            // New shape with a non-numeric rqgIdx (the exact bug class) → SKIP, no throw.
            expect(() =>
                service.scheduleImageInferenceIntoGroup('/tmp/x.jpg', e, 'Lesion Group', 'AI Verdict', 'not-a-number')
            ).not.toThrow();
            expect(logSpy).toHaveBeenCalledWith('EdgeModelSvc', expect.stringContaining('SKIP missing-arg'));
            logSpy.mockRestore();
        });
    });
});
