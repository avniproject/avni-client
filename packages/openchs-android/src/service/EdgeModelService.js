import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {NativeModules} from "react-native";
import General from "../utility/General";
import fs from 'react-native-fs';
import _ from "lodash";
import {DownloadableContent} from 'avni-models';
import FileSystem from "../model/FileSystem";

const EDGE_MODEL_CATEGORY = 'edgeModel';

/**
 * EdgeModelService — JS surface for on-device inference.
 *
 * The model is resolved from synced `DownloadableContent` rows of category `edgeModel`
 * (admin-configured, server-managed) rather than an in-APK registry: each row's `payload`
 * carries the engine/preprocessor/decoder override; its `sha256` keys the cached encrypted
 * blob (`<modelsDir>/<sha256>.bin`) and the app-private AES key (`<modelKeysDir>/<sha256>.key`),
 * both written at sync time by DownloadableContentService. The blob/key never ship in the binary.
 *
 * An ensemble = multiple `edgeModel` rows; each is loaded by its own cached path + key. If a
 * fold's blob or key isn't cached yet (download pending/failed at sync), inference does not run —
 * the verdict is simply absent (the failure was already surfaced at sync). Inference never
 * downloads at point of use.
 *
 * Rule usage (single-row category, raw return):
 *   const result = await params.services.edgeModelService.runInferenceOnImage(imagePath);
 *
 * Rule usage (async inline path — writes the verdict to a target obs, see scheduleImageInference):
 *   params.services.edgeModelService.scheduleImageInference(
 *     imagePath, encounter, 'AI Suspicion Result',
 *     { 'Positive': 'Suspicious', 'Negative': 'Non Suspicious' }   // optional labelMap
 *   );
 *
 * Rule usage (target inside a Repeatable Question Group row):
 *   params.services.edgeModelService.scheduleImageInferenceIntoGroup(
 *     imagePath, encounter, 'Lesion Group', 'AI Suspicion Result', rowIdx, labelMap
 *   );
 *
 * Both schedule methods also accept the legacy `newmodel`-era shape with a leading model key
 * (e.g. `scheduleImageInferenceIntoGroup(modelKey, imagePath, encounter, ...)`); the key is
 * ignored (the model resolves from synced DownloadableContent). See _stripLegacyModelKey.
 */
export const EDGE_MODEL_ACTION = {
    INFERENCE_RESULT_AVAILABLE: 'EDGE_MODEL.INFERENCE_RESULT_AVAILABLE',
    // Coalesced variant: several inference results from one burst applied together so the
    // form re-evaluates once instead of once-per-result. See _queueInferenceResult below.
    INFERENCE_RESULTS_BATCH: 'EDGE_MODEL.INFERENCE_RESULTS_BATCH'
};

