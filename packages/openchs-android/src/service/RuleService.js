import BaseService from './BaseService.js'
import _ from 'lodash';
import Service from '../framework/bean/Service';
import {RuleDependency, Rule} from "avni-models";
import General from "../utility/General";
import {common, motherCalculations} from 'avni-health-modules';
import * as models from 'avni-models';
import MediaService from "./MediaService";

export const RULE_SERVICE_ACTION = {
    // A burst of direct observation writes into Repeatable Question Group rows, coalesced and applied
    // together so the form re-evaluates once. Handled by ObservationsHolderActions.onObservationWriteBatch
    // (shared with the inference write path). See writeMediaIntoGroup below.
    OBSERVATION_WRITE_BATCH: 'RULE_SERVICE.OBSERVATION_WRITE_BATCH'
};

@Service("ruleService")
class RuleService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.getApplicableRules = this.getApplicableRules.bind(this);
        // Batched-write plumbing for writeMediaIntoGroup (see below).
        this._pendingWrites = [];
        this._flushTimer = null;
        this._flushDelayMs = 120;
        // Last media URI dispatched per target (entityUuid|qg|rqgIdx|concept) so a rule re-firing many
        // times per page doesn't re-dispatch the same copy, while a retake (new filename) still re-copies.
        this._lastWrittenMediaByTarget = new Map();
    }

    init() {
        this.mediaService = this.getService(MediaService);
        const ruleDependency = this.findOnly(RuleDependency.schema.name);
        if (!ruleDependency) return;
        /**********/
        /*variables used inside the eval*/
        let rulesConfig = undefined;
        /*keeping it long to avoid name conflicts*/
        //This is deprecated.
        let ruleServiceLibraryInterfaceForSharingModules = {
            log: console.log,
            common: common,
            motherCalculations: motherCalculations,
            models: models
        };
        rulesConfig = eval(this.trimRuleDependencyCode(ruleDependency));
        /**********/
        this.allRules = {...rulesConfig};
        General.logDebug("RuleService", "\n>>>>>>>>>RULES LOADED<<<<<<<<<\n")
    }

    trimRuleDependencyCode(ruleDependency) {
        let ruleDependencyCodeString = RuleDependency.getCode(ruleDependency)
        if (ruleDependencyCodeString && ruleDependencyCodeString.trim().startsWith('var')) {
            ruleDependencyCodeString = ruleDependencyCodeString.trim().substring(3);
        }
        return ruleDependencyCodeString;
    }

    getApplicableRules(ruledEntity, ruleType, ruledEntityType) {
        General.logDebug("RuleService",
            `Getting Rules of Type ${ruleType} for ${ruledEntityType} - ${ruledEntity.name} ${ruledEntity.uuid}`);
        const rules = this.findAll()
            .map(_.identity)
            .filter(rule =>
                rule.voided === false && rule.type === ruleType &&
                rule.entity.uuid === ruledEntity.uuid && rule.entity.type === ruledEntityType);
        return this.getRuleFunctions(rules);
    }

    getRuleFunctions(rules = []) {
        return _.defaults(rules, [])
            .filter(ar => _.isFunction(this.allRules[ar.fnName]) && _.isFunction(this.allRules[ar.fnName].exec))
            .map(x => {
                x.fn = this.allRules[x.fnName];
                return x;
            });
    }

    getRulesByType(type) {
        return this.getRuleFunctions(
            this.db.objects(Rule.schema.name)
            .filtered(`voided = false and type=$0`, type)
            .map(_.identity));
    }

    getSchema() {
        return Rule.schema.name;
    }

    // ---- Observation-group writes (callable from form-element rules via params.services.ruleService) ----
    //
    // Why this lives here: a rule that returns a value as `FormElementStatus.value` does NOT reliably
    // land in a freshly-seeded projected Repeatable Question Group row — the rule-value apply phase
    // (`updatePrimitiveCodedObs`) runs only on navigation and misses a row's child element when the row
    // was added in the same pass. writeMediaIntoGroup writes such values via a self-triggering, debounced
    // dispatch (the same mechanism the inference path uses for verdicts), so a projected value lands
    // regardless of navigation. A burst (one copy per row on a summary screen) is coalesced into one re-eval.

    // Two media values point at the same image when their filenames match — normalises a stored
    // full-S3-URL against a freshly-captured bare filename. Reuses MediaService.getFileName.
    _sameMedia(a, b) {
        if (a == null || b == null) return false;
        return this.mediaService.getFileName(a) === this.mediaService.getFileName(b);
    }

    /**
     * Copy a media value into row `rqgIdx` of the `questionGroupConceptName` RQG. Dedup'd per
     * (entity, group, row, target) and image filename; a retake (new filename) re-copies; no-op when
     * the row already holds this image.
     */
    writeMediaIntoGroup(mediaUri, entity, questionGroupConceptName, targetConceptName, rqgIdx) {
        if (!mediaUri || !entity || !questionGroupConceptName || !targetConceptName
            || !(typeof rqgIdx === 'number' && rqgIdx >= 0)) {
            return;
        }
        const targetKey = `${entity.uuid}|${questionGroupConceptName}|${rqgIdx}|${targetConceptName}`;
        // Already dispatched this image for this row this session → nothing to do (hot path: the
        // in-memory check runs before the obs-tree walk below).
        if (this._sameMedia(this._lastWrittenMediaByTarget.get(targetKey), mediaUri)) return;
        // Row already persists this image (e.g. populated in a previous session) → seed cache, skip.
        const existing = this._readRqgChildValue(entity, questionGroupConceptName, rqgIdx, targetConceptName);
        if (this._sameMedia(existing, mediaUri)) {
            this._lastWrittenMediaByTarget.set(targetKey, mediaUri);
            return;
        }
        this._lastWrittenMediaByTarget.set(targetKey, mediaUri);
        General.logDebug('RuleService',
            `writeMediaIntoGroup QUEUE: qg=${questionGroupConceptName}[${rqgIdx}] target=${targetConceptName} uri=${mediaUri}`);
        this._queueWrite({
            questionGroupConceptName, conceptName: targetConceptName,
            questionGroupIndex: rqgIdx, value: mediaUri
        });
    }

    /**
     * Accumulate a write and (re)arm a short trailing-debounce so a burst is applied in a single
     * dispatch — the form re-evaluates once, not once per write.
     */
    _queueWrite(result) {
        this._pendingWrites.push(result);
        if (this._flushTimer) clearTimeout(this._flushTimer);
        this._flushTimer = setTimeout(() => this._flushPendingWrites(), this._flushDelayMs);
    }

    _flushPendingWrites() {
        if (this._flushTimer) {
            clearTimeout(this._flushTimer);
            this._flushTimer = null;
        }
        if (this._pendingWrites.length === 0) return;
        const results = this._pendingWrites;
        this._pendingWrites = [];
        General.logDebug('RuleService', `Flushing ${results.length} pending write(s)`);
        this.dispatchAction(RULE_SERVICE_ACTION.OBSERVATION_WRITE_BATCH, {results});
    }

    /**
     * Reads the current value of `targetConceptName` inside row `rqgIdx` of the
     * `questionGroupConceptName` RQG on the persisted entity. Null when group/row/child is absent.
     */
    _readRqgChildValue(entity, questionGroupConceptName, rqgIdx, targetConceptName) {
        const parentObs = entity.findObservation(questionGroupConceptName);
        const rqg = parentObs && parentObs.getValueWrapper();
        if (!rqg || rqg.size() <= rqgIdx) return null;
        const group = rqg.getGroupObservationAtIndex(rqgIdx);
        const childObs = group && group.findObservationByConceptUUID(targetConceptName);
        return childObs ? childObs.getValue() : null;
    }
}

export default RuleService;
