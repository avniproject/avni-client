// SPIKE ONLY - device sync measurement (branch spike/sync-device-perf). Never merge.
// Toggles come from config/spike-flags.json, overwritten per run by spike/build.sh.
import _ from "lodash";

const flags = require("../../../config/spike-flags.json");

const SpikeFlags = Object.freeze({
    RUN_ID: flags.runId || "unnamed",
    PIPELINE: !!flags.pipeline,          // fetch page N+1 while page N is parsed, mapped and written
    FK_STUB: !!flags.fkStub,             // uuid-only stubs instead of a SELECT per transactional parent
    SYNC_NORMAL: !!flags.syncNormal,     // PRAGMA synchronous = NORMAL (WAL)
    DROP_INDEXES: !!flags.dropIndexes,   // drop secondary indexes for the sync, recreate after
    MULTIROW: !!flags.multiRow,          // multi-row VALUES chunks instead of one INSERT per row
    PAGE_SIZE: _.isFinite(flags.pageSize) ? flags.pageSize : null,
    TIMEOUT_MS: _.isFinite(flags.timeoutMs) ? flags.timeoutMs : 300000,
});

// Set by SyncService.persistAll while a page is being mapped, so findByKey knows which
// entity's fromResource is asking.
export const SpikeState = {currentEntity: null};

// (child entity being mapped) -> parent schemas whose lookup only ends up as a uuid column.
// Verified against avni-models 18.0: each of these fromResource bodies assigns the parent to a
// property and reads nothing from it; EntityHydrator.flatten accepts {uuid}.
const STUB_PAIRS = {
    Individual: ["AddressLevel"],
    ProgramEnrolment: ["Individual"],
    ProgramEncounter: ["ProgramEnrolment"],
    Encounter: ["Individual"],
    Checklist: ["ProgramEnrolment", "ChecklistDetail"],
    ChecklistItem: ["Checklist"],
    Comment: ["Individual", "CommentThread"],
    EntityApprovalStatus: ["ApprovalStatus"],
};

export function spikeShouldStub(parentSchemaName) {
    const child = SpikeState.currentEntity;
    if (!child) return false;
    const parents = STUB_PAIRS[child];
    return !!parents && parents.includes(parentSchemaName);
}

export function heapStats() {
    try {
        const hi = global.HermesInternal;
        const s = hi && typeof hi.getInstrumentedStats === "function" ? hi.getInstrumentedStats() : null;
        if (!s) return {};
        const mb = (b) => (_.isFinite(b) ? Math.round(b / 1048576 * 10) / 10 : undefined);
        return {heapMB: mb(s.js_heapSize), allocMB: mb(s.js_allocatedBytes), gcs: s.js_numGCs, gcTime: s.js_gcTime};
    } catch (e) {
        return {};
    }
}

// ConsoleLogInterceptorService sends every console method to a file only in non-dev builds, so go
// straight to React Native's native logging hook (what the console polyfill itself uses; level 1 = info),
// which lands in logcat under the ReactNativeJS tag.
export function spikeLog(event, fields = {}) {
    const line = `[SPIKE] ${JSON.stringify({t: Date.now(), ev: event, run: SpikeFlags.RUN_ID, ...fields})}`;
    if (typeof global.nativeLoggingHook === "function") {
        global.nativeLoggingHook(line, 1);
    } else {
        console.log(line);
    }
}

export default SpikeFlags;
