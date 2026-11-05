// Page that hosts Eka Care's ABHA web SDK inside a WebView (ABDM M1).
// The SDK is a React DOM bundle, so it runs in a WebView rather than as React Native code. When the page
// defines window.EkaAbha the SDK reports through it (onAbhaSuccess / onAbhaError / onAbhaClose); this page
// forwards every report to the app as {type, payload} through window.ReactNativeWebView.postMessage.
// @eka-care/abha-stg calls api.dev.eka.care and @eka-care/abha calls api.eka.care, each also with its aortago
// host for login (read from the 0.1.126 and 0.2.2 bundles), so the access token passed in must come from the
// same environment. Keyed by the environment Avni's server names in GET /abha/session.
// Integrity is the sha384 of each pinned file (unpkg, matching the npm tarball); a changed file is refused.

import _ from "lodash";
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

// Eka's theme option leaves the brand colour off disabled elements, bottom borders, the 20% tint and focus rings (it
// writes ring-color, which is not a CSS property). These are every rule in Eka's CSS that carries its purple.
const BRAND_RULES = [
    ['.pds2-bg-primary-brand', 'background-color', ''],
    ['.pds2-text-primary-brand', 'color', ''],
    ['.pds2-border-primary-brand', 'border-color', ''],
    ['.pds2-border-b-primary-brand', 'border-bottom-color', ''],
    ['.pds2-accent-primary-brand', 'accent-color', ''],
    ['.pds2-ring-primary-brand', '--tw-ring-color', ''],
    ['.focus-within\\:pds2-ring-primary-brand:focus-within', '--tw-ring-color', ''],
    ['.focus-within\\:pds2-border-primary-brand:focus-within', 'border-color', ''],
    ['.hover\\:pds2-text-primary-brand:hover', 'color', ''],
    ['.pds2-group:hover .group-hover\\:pds2-border-primary-brand', 'border-color', ''],
    ['.pds2-group:hover .group-hover\\:pds2-text-primary-brand', 'color', ''],
    ['.pds2-bg-primary-brand\\/20', 'background-color', '33'],
    ['.hover\\:pds2-bg-primary-brand\\/20:hover', 'background-color', '33'],
    ['.active\\:pds2-bg-primary-brand\\/20:active', 'background-color', '33'],
];

// The build's look, on top of Eka's CSS. AbhaBranding has already checked every value written here.
const brandingStyle = (branding) => {
    if (!branding) return '';
    const {brandColour, fontFamily, imageTopCrops, logoUrl, logoInPlaceOfAbdm} = branding;
    const rules = [];
    if (brandColour) BRAND_RULES.forEach(([selector, property, alpha]) => rules.push(`#abha ${selector} {${property}: ${brandColour}${alpha} !important;}`));
    if (fontFamily) rules.push(`#abha, #abha * {font-family: ${fontFamily} !important;}`);
    // Eka shows the organisation's logo beside the ABDM one without the white tile the ABDM logo sits on.
    if (logoUrl) rules.push('#abha img[alt="org-icon"] {background-color: #FFFFFF; object-fit: contain; padding: 6px;}');
    // Only the ABDM logo that has the organisation's logo next to it goes; the ABDM marks on later steps and the card
    // stay. A WebView too old for :has shows both logos.
    if (logoUrl && logoInPlaceOfAbdm) rules.push('#abha img[alt="abdm-icon"]:has(+ img[alt="org-icon"]) {display: none !important;}');
    _.forEach(imageTopCrops, (percent, srcPart) => rules.push(
        `#abha img[src*="${srcPart}"] {aspect-ratio: 100 / ${100 - percent}; object-fit: cover; object-position: center bottom;}`));
    return _.isEmpty(rules) ? '' : `<style id="abha-branding">\n${rules.join('\n')}\n</style>\n`;
};

