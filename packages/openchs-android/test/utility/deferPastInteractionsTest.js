import {InteractionManager} from "react-native";
import deferPastInteractions from "../../src/utility/deferPastInteractions";

describe("deferPastInteractions", () => {
    let queued;
    let originalRAI;

    beforeEach(() => {
        jest.useFakeTimers();
        queued = [];
        originalRAI = InteractionManager.runAfterInteractions;
        InteractionManager.runAfterInteractions = jest.fn((cb) => {
            queued.push(cb);
            return {cancel: jest.fn(), then: jest.fn(), done: jest.fn()};
        });
    });

    afterEach(() => {
        InteractionManager.runAfterInteractions = originalRAI;
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    it("runs fn once when interactions settle and cancels the cap timer", () => {
        const fn = jest.fn();
        deferPastInteractions(fn, 1000);
        expect(fn).not.toHaveBeenCalled();

        queued[0]();
        expect(fn).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(0);      // cap cleared, not leaked

        jest.advanceTimersByTime(5000);            // cap would have fired
        expect(fn).toHaveBeenCalledTimes(1);       // still once
    });

    it("runs fn via the cap when interactions never settle", () => {
        const fn = jest.fn();
        deferPastInteractions(fn, 1000);

        jest.advanceTimersByTime(1000);            // cap fires
        expect(fn).toHaveBeenCalledTimes(1);

        queued[0]();                               // a late interaction resolve
        expect(fn).toHaveBeenCalledTimes(1);       // does not double-run
    });

    it("leaves no pending timer when runAfterInteractions runs synchronously", () => {
        InteractionManager.runAfterInteractions = jest.fn((cb) => {
            cb();
            return {cancel: jest.fn()};
        });
        const fn = jest.fn();
        deferPastInteractions(fn, 1000);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(jest.getTimerCount()).toBe(0);      // fallback armed-then-cleared, no leak
    });
});
