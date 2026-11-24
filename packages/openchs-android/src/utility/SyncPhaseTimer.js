import _ from "lodash";

// In the order SyncService runs them.
export const SyncPhases = Object.freeze({
    MEDIA: 'media',
    PUSH: 'push',
    PULL: 'pull'
});

// Where a failure outside the phases happened: before any began, or after all had finished.
export const SyncStages = Object.freeze({
    SETUP: 'setup',
    FINALISE: 'finalise'
});

export default class SyncPhaseTimer {
    // Durations use a monotonic clock: the wall clock can jump when Android corrects the time mid-sync.
    constructor(now = Date.now, monotonicNow = (now === Date.now ? () => performance.now() : now)) {
        this.now = now;
        this.monotonicNow = monotonicNow;
        this.reset();
    }

    reset() {
        this.phases = {};
    }

    stamp() {
        if (this.monotonicNow === this.now) {
            const time = this.now();
            return {wall: time, mono: time};
        }
        return {wall: this.now(), mono: this.monotonicNow()};
    }

    start(phase) {
        const {wall, mono} = this.stamp();
        this.phases[phase] = {startedAt: wall, startMono: mono};
    }

    end(phase) {
        const entry = this.phases[phase];
        // An end with no start means the caller skipped start(); report nothing rather than a guess.
        if (!entry || _.isFinite(entry.endedAt)) return;
        this.resume(phase);
        const {wall, mono} = this.stamp();
        entry.endedAt = wall;
        entry.endMono = mono;
    }

    // Lets time that is not the sync's own work (user wait, local wipes, deliberate waits) be left out.
    pause(phase) {
        const entry = this.phases[phase];
        if (!entry || _.isFinite(entry.endedAt) || _.isFinite(entry.pausedSince)) return;
        entry.pausedSince = this.monotonicNow();
    }

    resume(phase) {
        const entry = this.phases[phase];
        if (!entry || !_.isFinite(entry.pausedSince)) return;
        entry.pausedMs = (entry.pausedMs || 0) + (this.monotonicNow() - entry.pausedSince);
        delete entry.pausedSince;
    }

    // Runs fn with the phase paused, resuming it whether fn resolves or rejects.
    whilePaused(phase, fn) {
        this.pause(phase);
        return Promise.resolve()
            .then(fn)
            .finally(() => this.resume(phase));
    }

    // Ends only on success, so a failed phase never gets a duration it didn't complete.
    time(phase, fn) {
        this.start(phase);
        return Promise.resolve()
            .then(fn)
            .then((result) => {
                this.end(phase);
                return result;
            });
    }

    // Phases run one at a time, so at most one is ever open.
    failedPhase() {
        const open = _.findKey(this.phases, ({endedAt}) => !_.isFinite(endedAt));
        if (open) return open;
        return _.isEmpty(this.phases) ? SyncStages.SETUP : SyncStages.FINALISE;
    }

    hasStarted(phase) {
        return _.has(this.phases, phase);
    }

    hasFinished(phase) {
        return _.isFinite(_.get(this.phases, [phase, 'endedAt']));
    }

    durationOf({startMono, endMono, pausedMs}) {
        return Math.round(endMono - startMono - (pausedMs || 0));
    }

    // A phase that never ran or never finished is left out, not sent as zero.
    finishedDurations() {
        return _.mapValues(
            _.pickBy(this.phases, ({endedAt}) => _.isFinite(endedAt)),
            (entry) => this.durationOf(entry));
    }

    // durationMs excludes paused time, so it can be less than endedAt - startedAt.
    toTelemetry() {
        return _.mapValues(this.phases, (entry) => _.omitBy({
            startedAt: new Date(entry.startedAt).toISOString(),
            endedAt: _.isFinite(entry.endedAt) ? new Date(entry.endedAt).toISOString() : undefined,
            durationMs: _.isFinite(entry.endedAt) ? this.durationOf(entry) : undefined,
            pausedMs: entry.pausedMs > 0 ? Math.round(entry.pausedMs) : undefined
        }, _.isUndefined));
    }

    // Durations only: GA4 caps an event at 25 params; start/end times are on the telemetry row.
    toFirebaseParams() {
        return _.mapKeys(this.finishedDurations(), (durationMs, phase) => `${phase}_duration_ms`);
    }
}
