// Page that hosts Eka Care's ABHA web SDK inside a WebView (ABDM M1).
// The SDK is a React DOM bundle, so it runs in a WebView rather than as React Native code. When the page
// defines window.EkaAbha the SDK reports through it (onAbhaSuccess / onAbhaError / onAbhaClose); this page
// forwards every report to the app as {type, payload} through window.ReactNativeWebView.postMessage.
// @eka-care/abha-stg calls api.dev.eka.care and @eka-care/abha calls api.eka.care, each also with its aortago
// host for login (read from the 0.1.126 and 0.2.2 bundles), so the access token passed in must come from the
// same environment. Keyed by the environment Avni's server names in GET /abha/session.
// Integrity is the sha384 of each pinned file (unpkg, matching the npm tarball); a changed file is refused.

import General from "../../utility/General";

export const ABHA_SDK = {
    sandbox: {
        packageName: '@eka-care/abha-stg', version: '0.1.126',
        jsIntegrity: 'sha384-n1S7jl2kTIaghjdLMHaSXlL8AKV8e5yfUqT9Im9jz9wtq6AKwI38z7xpbzglQJd8',
        cssIntegrity: 'sha384-pZeaEDPhTg7gHwTvsdcCpQ9L0ATZi+I34DIz18DQpOfaYAtI5tYvGekJBr54d6jK',
        apiHosts: ['https://api.dev.eka.care', 'https://aortago.dev.eka.care'],
    },
    production: {
        packageName: '@eka-care/abha', version: '0.2.2',
        jsIntegrity: 'sha384-6sDOQKKgR7N+9QgE4LPQmcCT/FCs8pupzVLGsNKxLBIw4cLyPK+As7/P/BF239PC',
        cssIntegrity: 'sha384-pZeaEDPhTg7gHwTvsdcCpQ9L0ATZi+I34DIz18DQpOfaYAtI5tYvGekJBr54d6jK',
        apiHosts: ['https://api.eka.care', 'https://aortago.eka.care'],
    },
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

// Scripts run only if they are this page's own, carrying this render's nonce, or the pinned SDK file. The SDK
// injects Eka's health chatbot from @latest on a tap; that load is refused. Styles stay 'unsafe-inline' because
// the SDK's React code injects style tags.
const contentSecurityPolicy = (sdk, nonce) => [
    `script-src 'nonce-${nonce}' ${sdkUrl(sdk, 'js/abha.js')}`,
    `style-src 'unsafe-inline' ${sdkUrl(sdk, 'css/abha.css')}`,
    `connect-src ${sdk.apiHosts.join(' ')}`,
    'img-src data: https:',
    "frame-src 'none'",
].join('; ');

// A skip is forwarded without its payload: Eka passes the identifier typed so far, which can be an Aadhaar number.
// A pinned file that does not load, or fails its integrity check, is reported by element id: an inline onerror
// attribute would be refused by the policy, and the refused chatbot script must not read as the SDK failing.
export function buildAbhaHostHtml({environment, method, initData}) {
    const sdk = resolveAbhaSdk(environment);
    const nonce = General.randomUUID().replace(/-/g, '');
    const {SUCCESS, ERROR, SKIP, CLOSE} = ABHA_MESSAGE;
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy(sdk, nonce)}">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<script nonce="${nonce}">
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
  window.addEventListener('error', function (event) {
    var id = event.target && event.target.id;
    if (id === 'abha-sdk-js' || id === 'abha-sdk-css') post('${ERROR}', JSON.stringify({error: 'ABHA SDK did not load'}));
  }, true);
</script>
<link rel="stylesheet" id="abha-sdk-css" href="${sdkUrl(sdk, 'css/abha.css')}" integrity="${sdk.cssIntegrity}" crossorigin="anonymous">
<style>html, body, #abha {margin: 0; min-height: 100%;}</style>
</head>
<body>
<div id="abha"></div>
<script type="module" id="abha-sdk-js" src="${sdkUrl(sdk, 'js/abha.js')}" integrity="${sdk.jsIntegrity}" crossorigin="anonymous"></script>
<script type="module" nonce="${nonce}">
  if (typeof window.initAbhaApp === 'function') window.initAbhaApp({
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
