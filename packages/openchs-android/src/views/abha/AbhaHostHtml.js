// Page that hosts Eka Care's ABHA web SDK inside a WebView (ABDM M1).
// The SDK is a React DOM bundle, so it runs in a WebView rather than as React Native code. When the page
// defines window.EkaAbha the SDK reports through it (onAbhaSuccess / onAbhaError / onAbhaClose); this page
// forwards every report to the app as {type, payload} through window.ReactNativeWebView.postMessage.
// @eka-care/abha-stg calls api.dev.eka.care and @eka-care/abha calls api.eka.care (read from the 0.1.126
// and 0.2.2 bundles), so the access token passed in must come from the same environment. Keyed by the
// environment Avni's server names in GET /abha/session.

export const ABHA_SDK = {
    sandbox: {packageName: '@eka-care/abha-stg', version: '0.1.126'},
    production: {packageName: '@eka-care/abha', version: '0.2.2'},
};

export const ABHA_MESSAGE = {SUCCESS: 'success', ERROR: 'error', SKIP: 'skip', CLOSE: 'close'};

const sdkUrl = (sdk, path) => `https://unpkg.com/${sdk.packageName}@${sdk.version}/dist/sdk/abha/${path}`;

// JSON is valid JS, but a value containing "</script>" or U+2028/U+2029 could still break out of the tag.
export const toScriptLiteral = (value) => JSON.stringify(value === undefined ? null : value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

// A sandbox key must never reach the live screens, or the reverse, so an unknown environment is an error.
export const resolveAbhaSdk = (environment) => {
    if (!Object.prototype.hasOwnProperty.call(ABHA_SDK, environment)) throw new Error(`Unknown ABHA environment: ${environment}`);
    return ABHA_SDK[environment];
};

// A skip is forwarded without its payload: Eka passes the identifier typed so far, which can be an Aadhaar number.
export function buildAbhaHostHtml({environment, method, initData}) {
    const sdk = resolveAbhaSdk(environment);
    const {SUCCESS, ERROR, SKIP, CLOSE} = ABHA_MESSAGE;
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="${sdkUrl(sdk, 'css/abha.css')}">
<style>html, body, #abha {margin: 0; min-height: 100%;}</style>
</head>
<body>
<div id="abha"></div>
<script>
  var post = function (type, payload) {
    window.ReactNativeWebView.postMessage(JSON.stringify({type: type, payload: payload === undefined ? null : payload}));
  };
  var asJson = function (value) {
    return typeof value === 'string' ? value : JSON.stringify(value === undefined ? null : value);
  };
  window.EkaAbha = {
    onAbhaSuccess: function (p) { post('${SUCCESS}', asJson(p)); },
    onAbhaError: function (p) { post('${ERROR}', asJson(p)); },
    onAbhaFailure: function (p) { post('${ERROR}', asJson(p)); },
    onAbhaClose: function () { post('${CLOSE}'); },
    changeStatusBarColor: function () {}
  };
  window.onerror = function (message) { post('${ERROR}', JSON.stringify({error: String(message)})); };
</script>
<script type="module" src="${sdkUrl(sdk, 'js/abha.js')}"
        onerror="post('${ERROR}', JSON.stringify({error: 'ABHA SDK did not load'}))"></script>
<script type="module">
  window.initAbhaApp({
    containerId: 'abha',
    clientId: 'ext',
    method: ${toScriptLiteral(method)},
    data: ${toScriptLiteral(initData)},
    onSuccess: function (p) { post('${SUCCESS}', asJson(p)); },
    onError: function (p) { post('${ERROR}', asJson(p)); },
    onSkipAbha: function () { post('${SKIP}'); },
    onAbhaClose: function () { post('${CLOSE}'); }
  });
</script>
</body>
</html>`;
}
