import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {NativeModules} from "react-native";
import General from "../utility/General";

/**
 * EdgeModelService — JS surface for on-device inference.
 *
 * Overall design (~/.claude/plans/composed-tumbling-bachman.md):
 *   • The native module (`EdgeModelModule`) is generic: a `modelKey` selects which model
 *     to use; per-model semantics (engine, preprocessor, decoder) come from a per-flavour
 *     `assets/models/registry.json` override block.
 *   • This service caches the registry on app boot, then lazy-loads each model on first
 *     use. Once loaded the engine handle stays for the app lifetime *until* the OS evicts
 *     it under memory pressure — at which point the next inference call self-heals via
 *     the native side's cached load-args.
 *   • Plain or AES-GCM-encrypted assets are both supported; the registry entry's
 *     `asset.type` field selects the load path.
 *
 * Rule usage (sync inference, raw return):
 *   const result = await params.services.edgeModelService.runInferenceOnImage(
 *     'mvit2_fold5_2_latest_traced', imagePath
 *   );
 *
 * Rule usage (async inline path — see scheduleImageInference below):
 *   params.services.edgeModelService.scheduleImageInference(
 *     'mvit2_fold5_2_latest_traced', imagePath, encounter, 'AI Suspicion Result',
 *     { 'Positive': 'Suspicious', 'Negative': 'Non Suspicious' }   // optional labelMap
 *   );
 *   // …rule returns sync immediately; on resolve the (optionally mapped) label is written
 *   // to the target obs and the form re-renders. The dependent form element reads
 *   // encounter.getObservationValue('AI Suspicion Result') — for text fields the obs value
 *   // is what's displayed, so write the user-facing text directly via labelMap.
 */
export const EDGE_MODEL_ACTION = {
    INFERENCE_RESULT_AVAILABLE: 'EDGE_MODEL.INFERENCE_RESULT_AVAILABLE'
};

@Service("edgeModelService")
class EdgeModelService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this._registry = null;
        this._registryReady = null;
        this._loaded = new Set();
        // Dedup keys for in-flight scheduleImageInference jobs — keyed by
        // entityUuid|modelKey|imagePath. Cleared in finally(). Form-element rules tend to
        // re-fire frequently (after every primitive obs change anywhere on the page), so
        // without this guard we'd launch a fresh inference per re-render.
        this._scheduled = new Set();
    }

    /**
     * BeanRegistry calls init() synchronously at app boot. We can't block here, but we
     * can kick off the registry read and stash the Promise — any subsequent inference
     * call will await this before consulting `_registry`. Failures are surfaced lazily
     * (on the first inference call), not at app boot, so a missing or malformed registry
     * doesn't break the rest of the app.
     */
    init() {
        this._registryReady = NativeModules.EdgeModelModule.getRegistry()
            .then(parsed => { this._registry = parsed; })
            .catch(e => {
                console.error('EdgeModelService: failed to load assets/models/registry.json', e);
                throw e;
            });
    }

    /**
     * Run inference on a caller-supplied flat number[]. `shape` is optional; if absent
     * the engine treats the input as a 1-D vector. Returns the configured decoder's
     * structured map.
     */
    async runInference(modelKey, inputData, shape) {
        await this._ensureLoaded(modelKey);
        return NativeModules.EdgeModelModule.runInference(modelKey, inputData, shape || null);
    }

    /**
     * Run inference on an image file path. Native handles decode → resize → normalise →
     * layout-transpose, all driven by the resolved preprocessor plugin. `imagePath` is an
     * absolute path on the device (e.g. from react-native-image-picker, with `file://`
     * stripped).
     */
    async runInferenceOnImage(modelKey, imagePath) {
        await this._ensureLoaded(modelKey);
        return NativeModules.EdgeModelModule.runInferenceOnImage(modelKey, imagePath);
    }

    /**
     * Inline-async path for form-element rules. Fires inference in the background;
     * on resolve, dispatches a redux action that writes the result as an observation
     * and re-runs form-element rules so the dependent form element re-renders.
     *
     * Why this exists: Avni's form-element rule engine is synchronous
     * (`RuleEvaluationService.runFormElementStatusRule`). A rule that returned a
     * `Promise<FormElementStatus>` would put the Promise object — not the resolved
     * status — into the rule-evaluator output, and the dependent element never
     * updated. This method lets the rule kick off async work without changing
     * the rule contract; the result lands as a sibling observation that the
     * dependent form element's *synchronous* rule reads via `entity.getObservationValue`.
     *
     * Dedup contract:
     *   • Same (entity, modelKey, imagePath) in flight → no-op.
     *   • Target obs already present on entity → no-op (rule may be re-firing after
     *     a different obs change on the same page; we don't want to overwrite a
     *     committed result).
     *
     * Errors are swallowed (logged only). On failure the target obs stays absent and
     * the dependent form element behaves as it would for a not-yet-arrived result —
     * keeps the form save path unblocked.
     */
    scheduleImageInference(modelKey, imagePath, entity, targetConceptName, labelMap) {
        if (!entity || !targetConceptName || !imagePath) return;
        if (entity.getObservationValue(targetConceptName) != null) return;

        const key = `${entity.uuid}|${modelKey}|${imagePath}`;
        if (this._scheduled.has(key)) return;
        this._scheduled.add(key);

        this.runInferenceOnImage(modelKey, imagePath)
            .then(result => {
                const rawLabel = result && result.label != null ? result.label : result;
                // Apply the optional label map so the obs holds the user-facing string
                // (TextFormElement renders the obs verbatim, see views/form/formElement/TextFormElement.js:49).
                const value = labelMap && Object.prototype.hasOwnProperty.call(labelMap, rawLabel)
                    ? labelMap[rawLabel]
                    : rawLabel;
                this.dispatchAction(EDGE_MODEL_ACTION.INFERENCE_RESULT_AVAILABLE, {
                    conceptName: targetConceptName,
                    value
                });
            })
            .catch(err => {
                General.logError('EdgeModelService',
                    `scheduleImageInference failed for ${modelKey} on ${imagePath}: ${err && err.message}`);
            })
            .finally(() => {
                this._scheduled.delete(key);
            });
    }

    /**
     * Lazy-load the engine handle for `modelKey` exactly once per app lifetime. Idempotent:
     * if the native side has evicted the handle under memory pressure it self-heals via
     * its cached load-args, so we don't re-issue the load call here.
     */
    async _ensureLoaded(modelKey) {
        await this._registryReady;
        if (this._loaded.has(modelKey)) return;

        const entry = this._registry?.models?.[modelKey];
        if (!entry) {
            throw new Error(`EdgeModelService: no entry for modelKey '${modelKey}' in assets/models/registry.json`);
        }
        const overrideJson = entry.override ? JSON.stringify(entry.override) : null;

        if (entry.asset?.type === 'encrypted') {
            await NativeModules.EdgeModelModule.loadEncryptedModel(
                modelKey,
                entry.asset.path,
                entry.asset.encryptionKey,
                entry.asset.sha256OfPlaintext,
                overrideJson
            );
        } else {
            await NativeModules.EdgeModelModule.loadModel(
                modelKey,
                entry.asset.path,
                overrideJson
            );
        }
        this._loaded.add(modelKey);
    }
}

export default EdgeModelService;