// Rewrites Eka's wording in the screens as React draws and redraws them. Text in a textarea, script or style is left
// alone, so nothing typed is changed.
const wordingScript = (branding, nonce) => {
    const replacements = _.get(branding, 'textReplacements');
    if (_.isEmpty(replacements)) return '';
    return `<script nonce="${nonce}">
  (function (replacements) {
    if (typeof document === 'undefined' || typeof MutationObserver !== 'function') return;
    var root = document.getElementById('abha');
    if (!root) return;
    var rules = [];
    replacements.forEach(function (r) { try { rules.push([new RegExp(r.find, 'g'), r.replace]); } catch (e) {} });
    var skip = {SCRIPT: true, STYLE: true, TEXTAREA: true};
    var rewrite = function (node) {
      if (node.nodeType === 3) {
        if (node.parentNode && skip[node.parentNode.nodeName]) return;
        var text = node.nodeValue, next = text;
        rules.forEach(function (rule) { next = next.replace(rule[0], function () { return rule[1]; }); });
        if (next !== text) node.nodeValue = next;
      } else if (node.nodeType === 1 && !skip[node.nodeName]) {
        for (var child = node.firstChild; child; child = child.nextSibling) rewrite(child);
      }
    };
    rewrite(root);
    new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.type === 'characterData') rewrite(m.target);
        else for (var i = 0; i < m.addedNodes.length; i++) rewrite(m.addedNodes[i]);
      });
    }).observe(root, {childList: true, subtree: true, characterData: true});
  })(${toScriptLiteral(replacements)});
</script>
`;
};

// The build's logo goes beside the ABDM logo, and in place of Eka's picture on the screen that links an ABHA.
const dataWithLogo = (initData, branding) => {
    const logoUrl = _.get(branding, 'logoUrl');
    return logoUrl ? {...initData, orgIconUrl: logoUrl, linkToOrgIcon: logoUrl} : initData;
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
// attribute would be refused by the policy, and the refused chatbot script must not read as the SDK failing. The
// page's own errors carry a fixed code and never a message, which could quote what the worker typed.
// branding is AbhaBranding's answer: null leaves Eka's screens as Eka ships them.
export function buildAbhaHostHtml({environment, method, initData, branding = null}) {
    const sdk = resolveAbhaSdk(environment);
    const nonce = General.randomUUID().replace(/-/g, '');
    const {SUCCESS, ERROR, SKIP, CLOSE} = ABHA_MESSAGE;
    const theme = _.get(branding, 'theme');
    const themeOption = _.isEmpty(theme) ? '' : `\n    theme: ${toScriptLiteral(theme)},`;
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
  window.onerror = function () { post('${ERROR}', JSON.stringify({error: {code: 'ABHA_PAGE_SCRIPT_ERROR'}})); };
  window.addEventListener('error', function (event) {
    var id = event.target && event.target.id;
    if (id === 'abha-sdk-js' || id === 'abha-sdk-css') post('${ERROR}', JSON.stringify({error: {code: 'ABHA_SDK_NOT_LOADED'}}));
  }, true);
</script>
<link rel="stylesheet" id="abha-sdk-css" href="${sdkUrl(sdk, 'css/abha.css')}" integrity="${sdk.cssIntegrity}" crossorigin="anonymous">
<style>html, body, #abha {margin: 0; min-height: 100%;}</style>
${brandingStyle(branding)}</head>
<body>
<div id="abha"></div>
${wordingScript(branding, nonce)}<script type="module" id="abha-sdk-js" src="${sdkUrl(sdk, 'js/abha.js')}" integrity="${sdk.jsIntegrity}" crossorigin="anonymous"></script>
<script type="module" nonce="${nonce}">
  if (typeof window.initAbhaApp === 'function') window.initAbhaApp({
    containerId: 'abha',
    clientId: 'ext',
    method: ${toScriptLiteral(method)},${themeOption}
    data: ${toScriptLiteral(dataWithLogo(initData, branding))},
    onSuccess: function (p) { post('${SUCCESS}', asJson(p)); },
    onError: function (p) { post('${ERROR}', asJson(p)); },
    onSkipAbha: function () { post('${SKIP}'); },
    onAbhaClose: function () { post('${CLOSE}'); }
  });
</script>
</body>
</html>`;
}
