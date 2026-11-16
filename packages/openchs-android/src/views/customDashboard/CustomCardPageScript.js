// The script a Custom Design Card's page is given before it loads. It defines `window.avni`, whose commands post a
// message to the app through the WebView bridge. A command posts only from something the user did on the page: a tap,
// a pick in a dropdown, or up to TAP_GRACE_MS after either. A page that runs a command on its own does nothing.

// Long enough for a page to animate or wait a moment after a tap before its command; short enough that a page's own
// timer cannot borrow a tap from long before.
export const TAP_GRACE_MS = 1500;
import {RECORD_PAGE_COMMAND_DEFINITIONS} from './RecordCommandPageDefinitions';

// One source line per command, such as
//   avni.openSubject = function (subjectUUID, tab) { send('openSubject', {subjectUUID: subjectUUID, tab: tab}); };
// Each module that adds commands to the app side (COMMANDS in CustomCardCommandService) adds its lines here, directly in
// this array literal or spread from an import. Never push at runtime: each card page builds its script from this list
// when the page is created, so a later push would reach only the pages created after it.
export const PAGE_COMMAND_DEFINITIONS = [
    "avni.runCardAction = function (args) { send('runCardAction', args); };",
    ...RECORD_PAGE_COMMAND_DEFINITIONS,
];

// token is the card page's own random value. Every command carries it and the card page takes no message without it,
// so a frame inside the page, or the page posting to the bridge itself, cannot send a command. It lives only in this
// script's closure.
// screenReader: TalkBack, switch access and a keyboard click the focused control with no finger on the page, so with a
// screen reader on, such a click counts as a tap. A drag still does not.
export function buildCustomCardPageScript(definitions, token, screenReader = false) {
    return [
        "(function () {",
        // In the page's html, so it takes itself out before any later script, library or frame can read the token.
        "  var self = document.currentScript;",
        "  if (self && self.parentNode) self.parentNode.removeChild(self);",
        // The card page puts this script first in the page. A page that defines its own avni anyway keeps it, and
        // gets no commands.
        "  if (typeof window.avni !== 'undefined') {",
        "    console.warn('avni: the page already defines avni, so page commands are off on this page');",
        "    return;",
        "  }",
        `  var token = ${JSON.stringify(token)};`,
        // Taken now, before the page's own scripts run, so a page that swaps them later never sees the token. The
        // WebView adds its bridge before any script runs; without one, commands do nothing on this page.
        "  var stringify = JSON.stringify;",
        "  var bare = Object.create;",
        "  var bridge = window.ReactNativeWebView;",
        "  var post = bridge && typeof bridge.postMessage === 'function' ? bridge.postMessage.bind(bridge) : null;",
        // A tap is a finger that went down in this page, moved under 10 px, did not scroll the page, and lifted within
        // 800 ms. A command runs while its touchend, pointerup or click handlers run, or while those of a pick in a
        // dropdown run, and for TAP_GRACE_MS after either. A swipe that starts on a row, and a click the WebView makes
        // for a finger that went down on the page before a swap, open no window. Only events the browser marks as the
        // user's count; one that does not say counts, so an older WebView loses no taps.
        `  var screenReader = ${screenReader ? 'true' : 'false'};`,
        `  var grace = ${TAP_GRACE_MS};`,
        "  var later = setTimeout;",
        "  var now = Date.now;",
        "  var gesture = null;",
        "  var tapReason = null;",
        "  var inTap = false;",
        "  var actedAt = null;",
        "  function byUser(e) { return !e || e.isTrusted !== false; }",
        "  function pointOf(e) {",
        "    var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;",
        "    return {x: t.clientX || 0, y: t.clientY || 0};",
        "  }",
        "  function down(e) { if (!byUser(e)) return; var p = pointOf(e); gesture = {x: p.x, y: p.y, at: now(), moved: false, endedAt: null}; }",
        "  function move(e) {",
        "    if (!gesture || !byUser(e)) return;",
        "    var p = pointOf(e);",
        "    if (Math.abs(p.x - gesture.x) > 10 || Math.abs(p.y - gesture.y) > 10) gesture.moved = true;",
        "  }",
        "  function scrolled(e) { if (gesture && byUser(e)) gesture.moved = true; }",
        "  function up(e) {",
        "    if (!byUser(e)) return;",
        "    if (gesture && e.type !== 'click' && gesture.endedAt === null) gesture.endedAt = now();",
        "    var noFinger = !gesture || (gesture.endedAt !== null && now() - gesture.endedAt > 300);",
        "    var assisted = screenReader && e.type === 'click' && (e.detail === 0 || noFinger);",
        "    tapReason = assisted ? null",
        "      : !gesture ? 'the page has not been touched yet'",
        "      : gesture.moved ? 'the touch was a drag or a scroll'",
        "      : now() - gesture.at > 800 ? 'the touch was a long press' : null;",
        "    actedAt = tapReason ? null : now();",
        "    inTap = true;",
        "    later(function () { inTap = false; }, 0);",
        "  }",
        // A dropdown's pick comes from Android's own picker, after the tap that opened it.
        "  function picked(e) {",
        "    if (!byUser(e)) return;",
        "    tapReason = null;",
        "    actedAt = now();",
        "    inTap = true;",
        "    later(function () { inTap = false; }, 0);",
        "  }",
        "  document.addEventListener('touchstart', down, true);",
        "  document.addEventListener('pointerdown', down, true);",
        "  document.addEventListener('touchmove', move, true);",
        "  document.addEventListener('pointermove', move, true);",
        "  document.addEventListener('scroll', scrolled, true);",
        "  document.addEventListener('touchend', up, true);",
        "  document.addEventListener('pointerup', up, true);",
        "  document.addEventListener('click', up, true);",
        "  document.addEventListener('change', picked, true);",
        "  function send(name, args) {",
        "    var reason = inTap ? tapReason",
        "      : actedAt !== null && now() - actedAt <= grace ? null",
        "      : gesture ? 'it did not run during or just after a tap' : 'the page has not been touched yet';",
        "    if (!reason && !post) reason = 'the app bridge is missing';",
        "    if (reason) {",
        "      console.warn('avni: ' + name + ' dropped, ' + reason);",
        // The app logs it too, as a WebView keeps the page's console to itself.
        "      if (post) { var report = bare(null); report.avniDropped = name; report.reason = reason; report.token = token; post(stringify(report)); }",
        "      return;",
        "    }",
        // No prototype, so a page's Object.prototype.toJSON is not handed the message.
        "    var message = bare(null);",
        "    message.avniCommand = name;",
        "    message.args = args;",
        "    message.token = token;",
        "    post(stringify(message));",
        "  }",
        "  var avni = window.avni = {};",
        ...definitions.map((line) => "  " + line),
        "})();",
        "true;",
    ].join("\n");
}
