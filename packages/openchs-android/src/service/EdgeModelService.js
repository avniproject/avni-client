import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {NativeModules} from "react-native";
import fs from "react-native-fs";
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
    INFERENCE_RESULT_AVAILABLE: 'EDGE_MODEL.INFERENCE_RESULT_AVAILABLE',
    // Coalesced variant: several inference results from one burst applied together so the
    // form re-evaluates once instead of once-per-result. See _queueInferenceResult below.
    INFERENCE_RESULTS_BATCH: 'EDGE_MODEL.INFERENCE_RESULTS_BATCH',
    // No verdict could be produced for an image. Surfaces as a validation error on the image
    // form element, which blocks Next. See _scheduleImageInference's catch.
    INFERENCE_UNAVAILABLE: 'EDGE_MODEL.INFERENCE_UNAVAILABLE'
};

// messageKey resolved by the form element view via I18n. Models are bundled in the APK here, so a
// missing model can't happen at point of use (unlike the remote-fetch line); any failure is a
// runtime one — retaking the photo is the recovery.
export const INFERENCE_UNAVAILABLE_REASON = {
    INFERENCE_FAILED: 'aiInferenceFailed'
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
        // On a cold session cache we recompute (rather than trust) a persisted verdict, since an
        // edit may have swapped the image under it. This caps that recompute to one attempt per
        // image+target per session so a synced-in encounter whose media isn't downloaded (inference
        // keeps failing) doesn't re-fire on every page re-eval. Keyed by targetKey|imagePath.
        this._coldStartRecomputeAttempted = new Set();
        // Inference results wait here for a short trailing-debounce window so a burst of N
        // verdicts (one per image on the summary screen) is applied in a single dispatch —
        // the form then re-evaluates all rules once instead of N times. See
        // _queueInferenceResult / _flushPendingResults.
        this._pendingResults = [];
        this._flushTimer = null;
        this._flushDelayMs = 120;
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
     * Unanimous-AND ensemble over several single-logit sigmoid-binary models (e.g. cross-validation
     * folds of the same model). Runs each via runInferenceOnImage; the image is Positive (suspicious)
     * only when EVERY fold is positive (sigmoid(logit) > threshold) — the false-positive control from
     * TANUH's validated spec (soft-vote over-referred). `combine` is sourced from the folds' shared
     * decoder override; 'unanimous-and' is the default and only shipped value. Returns the combined
     * verdict plus a per-model breakdown; the combined `label` is shaped like a single model's, so
     * callers (e.g. _scheduleImageInference) and `labelMap` treat it identically. `confidence` is the
     * least-confident fold — a diagnostic, NOT a calibrated probability for a hard-AND verdict.
     */
    async runEnsembleInferenceOnImage(modelKeys, imagePath, opts = {}) {
        if (!Array.isArray(modelKeys) || modelKeys.length === 0) {
            throw new Error('EdgeModelService.runEnsembleInferenceOnImage: modelKeys must be a non-empty array');
        }
        // Combine rule comes from the folds' shared decoder override (tanuh-ensemble-override.json);
        // explicit opts win. 'unanimous-and' is the default and only shipped value.
        await this._registryReady;
        const decoderParams = this._registry?.models?.[modelKeys[0]]?.override?.output?.params || {};
        const combine = opts.combine ?? decoderParams.combine ?? 'unanimous-and';
        const threshold = opts.threshold ?? decoderParams.threshold ?? 0.5;
        const labels = opts.labels ?? decoderParams.labels ?? ['Negative', 'Positive'];
        if (combine !== 'unanimous-and') {
            throw new Error(`EdgeModelService.runEnsembleInferenceOnImage: unsupported combine='${combine}' (only 'unanimous-and' is shipped)`);
        }

        const t0 = Date.now();
        const results = await Promise.all(modelKeys.map(k => this.runInferenceOnImage(k, imagePath)));
        // Fail loud on a fold with a non-finite logit rather than letting it silently count as a
        // negative vote — sigmoid(NaN) > threshold is false below, so a malformed fold would
        // masquerade as a confident negative, the worst outcome for a screening verdict. Throwing
        // here follows the same contract as a fold that throws: no verdict is written, the target
        // obs stays absent.
        results.forEach((r, i) => {
            if (!Number.isFinite(r.logit)) {
                throw new Error(`EdgeModelService.runEnsembleInferenceOnImage: fold ${modelKeys[i]} returned a non-finite logit (${r.logit}); models=[${modelKeys.join(',')}]`);
            }
        });
        const sigmoid = (x) => 1 / (1 + Math.exp(-x));
        // Per-model positive is sigmoid(logit) > threshold — unambiguous, independent of how each
        // fold result defines `confidence`. Unanimous AND: suspicious iff ALL folds are positive.
        const perModel = results.map((r, i) => ({
            modelKey: modelKeys[i], logit: r.logit, confidence: r.confidence, label: r.label,
            positive: sigmoid(r.logit) > threshold
        }));
        const positive = perModel.every(p => p.positive);
        // No single probability is meaningful for a hard-AND verdict; report the least-confident
        // fold's confidence as a diagnostic (NOT a calibrated probability).
        const confidence = Math.min(...perModel.map(p => p.confidence));
        const label = positive ? labels[1] : labels[0];
        General.logDebug('EdgeModelSvc',
            `runEnsembleInferenceOnImage OK (${Date.now() - t0}ms): combine=unanimous-and positive=${positive} label=${label} models=[${modelKeys.join(',')}]`);
        return {label, confidence, positive, modelKeys, perModel};
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

        const lastImage = this._lastInferredImageByTarget.get(targetKey);
        if (lastImage === imagePath) {
            // We've already run inference for this exact image+target. The verdict is either
            // persisted (existing != null — steady-state rule re-fire), or computed and waiting
            // in the pending-results batch to be flushed (existing == null, between resolve and
            // the debounced dispatch). In BOTH cases there's no work to do. Checking this before
            // the `existing != null` guard is what covers the resolved-but-not-yet-written
            // window — otherwise an unrelated re-eval during the flush debounce would launch a
            // duplicate inference for an image we just inferred. No log: this is the hot path.
            return;
        }
        // Invalidation: a populated target whose image binding is unknown (cold start) or
        // known-different (in-session retake) must not keep satisfying a mandatory gate against
        // the wrong photo. The clear rides the shared flush timer at 0ms — outside the
        // rule/reducer call stack, ahead of inference, never coalesced behind the 120ms debounce.
        const queueClear = () => {
            General.logDebug('EdgeModelSvc',
                `scheduleImageInference INVALIDATING stale verdict for '${targetConceptName}'${isRqg ? `[${rqgIdx}]` : ''}`);
            this._queueInferenceResult(isRqg
                ? {questionGroupConceptName, conceptName: targetConceptName, questionGroupIndex: rqgIdx, value: null, clear: true}
                : {conceptName: targetConceptName, value: null, clear: true});
            if (this._flushTimer) clearTimeout(this._flushTimer);
            this._flushTimer = setTimeout(() => this._flushPendingResults(), 0);
        };
        const attemptKey = `${targetKey}|${imagePath}`;
        if (existing == null && this._coldStartRecomputeAttempted.has(attemptKey)) {
            // An invalidation already blanked this target and the recompute for this exact image
            // failed once — don't churn on every re-eval; a retake (new path) re-enables.
            General.logDebug('EdgeModelSvc',
                `scheduleImageInference SKIP recompute already attempted for '${targetConceptName}' (${imagePath})`);
            return;
        }
        let invalidateIfMediaPresent = false;
        let invalidateStaleNow = false;
        if (existing != null) {
            if (lastImage === undefined) {
                // Persisted verdict, cold session cache: an edit may have swapped the image under
                // it, so recompute instead of trusting it — capped to one attempt per image.
                if (this._coldStartRecomputeAttempted.has(attemptKey)) {
                    General.logDebug('EdgeModelSvc',
                        `scheduleImageInference SKIP cold-start recompute already attempted for '${targetConceptName}' (${imagePath})`);
                    return;
                }
                this._coldStartRecomputeAttempted.add(attemptKey);
                General.logDebug('EdgeModelSvc',
                    `scheduleImageInference cold-start recompute for '${targetConceptName}' (persisted verdict, imagePath=${imagePath})`);
                // Blank only when the media file is present (recompute will definitively resolve);
                // a missing file must keep the persisted verdict.
                invalidateIfMediaPresent = true;
            } else {
                // Photo retaken in-session; the clear runs below, after the in-flight dedup.
                General.logDebug('EdgeModelSvc',
                    `scheduleImageInference image CHANGED for '${targetConceptName}' (was ${lastImage}, now ${imagePath})`);
                this._coldStartRecomputeAttempted.add(attemptKey);
                invalidateStaleNow = true;
            }
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
        if (invalidateStaleNow) queueClear();

        const runInference = () => Array.isArray(modelKey)
            ? this.runEnsembleInferenceOnImage(modelKey, imagePath)
            : this.runInferenceOnImage(modelKey, imagePath);
        const inference = invalidateIfMediaPresent
            ? (async () => {
                // Fail CLOSED: when fs is unavailable, media presence is unknown — keep the verdict.
                const mediaPresent = await (fs && fs.exists
                    ? fs.exists(imagePath).catch(() => false)
                    : Promise.resolve(false));
                if (mediaPresent) queueClear();
                return runInference();
            })()
            : runInference();
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
                    `scheduleImageInference QUEUE: target=${targetConceptName}${isRqg ? ` qg=${questionGroupConceptName}[${rqgIdx}]` : ''} rawLabel=${rawLabel} mappedValue=${value}`);
                this._queueInferenceResult(isRqg
                    ? {questionGroupConceptName, conceptName: targetConceptName, questionGroupIndex: rqgIdx, value}
                    : {conceptName: targetConceptName, value});
            })
            .catch(err => {
                General.logError('EdgeModelSvc',
                    `scheduleImageInference FAILED ${modelKeyStr} ${imagePath}: ${err && err.message}\n${err && err.stack}`);
                // No verdict was produced. Cap this image so we don't re-run and re-dispatch on every
                // rule cycle — the failure is a runtime one (the model is bundled, so it's present),
                // and a retake yields a new path that gets a fresh attempt. Then tell the form so it
                // blocks Next rather than let the worker reach referral on an absent verdict.
                // Dispatched (not returned): the scheduling rule is synchronous and returned long ago;
                // the Inference-typed error is cleared by the #2009 re-sync when a verdict later lands.
                this._coldStartRecomputeAttempted.add(attemptKey);
                this.dispatchAction(EDGE_MODEL_ACTION.INFERENCE_UNAVAILABLE, {
                    conceptName: targetConceptName,
                    questionGroupConceptName,
                    questionGroupIndex: rqgIdx,
                    messageKey: INFERENCE_UNAVAILABLE_REASON.INFERENCE_FAILED
                });
            })
            .finally(() => {
                this._scheduled.delete(inflightKey);
            });
    }

    /**
     * Accumulate a resolved inference result and (re)arm a short trailing-debounce timer.
     * On the summary screen N images resolve in a burst; without this each result would
     * dispatch separately and re-run every form-element rule (O(N × all-rules) on the JS
     * thread) plus re-render N times — which also remounts/blanks the read-only images.
     * Coalescing the burst into one INFERENCE_RESULTS_BATCH dispatch makes the form
     * re-evaluate once. A single result simply flushes ~120ms later — negligible.
     */
    _queueInferenceResult(result) {
        this._pendingResults.push(result);
        if (this._flushTimer) clearTimeout(this._flushTimer);
        this._flushTimer = setTimeout(() => this._flushPendingResults(), this._flushDelayMs);
    }

    _flushPendingResults() {
        if (this._flushTimer) {
            clearTimeout(this._flushTimer);
            this._flushTimer = null;
        }
        if (this._pendingResults.length === 0) return;
        const results = this._pendingResults;
        this._pendingResults = [];
        General.logDebug('EdgeModelSvc', `Flushing ${results.length} pending inference result(s)`);
        this.dispatchAction(EDGE_MODEL_ACTION.INFERENCE_RESULTS_BATCH, {results});
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