@Service("edgeModelService")
class EdgeModelService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this._loaded = new Set();
        // Dedup keys for in-flight scheduleImageInference jobs — keyed by
        // entityUuid|imagePath[|qg|row]. Cleared in finally(). Form-element rules tend to
        // re-fire frequently (after every primitive obs change anywhere on the page), so
        // without this guard we'd launch a fresh inference per re-render.
        this._scheduled = new Set();
        // Last imagePath whose inference produced the target obs, keyed by
        // entityUuid|targetConceptName. Lets scheduleImageInference detect "user retook the
        // photo" and re-run inference instead of being short-circuited by the existing
        // (now-stale) verdict. In-memory only — on app restart we lazily seed the cache
        // with the current imagePath the first time we see a populated target obs.
        this._lastInferredImageByTarget = new Map();
        // Inference results wait here for a short trailing-debounce window so a burst of N
        // verdicts (one per image on the summary screen) is applied in a single dispatch.
        this._pendingResults = [];
        this._flushTimer = null;
        this._flushDelayMs = 120;
    }

    getSchema() {
        return DownloadableContent.schema.name;
    }

    blobPath(sha256) {
        return `${FileSystem.getModelsDir()}/${sha256}.bin`;
    }

    keyPath(sha256) {
        return `${FileSystem.getModelKeysDir()}/${sha256}.key`;
    }

    /**
     * The synced `edgeModel` content rows that make up the model. An ensemble is several rows;
     * a single model is one. Order is stable so the per-fold breakdown is deterministic.
     */
    _edgeModelRows() {
        return _.sortBy(
            // Predicate matches the downloader (DownloadableContentService.downloadContent),
            // which requires both contentKey and sha256 — a row missing either is never cached,
            // so treating it as a loadable fold would silently degrade inference.
            this.getAllNonVoided().filter(row => row.category === EDGE_MODEL_CATEGORY && !_.isNil(row.sha256) && !_.isNil(row.contentKey)),
            row => row.sha256
        );
    }

    /**
     * Build the native override JSON (engine/preprocessor/decoder DSL — see ModelContract.kt)
     * from a row's `payload`. The payload carries the override block directly; an absent or
     * empty payload yields null, which the native side rejects loudly.
     */
    _overrideJsonFor(row) {
        const payload = row.getPayload();
        return _.isEmpty(payload) ? null : JSON.stringify(payload);
    }

    /**
     * Read the app-private AES key written at sync time. Absent ⇒ not cached yet (degrade).
     */
    async _readKey(sha256) {
        const path = this.keyPath(sha256);
        if (!await fs.exists(path)) {
            return null;
        }
        const key = await fs.readFile(path, 'utf8');
        return _.isEmpty(key) ? null : key;
    }

    /**
     * Run inference on an image file path for the resolved edge model. Native handles
     * decode → resize → normalise → layout-transpose, driven by the resolved preprocessor.
     * `imagePath` is an absolute on-device path (`file://` stripped).
     */
    async runInferenceOnImage(imagePath) {
        const rows = this._edgeModelRows();
        if (rows.length === 0) {
            throw new Error('EdgeModelService.runInferenceOnImage: no edgeModel content row is synced');
        }
        if (rows.length === 1) {
            const result = await this._runInferenceOnImageForRow(rows[0], imagePath);
            return this._withPositive(result, rows[0]);
        }
        return this.runEnsembleInferenceOnImage(imagePath);
    }

    /**
     * Guarantee the `positive` boolean on a verdict. The native single-model result omits it;
     * derive it from the row's decoder labels (positive = label matches labels[1]) so the
     * single-row and ensemble paths share the same {label, confidence, positive} shape.
     */
    _withPositive(result, row) {
        if (!_.isNil(result.positive)) {
            return result;
        }
        const labels = row.getPayload()?.output?.params?.labels || ['Negative', 'Positive'];
        return {...result, positive: result.label === labels[1]};
    }

    async _runInferenceOnImageForRow(row, imagePath) {
        General.logDebug('EdgeModelSvc', `runInferenceOnImage: sha256=${row.sha256} imagePath=${imagePath}`);
        const t0 = Date.now();
        await this._ensureLoaded(row);
        try {
            const result = await NativeModules.EdgeModelModule.runInferenceOnImage(row.sha256, imagePath);
            General.logDebug('EdgeModelSvc',
                `runInferenceOnImage OK (${Date.now() - t0}ms): label=${result && result.label}`);
            return result;
        } catch (e) {
            General.logError('EdgeModelSvc',
                `runInferenceOnImage FAIL (${Date.now() - t0}ms) ${row.sha256}: ${e && e.message}`);
            throw e;
        }
    }

    /**
     * Soft-vote ensemble over the synced `edgeModel` rows (e.g. cross-validation folds of the
     * same model). Runs each row, then combines:
     *   • 'mean-prob'  (default): average the per-model sigmoid probabilities.
     *   • 'mean-logit'          : average the raw logits, then sigmoid.
     * `threshold` picks labels[1] (positive) vs labels[0]. Returns the combined verdict plus a
     * per-model breakdown. The combined `label` is shaped like a single model's, so callers
     * (e.g. _scheduleImageInference) and `labelMap` treat it identically.
     */
    async runEnsembleInferenceOnImage(imagePath, opts = {}) {
        const rows = this._edgeModelRows();
        if (rows.length === 0) {
            throw new Error('EdgeModelService.runEnsembleInferenceOnImage: no edgeModel content row is synced');
        }
        // Default threshold/labels from the first fold's decoder params so the combined verdict
        // tracks the synced payload like the single-row path does; explicit opts win.
        const decoderParams = rows[0].getPayload()?.output?.params || {};
        const combine = opts.combine ?? 'mean-prob';
        const threshold = opts.threshold ?? decoderParams.threshold ?? 0.5;
        const labels = opts.labels ?? decoderParams.labels ?? ['Negative', 'Positive'];

        const t0 = Date.now();
        const results = await Promise.all(rows.map(row => this._runInferenceOnImageForRow(row, imagePath)));
        const mean = nums => nums.reduce((s, x) => s + x, 0) / nums.length;
        const score = combine === 'mean-logit'
            ? 1 / (1 + Math.exp(-mean(results.map(r => r.logit))))
            : mean(results.map(r => r.confidence));
        // Fail loud rather than silently scoring NaN — NaN > threshold is false, which would
        // masquerade as a confident negative verdict. A non-finite score means a fold result
        // lacked the field this combine mode needs (confidence / logit).
        if (!Number.isFinite(score)) {
            throw new Error(`EdgeModelService.runEnsembleInferenceOnImage: non-finite score (combine=${combine}) — a fold result lacked a numeric ${combine === 'mean-logit' ? 'logit' : 'confidence'}; rows=[${rows.map(r => r.sha256).join(',')}]`);
        }
        const positive = score > threshold;
        const label = positive ? labels[1] : labels[0];
        General.logDebug('EdgeModelSvc',
            `runEnsembleInferenceOnImage OK (${Date.now() - t0}ms): combine=${combine} score=${score.toFixed(4)} label=${label} rows=${rows.length}`);
        return {
            label, confidence: score, positive,
            perModel: results.map((r, i) => ({sha256: rows[i].sha256, logit: r.logit, confidence: r.confidence, label: r.label}))
        };
    }

    /**
     * Backward-compatible dispatch. The `newmodel`-era signature prepended a `modelKey`
     * (single sha/name or an ensemble array); 17.0 dropped it and resolves the model from
     * synced DownloadableContent. Deployed org rules still call the 7-/5-arg legacy shape,
     * so accept both. The unambiguous discriminator is `args[1]`: it's the imagePath (a
     * string) in the legacy shape and the entity (an object) in the 17.0 shape. When legacy,
     * drop args[0] (the modelKey — resolved internally now) and read the rest shifted.
     * (Arg-count can't be used: labelMap is optional, so a new N-arg call collides with a
     * legacy (N)-arg call that omitted labelMap.)
     */
    _stripLegacyModelKey(args) {
        return typeof args[1] === 'string' ? args.slice(1) : args;
    }

    /**
     * Inline-async path for form-element rules, target is a top-level concept on the entity.
     * Thin wrapper over _scheduleImageInference — see that method for the full contract.
     * Accepts both the 17.0 shape `(imagePath, entity, targetConceptName, labelMap)` and the
     * legacy `(modelKey, imagePath, entity, targetConceptName, labelMap)`.
     */
    scheduleImageInference(...args) {
        const [imagePath, entity, targetConceptName, labelMap] = this._stripLegacyModelKey(args);
        return this._scheduleImageInference({
            imagePath, entity, targetConceptName, labelMap,
            questionGroupConceptName: null, rqgIdx: null
        });
    }

    /**
     * Same as scheduleImageInference, but writes the verdict into the `targetConceptName`
     * obs inside row `rqgIdx` of the `questionGroupConceptName` Repeatable Question Group.
     * Accepts both the 17.0 shape `(imagePath, entity, questionGroupConceptName,
     * targetConceptName, rqgIdx, labelMap)` and the legacy shape with a leading `modelKey`.
     */
    scheduleImageInferenceIntoGroup(...args) {
        const [imagePath, entity, questionGroupConceptName, targetConceptName, rqgIdx, labelMap] =
            this._stripLegacyModelKey(args);
        return this._scheduleImageInference({
            imagePath, entity, targetConceptName, labelMap,
            questionGroupConceptName, rqgIdx
        });
    }

    /**
     * Fires inference in the background; on resolve, dispatches a redux action that writes
     * the result as an observation and re-runs form-element rules so the dependent form
     * element re-renders. When `questionGroupConceptName`/`rqgIdx` are set, the obs is
     * written into that row of the named Repeatable Question Group instead of at top level.
     *
     * Why this exists: Avni's form-element rule engine is synchronous. A rule returning a
     * Promise would put the Promise — not the resolved status — into the rule-evaluator
     * output, and the dependent element never updated. This method lets the rule kick off
     * async work without changing the rule contract; the result lands as a sibling observation
     * the dependent form element's synchronous rule reads via `entity.getObservationValue`.
     *
     * Errors (including a not-yet-cached model) are swallowed (logged only). On failure the
     * target obs stays absent and the dependent form element behaves as it would for a
     * not-yet-arrived result — keeps the form save path unblocked.
     */
    _scheduleImageInference({imagePath, entity, targetConceptName, labelMap, questionGroupConceptName, rqgIdx}) {
        const isRqg = questionGroupConceptName != null;
        if (!entity || !targetConceptName || !imagePath
            || (isRqg && !(typeof rqgIdx === 'number' && rqgIdx >= 0))) {
            General.logError('EdgeModelSvc',
                `scheduleImageInference SKIP missing-arg: entity=${!!entity} target=${!!targetConceptName} imagePath=${!!imagePath} qg=${questionGroupConceptName} rqgIdx=${rqgIdx}`);
            return;
        }

        const targetKey = isRqg
            ? `${entity.uuid}|${questionGroupConceptName}|${rqgIdx}|${targetConceptName}`
            : `${entity.uuid}|${targetConceptName}`;
        const existing = isRqg
            ? this._readRqgChildValue(entity, questionGroupConceptName, rqgIdx, targetConceptName)
            : entity.getObservationValue(targetConceptName);

        const lastImage = this._lastInferredImageByTarget.get(targetKey);
        if (lastImage === imagePath) {
            // Already inferred for this exact image+target — verdict is either persisted or
            // queued in the pending batch. Either way there's no work. Checking before the
            // `existing != null` guard covers the resolved-but-not-yet-written window.
            return;
        }
        if (existing != null) {
            if (lastImage === undefined) {
                // First time we're seeing this target in-session and it's already populated →
                // persisted verdict from a previous session. Trust it, seed the cache so a
                // later retake (different imagePath) re-runs.
                this._lastInferredImageByTarget.set(targetKey, imagePath);
                General.logDebug('EdgeModelSvc',
                    `scheduleImageInference SKIP trust persisted verdict for '${targetConceptName}' (seeded lastImage=${imagePath})`);
                return;
            }
            General.logDebug('EdgeModelSvc',
                `scheduleImageInference image CHANGED for '${targetConceptName}' (was ${lastImage}, now ${imagePath}) — re-running`);
        }

        const inflightKey = isRqg
            ? `${entity.uuid}|${imagePath}|${questionGroupConceptName}|${rqgIdx}`
            : `${entity.uuid}|${imagePath}`;
        if (this._scheduled.has(inflightKey)) {
            General.logDebug('EdgeModelSvc', `scheduleImageInference SKIP already in flight: ${inflightKey}`);
            return;
        }
        this._scheduled.add(inflightKey);
        General.logDebug('EdgeModelSvc', `scheduleImageInference QUEUED: ${inflightKey}`);

        this.runInferenceOnImage(imagePath)
            .then(result => {
                const rawLabel = result && result.label != null ? result.label : result;
                // Apply the optional label map so the obs holds the user-facing string
                // (TextFormElement renders the obs verbatim).
                const value = labelMap && Object.prototype.hasOwnProperty.call(labelMap, rawLabel)
                    ? labelMap[rawLabel]
                    : rawLabel;
                // Bind the dispatched verdict to the image it was derived from so a later
                // retake (different imagePath) re-runs inference.
                this._lastInferredImageByTarget.set(targetKey, imagePath);
                General.logDebug('EdgeModelSvc',
                    `scheduleImageInference QUEUE: target=${targetConceptName}${isRqg ? ` qg=${questionGroupConceptName}[${rqgIdx}]` : ''} rawLabel=${rawLabel} mappedValue=${value}`);
                this._queueInferenceResult(isRqg
                    ? {questionGroupConceptName, conceptName: targetConceptName, questionGroupIndex: rqgIdx, value}
                    : {conceptName: targetConceptName, value});
            })
            .catch(err => {
                General.logError('EdgeModelSvc',
                    `scheduleImageInference FAILED ${imagePath}: ${err && err.message}\n${err && err.stack}`);
            })
            .finally(() => {
                this._scheduled.delete(inflightKey);
            });
    }

    /**
     * Accumulate a resolved inference result and (re)arm a short trailing-debounce timer.
     * On the summary screen N images resolve in a burst; coalescing them into one
     * INFERENCE_RESULTS_BATCH dispatch makes the form re-evaluate once instead of N times.
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
     * Lazy-load the engine handle for an edge-model row exactly once per app lifetime, keyed by
     * its sha256. Resolves the cached encrypted blob + app-private key (written at sync time) and
     * loads them via the native file-path bridge; the overrideJson is built from `payload`.
     *
     * Idempotent: if the native side evicted the handle under memory pressure it self-heals via
     * its cached load-args, so we don't re-issue the load call here. A missing cached blob or key
     * (download pending/failed) throws a recognisable error the schedule path swallows — the
     * verdict is simply absent; the failure was surfaced at sync time.
     */
    async _ensureLoaded(row) {
        const sha256 = row.sha256;
        if (this._loaded.has(sha256)) return;  // Steady-state cache hit on every inference; no log to avoid per-call noise.

        const blobPath = this.blobPath(sha256);
        if (!await fs.exists(blobPath)) {
            throw new Error(`EdgeModelService: model blob not cached yet for sha256 '${sha256}' (download pending or failed at sync)`);
        }
        const overrideJson = this._overrideJsonFor(row);
        const t0 = Date.now();

        let nativeLoadAttempted = false;
        try {
            const key = row.needsKey ? await this._readKey(sha256) : null;
            if (row.needsKey && _.isNil(key)) {
                throw new Error(`EdgeModelService: AES key not cached yet for sha256 '${sha256}' (key fetch pending or failed at sync)`);
            }
            General.logDebug('EdgeModelSvc', `_ensureLoaded ENCRYPTED FILE: sha256=${sha256} path=${blobPath}`);
            nativeLoadAttempted = true;
            await NativeModules.EdgeModelModule.loadEncryptedModelFromFile(
                sha256,
                blobPath,
                key,
                sha256,
                overrideJson
            );
            this._loaded.add(sha256);
            General.logDebug('EdgeModelSvc', `_ensureLoaded OK (${Date.now() - t0}ms): ${sha256}`);
        } catch (e) {
            General.logError('EdgeModelSvc',
                `_ensureLoaded FAIL (${Date.now() - t0}ms) ${sha256}: ${e && e.message}`);
            // A native load failure (GCM/sha mismatch) means the cached blob is corrupt/poisoned;
            // drop it so the next sync re-fetches. Pre-native guard throws are transient pending
            // states — the cache is fine, so leave it alone.
            if (nativeLoadAttempted) {
                await fs.unlink(this.blobPath(sha256)).catch(() => {});
            }
            throw e;
        }
    }
}

export default EdgeModelService;
