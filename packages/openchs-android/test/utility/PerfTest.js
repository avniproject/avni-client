import Perf from "../../src/utility/perf";
import General from "../../src/utility/General";

describe("Perf", () => {
    let logged;
    let originalLevel;

    beforeEach(() => {
        originalLevel = General.getCurrentLogLevel();
        Perf._held = [];
        logged = [];
        jest.spyOn(General, "logDebug").mockImplementation((source, message) => logged.push(message));
    });

    afterEach(() => {
        General.setCurrentLogLevel(originalLevel);
        General.logDebug.mockRestore();
    });

    it("emits at debug level", () => {
        General.setCurrentLogLevel(General.LogLevel.Debug);

        Perf.mark("startup.realmOpen", {ms: 1234});

        expect(logged).toEqual(["PERF| tag=startup.realmOpen ms=1234"]);
    });

    it("stays silent at the release log level", () => {
        General.setCurrentLogLevel(General.LogLevel.Error);

        Perf.mark("startup.realmOpen", {ms: 1234});
        Perf.time("work", () => 1, {rows: 5});

        expect(logged).toEqual([]);
    });

    // The startup case: realm open is measured before SettingsService has set any level. Emitting
    // there logged nothing at all, which is why #2084 had no realm-open number.
    it("holds a mark taken before any level is set, and emits it once one appears", () => {
        General.setCurrentLogLevel(undefined);
        Perf.mark("startup.realmOpen", {ms: 1234});
        expect(logged).toEqual([]);

        General.setCurrentLogLevel(General.LogLevel.Debug);
        Perf.mark("sceneTrigger.armed", {view: "Landing"});

        expect(logged).toEqual([
            expect.stringMatching(/^PERF\| tag=startup\.realmOpen ms=1234 takenAtMs=\d+$/),
            "PERF| tag=sceneTrigger.armed view=Landing",
        ]);
    });

    it("holds a timed call taken before any level is set", () => {
        General.setCurrentLogLevel(undefined);
        expect(Perf.time("startup.beanRegistryInit", () => "value")).toEqual("value");

        General.setCurrentLogLevel(General.LogLevel.Debug);
        Perf.mark("later");

        expect(logged[0]).toMatch(/^PERF\| tag=startup\.beanRegistryInit ms=\d+ takenAtMs=\d+$/);
    });

    it("discards held marks when the level turns out not to allow debug", () => {
        General.setCurrentLogLevel(undefined);
        Perf.mark("startup.realmOpen", {ms: 1234});

        General.setCurrentLogLevel(General.LogLevel.Error);
        Perf.mark("later");

        expect(logged).toEqual([]);
        expect(Perf._held).toEqual([]);
    });

    it("does not grow without bound when a level never appears", () => {
        General.setCurrentLogLevel(undefined);

        for (let i = 0; i < Perf._HOLD_LIMIT + 10; i++) Perf.mark(`m${i}`);

        expect(Perf._held.length).toEqual(Perf._HOLD_LIMIT);
    });

    // Fields passed as a function are why hot call sites cost nothing in a release build: an object
    // literal is built by the caller before the gate is reached, a thunk is not.
    it("does not build lazy fields when disabled", () => {
        General.setCurrentLogLevel(General.LogLevel.Error);
        const fields = jest.fn(() => ({rows: 5}));

        Perf.mark("hot", fields);

        expect(fields).not.toHaveBeenCalled();
    });

    it("still returns the wrapped value when disabled", () => {
        General.setCurrentLogLevel(General.LogLevel.Error);

        expect(Perf.time("work", () => "result")).toEqual("result");
    });
});
