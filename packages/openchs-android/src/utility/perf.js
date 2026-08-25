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
    // Follows the app's log level, so a release build pays nothing — not even the two Date.now() calls.
    static _enabled() {
        return General.canLog(General.LogLevel.Debug);
    }

    static mark(tag, fields) {
        if (!Perf._enabled()) return;
        General.logDebug("PERF", `PERF| tag=${tag}${Perf._fmt(fields)}`);
    }

    // Wraps a synchronous call and reports how long it blocked.
    static time(tag, fn, fields) {
        if (!Perf._enabled()) return fn();
        const start = Date.now();
        try {
            return fn();
        } finally {
            General.logDebug("PERF", `PERF| tag=${tag} ms=${Date.now() - start}${Perf._fmt(fields)}`);
        }
    }

    static _fmt(fields) {
        if (!fields) return "";
        return Object.keys(fields)
            .map(k => ` ${k}=${String(fields[k]).replace(/\s+/g, "_")}`)
            .join("");
    }
}
