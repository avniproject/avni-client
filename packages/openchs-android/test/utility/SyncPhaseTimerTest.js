import SyncPhaseTimer, {SyncPhases, SyncStages} from "../../src/utility/SyncPhaseTimer";

// A clock that returns the queued times in order, so every start/end lands on a known millisecond.
const clockOf = (...times) => {
    const queue = [...times];
    return () => queue.shift();
};

describe("SyncPhaseTimer", () => {
    it("reports the duration of each finished phase", () => {
        const timer = new SyncPhaseTimer(clockOf(1000, 3000, 3000, 7500, 7600, 19600));
        timer.start(SyncPhases.MEDIA);
        timer.end(SyncPhases.MEDIA);
        timer.start(SyncPhases.PUSH);
        timer.end(SyncPhases.PUSH);
        timer.start(SyncPhases.PULL);
        timer.end(SyncPhases.PULL);

        expect(timer.toTelemetry()).toEqual({
            media: {startedAt: new Date(1000).toISOString(), endedAt: new Date(3000).toISOString(), durationMs: 2000},
            push: {startedAt: new Date(3000).toISOString(), endedAt: new Date(7500).toISOString(), durationMs: 4500},
            pull: {startedAt: new Date(7600).toISOString(), endedAt: new Date(19600).toISOString(), durationMs: 12000}
        });
        expect(timer.toFirebaseParams()).toEqual({
            media_duration_ms: 2000,
            push_duration_ms: 4500,
            pull_duration_ms: 12000
        });
    });

    it("leaves out a phase that never ran instead of sending zero", () => {
        const timer = new SyncPhaseTimer(clockOf(100, 400));
        timer.start(SyncPhases.PUSH);
        timer.end(SyncPhases.PUSH);

        expect(Object.keys(timer.toTelemetry())).toEqual(["push"]);
        expect(timer.toFirebaseParams()).toEqual({push_duration_ms: 300});
    });

    it("keeps an unfinished phase on the row as a start only, and out of Firebase", () => {
        const timer = new SyncPhaseTimer(clockOf(100, 400, 500));
        timer.start(SyncPhases.PUSH);
        timer.end(SyncPhases.PUSH);
        timer.start(SyncPhases.PULL);

        expect(timer.toTelemetry().pull).toEqual({startedAt: new Date(500).toISOString()});
        expect(timer.toFirebaseParams()).toEqual({push_duration_ms: 300});
    });

    it("ignores an end with no start, and a second end", () => {
        const timer = new SyncPhaseTimer(clockOf(100, 400, 900));
        timer.end(SyncPhases.MEDIA);
        timer.start(SyncPhases.PUSH);
        timer.end(SyncPhases.PUSH);
        timer.end(SyncPhases.PUSH);

        expect(timer.toTelemetry()).toEqual({
            push: {startedAt: new Date(100).toISOString(), endedAt: new Date(400).toISOString(), durationMs: 300}
        });
    });

    it("time() ends the phase when the work resolves and passes its result through", async () => {
        const timer = new SyncPhaseTimer(clockOf(100, 250));
        await expect(timer.time(SyncPhases.MEDIA, () => Promise.resolve("done"))).resolves.toBe("done");
        expect(timer.toFirebaseParams()).toEqual({media_duration_ms: 150});
    });

    it("time() leaves the phase open when the work rejects", async () => {
        const timer = new SyncPhaseTimer(clockOf(100, 250));
        const offline = () => Promise.reject(new Error("offline"));
        await expect(timer.time(SyncPhases.PUSH, offline)).rejects.toThrow("offline");
        expect(timer.toTelemetry()).toEqual({push: {startedAt: new Date(100).toISOString()}});
        expect(timer.toFirebaseParams()).toEqual({});
    });

    describe("failedPhase (PE-219)", () => {
        it("is setup when no phase had started", () => {
            expect(new SyncPhaseTimer().failedPhase()).toBe(SyncStages.SETUP);
        });

        it("is the phase still open", () => {
            const timer = new SyncPhaseTimer(clockOf(1, 2, 3));
            timer.start(SyncPhases.MEDIA);
            timer.end(SyncPhases.MEDIA);
            timer.start(SyncPhases.PUSH);
            expect(timer.failedPhase()).toBe(SyncPhases.PUSH);
        });

        it("is finalise when every phase that started had finished", () => {
            const timer = new SyncPhaseTimer(clockOf(1, 2, 3, 4));
            timer.start(SyncPhases.PUSH);
            timer.end(SyncPhases.PUSH);
            timer.start(SyncPhases.PULL);
            timer.end(SyncPhases.PULL);
            expect(timer.failedPhase()).toBe(SyncStages.FINALISE);
        });

        it("is the phase whose work rejected", async () => {
            const timer = new SyncPhaseTimer(clockOf(1));
            await expect(timer.time(SyncPhases.MEDIA, () => Promise.reject(new Error("s3 down")))).rejects.toThrow();
            expect(timer.failedPhase()).toBe(SyncPhases.MEDIA);
        });
    });

    describe("pause", () => {
        it("leaves time paused out of the duration and reports it separately", () => {
            // start 0, pause 1000, resume 61000 (a minute on the dialog), end 66000
            const timer = new SyncPhaseTimer(clockOf(0, 1000, 61000, 66000));
            timer.start(SyncPhases.PULL);
            timer.pause(SyncPhases.PULL);
            timer.resume(SyncPhases.PULL);
            timer.end(SyncPhases.PULL);

            expect(timer.toTelemetry().pull).toEqual({
                startedAt: new Date(0).toISOString(),
                endedAt: new Date(66000).toISOString(),
                durationMs: 6000,
                pausedMs: 60000
            });
            expect(timer.toFirebaseParams()).toEqual({pull_duration_ms: 6000});
        });

        it("whilePaused() resumes even when the wait rejects", async () => {
            const timer = new SyncPhaseTimer(clockOf(0, 100, 5100, 6000));
            timer.start(SyncPhases.PULL);
            const declined = () => Promise.reject(new Error("declined"));
            await expect(timer.whilePaused(SyncPhases.PULL, declined)).rejects.toThrow("declined");
            timer.end(SyncPhases.PULL);

            expect(timer.toFirebaseParams()).toEqual({pull_duration_ms: 1000});
        });

        it("ending a paused phase closes the pause first", () => {
            const timer = new SyncPhaseTimer(clockOf(0, 1000, 4000, 4000));
            timer.start(SyncPhases.PULL);
            timer.pause(SyncPhases.PULL);
            timer.end(SyncPhases.PULL);

            expect(timer.toFirebaseParams()).toEqual({pull_duration_ms: 1000});
        });

        it("has no pausedMs when nothing was paused", () => {
            const timer = new SyncPhaseTimer(clockOf(0, 500));
            timer.start(SyncPhases.PUSH);
            timer.end(SyncPhases.PUSH);
            expect(timer.toTelemetry().push).not.toHaveProperty('pausedMs');
        });
    });

    it("measures durations on the monotonic clock, so a wall-clock correction mid-sync does not skew them", () => {
        // The phone's clock is set back an hour while the phase runs.
        const wall = clockOf(10 * 3600 * 1000, 9 * 3600 * 1000);
        const monotonic = clockOf(500, 4500);
        const timer = new SyncPhaseTimer(wall, monotonic);
        timer.start(SyncPhases.PUSH);
        timer.end(SyncPhases.PUSH);

        expect(timer.toFirebaseParams()).toEqual({push_duration_ms: 4000});
        expect(timer.toTelemetry().push.durationMs).toBe(4000);
    });
});
