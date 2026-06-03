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
 *
 * Rule usage (async inline path, target lives inside a Repeatable Question Group row):
 *   params.services.edgeModelService.scheduleImageInferenceIntoGroup(
 *     'mvit2_fold5_2_latest_traced', imagePath, encounter,
 *     'Lesion Group', 'AI Suspicion Result', rowIdx,
 *     { 'Positive': 'Suspicious', 'Negative': 'Non Suspicious' }   // optional labelMap
 *   );
 *   // Same contract as scheduleImageInference, but the verdict lands in the 'AI Suspicion
 *   // Result' obs inside row `rowIdx` of the 'Lesion Group' repeatable question group.
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
        // Last imagePath whose inference produced the target obs, keyed by
        // entityUuid|targetConceptName. Lets scheduleImageInference detect "user retook the
        // photo" and re-run inference instead of being short-circuited by the existing
        // (now-stale) verdict. In-memory only — on app restart we lazily seed the cache
        // with the current imagePath the first time we see a populated target obs, on the
        // assumption that the persisted verdict was produced from the persisted image.
        this._lastInferredImageByTarget = new Map();
    }

    /**
     * BeanRegistry calls init() synchronously at app boot. We can't block here, but we
     * can kick off the registry read and stash the Promise — any subsequent inference
     * call will await this before consulting `_registry`. Failures are surfaced lazily
     * (on the first inference call), not at app boot, so a missing or malformed registry
     * doesn't break the rest of the app.
     */
    init() {
        General.logDebug('EdgeModelSvc', 'init: loading assets/models/registry.json');
        this._registryReady = NativeModules.EdgeModelModule.getRegistry()
            .then(parsed => {
                this._registry = parsed;
                const keys = Object.keys(parsed?.models || {});
                General.logDebug('EdgeModelSvc',
                    `init OK: defaultModel=${parsed?.defaultModel} modelKeys=[${keys.join(',')}]`);
            })
            .catch(e => {
                General.logError('EdgeModelSvc', `init FAIL: ${e && e.message}`);
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
        General.logDebug('EdgeModelSvc', `runInferenceOnImage: modelKey=${modelKey} imagePath=${imagePath}`);
        const t0 = Date.now();
        await this._ensureLoaded(modelKey);
        try {
            const result = await NativeModules.EdgeModelModule.runInferenceOnImage(modelKey, imagePath);
            General.logDebug('EdgeModelSvc',
                `runInferenceOnImage OK (${Date.now() - t0}ms): label=${result && result.label}`);
            return result;
        } catch (e) {
            General.logError('EdgeModelSvc',
                `runInferenceOnImage FAIL (${Date.now() - t0}ms) ${modelKey}: ${e && e.message}`);
            throw e;
        }
    }

    /**
     * Soft-vote ensemble over several single-logit sigmoid-binary models (e.g. cross-validation
     * folds of the same model). Runs each via runInferenceOnImage, then combines:
     *   • 'mean-prob'  (default): average the per-model sigmoid probabilities.
     *   • 'mean-logit'          : average the raw logits, then sigmoid.
     * `threshold` picks labels[1] (positive) vs labels[0]. Returns the combined verdict plus a
     * per-model breakdown. The combined `label` is shaped like a single model's, so callers
     * (e.g. _scheduleImageInference) and `labelMap` treat it identically.
     */
    async runEnsembleInferenceOnImage(modelKeys, imagePath, opts = {}) {
        if (!Array.isArray(modelKeys) || modelKeys.length === 0) {
            throw new Error('EdgeModelService.runEnsembleInferenceOnImage: modelKeys must be a non-empty array');
        }
        // Default threshold/labels from the folds' shared decoder override so the combined verdict
        // tracks the registry (tanuh-ensemble-override.json) like the single-model path does;
        // explicit opts win.
        await this._registryReady;
        const decoderParams = this._registry?.models?.[modelKeys[0]]?.override?.output?.params || {};
        const combine = opts.combine ?? 'mean-prob';
        const threshold = opts.threshold ?? decoderParams.threshold ?? 0.5;
        const labels = opts.labels ?? decoderParams.labels ?? ['Negative', 'Positive'];

        const t0 = Date.now();
        const results = await Promise.all(modelKeys.map(k => this.runInferenceOnImage(k, imagePath)));
        const mean = nums => nums.reduce((s, x) => s + x, 0) / nums.length;
        const score = combine === 'mean-logit'
            ? 1 / (1 + Math.exp(-mean(results.map(r => r.logit))))
            : mean(results.map(r => r.confidence));
        // Fail loud rather than silently scoring NaN — NaN > threshold is false, which would
        // masquerade as a confident negative verdict. A non-finite score means a fold result
        // lacked the field this combine mode needs (confidence / logit).
        if (!Number.isFinite(score)) {
            throw new Error(`EdgeModelService.runEnsembleInferenceOnImage: non-finite score (combine=${combine}) — a fold result lacked a numeric ${combine === 'mean-logit' ? 'logit' : 'confidence'}; models=[${modelKeys.join(',')}]`);
        }
        const positive = score > threshold;
        const label = positive ? labels[1] : labels[0];
        General.logDebug('EdgeModelSvc',
            `runEnsembleInferenceOnImage OK (${Date.now() - t0}ms): combine=${combine} score=${score.toFixed(4)} label=${label} models=[${modelKeys.join(',')}]`);
        return {
            label, confidence: score, positive, modelKeys,
            perModel: results.map((r, i) => ({modelKey: modelKeys[i], logit: r.logit, confidence: r.confidence, label: r.label}))
        };
    }

    /**
     * Inline-async path for form-element rules, target is a top-level concept on the entity.
     * Thin wrapper over _scheduleImageInference — see that method for the full contract.
     * `modelKey` may be a string (single model) or an array of model keys (soft-vote ensemble).
     */
    scheduleImageInference(modelKey, imagePath, entity, targetConceptName, labelMap) {
        return this._scheduleImageInference({
            modelKey, imagePath, entity, targetConceptName, labelMap,
            questionGroupConceptName: null, rqgIdx: null
        });
    }

    /**
     * Same as scheduleImageInference, but writes the verdict into the `targetConceptName`
     * obs inside row `rqgIdx` of the `questionGroupConceptName` Repeatable Question Group.
     */
    scheduleImageInferenceIntoGroup(modelKey, imagePath, entity, questionGroupConceptName, targetConceptName, rqgIdx, labelMap) {
        return this._scheduleImageInference({
            modelKey, imagePath, entity, targetConceptName, labelMap,
            questionGroupConceptName, rqgIdx
        });
    }

    /**
     * Fires inference in the background; on resolve, dispatches a redux action that writes
     * the result as an observation and re-runs form-element rules so the dependent form
     * element re-renders. When `questionGroupConceptName`/`rqgIdx` are set, the obs is
     * written into that row of the named Repeatable Question Group instead of at top level.
     *
     * Why this exists: Avni's form-element rule engine is synchronous
     * (`RuleEvaluationService.runFormElementStatusRule`). A rule that returned a
     * `Promise<FormElementStatus>` would put the Promise object — not the resolved
     * status — into the rule-evaluator output, and the dependent element never
     * updated. This method lets the rule kick off async work without changing
     * the rule contract; the result lands as a sibling observation that the
     * dependent form element's *synchronous* rule reads via `entity.getObservationValue`.
     *
     * Dedup contract (keyed per target — for RQG that includes the question group + row):
     *   • Same (entity, modelKey, imagePath[, qg, row]) in flight → no-op.
     *   • Target obs already populated AND we've seen the SAME imagePath produce it →
     *     no-op (rule re-firing after some unrelated obs change on the same page).
     *   • Target obs already populated BUT current imagePath differs from what we last
     *     ran inference on → re-run (user retook the photo; the stale verdict will be
     *     overwritten by the new dispatch).
     *   • Target obs populated, never seen this target in this app session (cold start
     *     on an encounter with a persisted verdict) → trust the persisted verdict and
     *     seed the cache with the current imagePath, so a later retake still re-runs.
     *
     * Errors are swallowed (logged only). On failure the target obs stays absent and
     * the dependent form element behaves as it would for a not-yet-arrived result —
     * keeps the form save path unblocked.
     */
    _scheduleImageInference({modelKey, imagePath, entity, targetConceptName, labelMap, questionGroupConceptName, rqgIdx}) {
        const isRqg = questionGroupConceptName != null;
        if (!entity || !targetConceptName || !imagePath
            || (isRqg && !(typeof rqgIdx === 'number' && rqgIdx >= 0))) {
            General.logError('EdgeModelSvc',
                `scheduleImageInference SKIP missing-arg: entity=${!!entity} target=${!!targetConceptName} imagePath=${!!imagePath} qg=${questionGroupConceptName} rqgIdx=${rqgIdx}`);
            return;
        }

        // modelKey may be a single key or an array of keys (soft-vote ensemble); join for the
        // dedup/inflight key and logs so an ensemble dedups as one unit.
        const modelKeyStr = Array.isArray(modelKey) ? modelKey.join('+') : modelKey;

        const targetKey = isRqg
            ? `${entity.uuid}|${questionGroupConceptName}|${rqgIdx}|${targetConceptName}`
            : `${entity.uuid}|${targetConceptName}`;
        const existing = isRqg
            ? this._readRqgChildValue(entity, questionGroupConceptName, rqgIdx, targetConceptName)
            : entity.getObservationValue(targetConceptName);

        if (existing != null) {
            const lastImage = this._lastInferredImageByTarget.get(targetKey);
            if (lastImage === undefined) {
                // First time we're seeing this target in-session and it's already
                // populated → persisted verdict from a previous session. Trust it,
                // seed the cache so a later retake (different imagePath) re-runs.
                this._lastInferredImageByTarget.set(targetKey, imagePath);
                General.logDebug('EdgeModelSvc',
                    `scheduleImageInference SKIP trust persisted verdict for '${targetConceptName}' (seeded lastImage=${imagePath})`);
                return;
            }
            if (lastImage === imagePath) {
                // Steady-state rule re-fire on the same image — no log to avoid noise on
                // every form render. The decision is implicit: target set + image
                // unchanged → no work.
                return;
            }
            General.logDebug('EdgeModelSvc',
                `scheduleImageInference image CHANGED for '${targetConceptName}' (was ${lastImage}, now ${imagePath}) — re-running`);
        }

        const inflightKey = isRqg
            ? `${entity.uuid}|${modelKeyStr}|${imagePath}|${questionGroupConceptName}|${rqgIdx}`
            : `${entity.uuid}|${modelKeyStr}|${imagePath}`;
        if (this._scheduled.has(inflightKey)) {
            General.logDebug('EdgeModelSvc', `scheduleImageInference SKIP already in flight: ${inflightKey}`);
            return;
        }
        this._scheduled.add(inflightKey);
        General.logDebug('EdgeModelSvc', `scheduleImageInference QUEUED: ${inflightKey}`);

        const inference = Array.isArray(modelKey)
            ? this.runEnsembleInferenceOnImage(modelKey, imagePath)
            : this.runInferenceOnImage(modelKey, imagePath);
        inference
            .then(result => {
                const rawLabel = result && result.label != null ? result.label : result;
                // Apply the optional label map so the obs holds the user-facing string
                // (TextFormElement renders the obs verbatim, see views/form/formElement/TextFormElement.js:49).
                const value = labelMap && Object.prototype.hasOwnProperty.call(labelMap, rawLabel)
                    ? labelMap[rawLabel]
                    : rawLabel;
                // Bind the dispatched verdict to the image it was derived from so a
                // later retake (different imagePath) re-runs inference.
                this._lastInferredImageByTarget.set(targetKey, imagePath);
                General.logDebug('EdgeModelSvc',
                    `scheduleImageInference DISPATCH: target=${targetConceptName}${isRqg ? ` qg=${questionGroupConceptName}[${rqgIdx}]` : ''} rawLabel=${rawLabel} mappedValue=${value}`);
                this.dispatchAction(EDGE_MODEL_ACTION.INFERENCE_RESULT_AVAILABLE, isRqg
                    ? {questionGroupConceptName, conceptName: targetConceptName, questionGroupIndex: rqgIdx, value}
                    : {conceptName: targetConceptName, value});
            })
            .catch(err => {
                General.logError('EdgeModelSvc',
                    `scheduleImageInference FAILED ${modelKeyStr} ${imagePath}: ${err && err.message}\n${err && err.stack}`);
            })
            .finally(() => {
                this._scheduled.delete(inflightKey);
            });
    }

    /**
     * Reads the current value of `targetConceptName` inside row `rqgIdx` of the
     * `questionGroupConceptName` Repeatable Question Group on the persisted entity.
     * Returns null when the group, the row, or the child obs is absent.
     */
    _readRqgChildValue(entity, questionGroupConceptName, rqgIdx, targetConceptName) {
        const parentObs = entity.findObservation(questionGroupConceptName);
        const rqg = parentObs && parentObs.getValueWrapper();
        if (!rqg || rqg.size() <= rqgIdx) return null;
        const group = rqg.getGroupObservationAtIndex(rqgIdx);
        const childObs = group && group.findObservationByConceptUUID(targetConceptName);
        return childObs ? childObs.getValue() : null;
    }

    /**
     * Lazy-load the engine handle for `modelKey` exactly once per app lifetime. Idempotent:
     * if the native side has evicted the handle under memory pressure it self-heals via
     * its cached load-args, so we don't re-issue the load call here.
     */
    async _ensureLoaded(modelKey) {
        await this._registryReady;
        if (this._loaded.has(modelKey)) return;  // Steady-state cache hit on every inference; no log to avoid per-call noise.

        const entry = this._registry?.models?.[modelKey];
        if (!entry) {
            const available = Object.keys(this._registry?.models || {});
            General.logError('EdgeModelSvc',
                `_ensureLoaded: no entry for '${modelKey}'. Available: [${available.join(',')}]`);
            throw new Error(`EdgeModelService: no entry for modelKey '${modelKey}' in assets/models/registry.json`);
        }
        const overrideJson = entry.override ? JSON.stringify(entry.override) : null;
        const t0 = Date.now();

        try {
            if (entry.asset?.type === 'encrypted') {
                General.logDebug('EdgeModelSvc',
                    `_ensureLoaded ENCRYPTED: modelKey=${modelKey} path=${entry.asset.path}`);
                await NativeModules.EdgeModelModule.loadEncryptedModel(
                    modelKey,
                    entry.asset.path,
                    entry.asset.encryptionKey,
                    entry.asset.sha256OfPlaintext,
                    overrideJson
                );
            } else {
                General.logDebug('EdgeModelSvc',
                    `_ensureLoaded PLAIN: modelKey=${modelKey} path=${entry.asset?.path}`);
                await NativeModules.EdgeModelModule.loadModel(
                    modelKey,
                    entry.asset.path,
                    overrideJson
                );
            }
            this._loaded.add(modelKey);
            General.logDebug('EdgeModelSvc', `_ensureLoaded OK (${Date.now() - t0}ms): ${modelKey}`);
        } catch (e) {
            General.logError('EdgeModelSvc',
                `_ensureLoaded FAIL (${Date.now() - t0}ms) ${modelKey}: ${e && e.message}`);
            throw e;
        }
    }
}

export default EdgeModelService;
