// The script a Custom Design Card's page is given before it loads. It defines `window.avni`, whose commands post a
// message to the app through the WebView bridge. A command posts only once the user has touched or clicked the
// page, so a page that runs a command on its own, without the user, does nothing.
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
export function buildCustomCardPageScript(definitions, token) {
    return [
        "(function () {",
        // On Android this script can run after the page's own scripts. A page that defines its own avni keeps it, and
        // gets no commands.
        "  if (typeof window.avni !== 'undefined') {",
        "    console.warn('avni: the page already defines avni, so page commands are off on this page');",
        "    return;",
        "  }",
        `  var token = ${JSON.stringify(token)};`,
        "  var touched = false;",
        "  function markTouched() { touched = true; }",
        "  document.addEventListener('touchstart', markTouched, true);",
        "  document.addEventListener('click', markTouched, true);",
        "  function send(name, args) {",
        "    if (!touched) {",
        "      console.warn('avni: ' + name + ' ignored, the page has not been touched yet');",
        "      return;",
        "    }",
        "    window.ReactNativeWebView.postMessage(JSON.stringify({avniCommand: name, args: args, token: token}));",
        "  }",
        "  var avni = window.avni = {};",
        ...definitions.map((line) => "  " + line),
        "})();",
        "true;",
    ].join("\n");
}
