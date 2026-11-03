// The script a Custom Design Card's page is given before it loads. It defines `window.avni`, whose commands post a
// message to the app through the WebView bridge. A command posts only once the user has touched or clicked the
// page, so a page that runs a command on its own, without the user, does nothing.

// One source line per command, such as
//   avni.openSubject = function (subjectUUID, tab) { send('openSubject', {subjectUUID: subjectUUID, tab: tab}); };
// Each module that adds commands to the app side (COMMANDS in CustomCardCommandService) adds its lines here, directly in
// this array literal or spread from an import. Never push at runtime: the script is built when this module loads, so a
// later push would come too late.
export const PAGE_COMMAND_DEFINITIONS = [
    "avni.runCardAction = function (args) { send('runCardAction', args); };",
];

export function buildCustomCardPageScript(definitions) {
    return [
        "(function () {",
        "  var touched = false;",
        "  function markTouched() { touched = true; }",
        "  document.addEventListener('touchstart', markTouched, true);",
        "  document.addEventListener('click', markTouched, true);",
        "  function send(name, args) {",
        "    if (!touched) {",
        "      console.warn('avni: ' + name + ' ignored, the page has not been touched yet');",
        "      return;",
        "    }",
        "    window.ReactNativeWebView.postMessage(JSON.stringify({avniCommand: name, args: args}));",
        "  }",
        "  var avni = window.avni = {};",
        ...definitions.map((line) => "  " + line),
        "})();",
        "true;",
    ].join("\n");
}

export const CUSTOM_CARD_PAGE_SCRIPT = buildCustomCardPageScript(PAGE_COMMAND_DEFINITIONS);
