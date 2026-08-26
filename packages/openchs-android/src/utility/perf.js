import _ from "lodash";
import General from "./General";

// Temporary instrumentation for avni-client#2054 (screen-transition freeze, JSCS FD#7647).
//
// Emits one greppable line per measurement so a before/after run can be diffed mechanically:
//   PERF| tag=<what> ms=<duration> <key=value ...>
//
// Debug-level only, so it costs nothing in a release build. Kept deliberately dumb — no aggregation,
// no timers held across frames — because the thing being measured is a JS-thread stall and anything
// clever here would show up in the numbers.
export default class Perf {
    // No log level exists until SettingsService.init(), and canLog() compares against undefined, so a
    // startup measurement emitted there is dropped without a trace. Held instead, bounded in case none appears.
    static _held = [];
    static _HOLD_LIMIT = 20;

    // Follows the app's log level. Debug is only set when EnvironmentConfig.isDevMode() (see
    // SettingsService), so a release build pays nothing here — no Date.now(), no logging.
    static _enabled() {
        return General.canLog(General.LogLevel.Debug);
    }

    static _levelSet() {
        return !_.isNil(General.getCurrentLogLevel());
    }

    static _record(line) {
        if (!Perf._levelSet()) {
            if (Perf._held.length < Perf._HOLD_LIMIT) Perf._held.push({line, atMs: Date.now()});
            return;
        }
        Perf._release();
        General.logDebug("PERF", line);
    }

    // Held lines are emitted out of their measurement order, hence takenAtMs.
    static _release() {
        if (Perf._held.length === 0) return;
        const held = Perf._held;
        Perf._held = [];
        if (!Perf._enabled()) return;
        held.forEach(h => General.logDebug("PERF", `${h.line} takenAtMs=${h.atMs}`));
    }

    /**
     * `fields` may be an object OR a function returning one. Pass a FUNCTION anywhere the fields cost
     * something to build or the call site is hot — an object literal is constructed by the caller before
     * this method is entered, so the log-level gate cannot save you from it. refreshState fired 410 times
     * in a single 3-minute session, and RuleService's fields read a Realm collection's length.
     */
    static mark(tag, fields) {
        if (Perf._levelSet() && !Perf._enabled()) return Perf._release();
        Perf._record(`PERF| tag=${tag}${Perf._fmt(fields)}`);
    }

    // Wraps a synchronous call and reports how long it blocked.
    static time(tag, fn, fields) {
        if (Perf._levelSet() && !Perf._enabled()) {
            Perf._release();
            return fn();
        }
        const start = Date.now();
        try {
            return fn();
        } finally {
            Perf._record(`PERF| tag=${tag} ms=${Date.now() - start}${Perf._fmt(fields)}`);
        }
    }

    static _fmt(fields) {
        if (!fields) return "";
        if (_.isFunction(fields)) fields = fields();
        if (!fields) return "";
        return Object.keys(fields)
            .map(k => ` ${k}=${String(fields[k]).replace(/\s+/g, "_")}`)
            .join("");
    }
}
