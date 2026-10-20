import {expect} from "chai";
import vm from "vm";
import _ from "lodash";
import {ABHA_MESSAGE, buildAbhaHostHtml, resolveAbhaSdk, toScriptLiteral} from "../../../src/views/abha/AbhaHostHtml";

// Runs the page's own inline scripts against a stand-in window, with initAbhaApp captured instead of Eka's SDK.
function runPage(html, {sdkLoaded = true} = {}) {
    const posted = [];
    const listeners = [];
    const window = {
        ReactNativeWebView: {postMessage: (message) => posted.push(JSON.parse(message))},
        addEventListener: (type, listener, capture) => listeners.push({type, listener, capture}),
    };
    let initOptions = null;
    if (sdkLoaded) window.initAbhaApp = (options) => initOptions = options;
    window.window = window;
    const context = vm.createContext(window);
    [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].forEach(([, body]) => vm.runInContext(body, context));
    const dispatchCapturedError = (target) => listeners
        .filter(({type, capture}) => type === 'error' && capture === true)
        .forEach(({listener}) => listener({target}));
    return {window, posted, initOptions: () => initOptions, dispatchCapturedError};
}

const tag = (html, name, urlAttribute, url) => html.match(new RegExp(`<${name}[^>]*${urlAttribute}="${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`))[0];
const attribute = (tagText, name) => (tagText.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];
const policyOf = (html) => {
    const content = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/)[1];
    return _.fromPairs(content.split(';').map(d => d.trim().split(/\s+/)).map(([name, ...sources]) => [name, sources]));
};
const nonceOf = (html) => policyOf(html)['script-src'].find(source => source.startsWith("'nonce-")).slice(7, -1);

// sha384 of the pinned files, from unpkg and checked against the npm tarballs on 20 Oct 2026:
// curl -s https://unpkg.com/<pkg>@<ver>/dist/sdk/abha/js/abha.js | openssl dgst -sha384 -binary | openssl base64 -A
const PINNED = {
    sandbox: {
        js: ["https://unpkg.com/@eka-care/abha-stg@0.1.126/dist/sdk/abha/js/abha.js", "sha384-n1S7jl2kTIaghjdLMHaSXlL8AKV8e5yfUqT9Im9jz9wtq6AKwI38z7xpbzglQJd8"],
        css: ["https://unpkg.com/@eka-care/abha-stg@0.1.126/dist/sdk/abha/css/abha.css", "sha384-pZeaEDPhTg7gHwTvsdcCpQ9L0ATZi+I34DIz18DQpOfaYAtI5tYvGekJBr54d6jK"],
        apiHosts: ["https://api.dev.eka.care", "https://aortago.dev.eka.care"],
    },
    production: {
        js: ["https://unpkg.com/@eka-care/abha@0.2.2/dist/sdk/abha/js/abha.js", "sha384-6sDOQKKgR7N+9QgE4LPQmcCT/FCs8pupzVLGsNKxLBIw4cLyPK+As7/P/BF239PC"],
        css: ["https://unpkg.com/@eka-care/abha@0.2.2/dist/sdk/abha/css/abha.css", "sha384-pZeaEDPhTg7gHwTvsdcCpQ9L0ATZi+I34DIz18DQpOfaYAtI5tYvGekJBr54d6jK"],
        apiHosts: ["https://api.eka.care", "https://aortago.eka.care"],
    },
};
const CHATBOT_SCRIPT = "https://unpkg.com/@eka-care/medassist-widget-embed@latest/dist/index.js";

describe('AbhaHostHtmlTest', () => {
    it('sandboxMapsToStagingPackage, and production to the production package', () => {
        expect(resolveAbhaSdk("sandbox").packageName).to.equal("@eka-care/abha-stg");
        expect(resolveAbhaSdk("production").packageName).to.equal("@eka-care/abha");

        const sandboxHtml = buildAbhaHostHtml({environment: "sandbox", initData: {}});
        expect(sandboxHtml).to.contain("https://unpkg.com/@eka-care/abha-stg@0.1.126/dist/sdk/abha/js/abha.js");
        expect(sandboxHtml).to.contain("https://unpkg.com/@eka-care/abha-stg@0.1.126/dist/sdk/abha/css/abha.css");
        expect(buildAbhaHostHtml({environment: "production", initData: {}}))
            .to.contain("https://unpkg.com/@eka-care/abha@0.2.2/dist/sdk/abha/js/abha.js");
    });

    it('unknownEnvironmentThrows rather than falling back to either package', () => {
        [undefined, null, "", "staging", "Production", "constructor", "__proto__"].forEach(environment => {
            expect(() => resolveAbhaSdk(environment), String(environment)).to.throw();
            expect(() => buildAbhaHostHtml({environment, initData: {}}), String(environment)).to.throw();
        });
    });

    it('defines the native bridge before the SDK loads', () => {
        const html = buildAbhaHostHtml({environment: "sandbox", initData: {}});
        const bridgeAt = html.indexOf("window.EkaAbha = {");
        expect(bridgeAt).to.be.greaterThan(-1);
        expect(bridgeAt).to.be.lessThan(html.indexOf('<script type="module" id="abha-sdk-js"'));
        expect(bridgeAt).to.be.lessThan(html.indexOf('<link rel="stylesheet" id="abha-sdk-css"'));
        ["onAbhaSuccess", "onAbhaError", "onAbhaFailure", "onAbhaClose", "changeStatusBarColor"]
            .forEach(fn => expect(html).to.contain(`${fn}: function`));
        expect(html).to.contain("window.ReactNativeWebView.postMessage");
    });

    it('passes the init data and method to initAbhaApp', () => {
        const page = runPage(buildAbhaHostHtml({environment: "sandbox", method: "login_or_create_abha",
            initData: {accessToken: "tok-123", hipId: "hip-1", skipABHAEnable: true}}));
        expect(page.initOptions()).to.include({containerId: "abha", clientId: "ext", method: "login_or_create_abha"});
        expect(page.initOptions().data).to.deep.equal({accessToken: "tok-123", hipId: "hip-1", skipABHAEnable: true});
        expect(runPage(buildAbhaHostHtml({environment: "sandbox", initData: {}})).initOptions().method).to.equal(null);
    });

    it('forwards a success, an error and a close to the app', () => {
        const page = runPage(buildAbhaHostHtml({environment: "sandbox", initData: {}}));
        page.window.EkaAbha.onAbhaSuccess('{"response":{}}');
        page.initOptions().onError({error: "bad"});
        page.window.EkaAbha.onAbhaClose();
        expect(page.posted).to.deep.equal([
            {type: ABHA_MESSAGE.SUCCESS, payload: '{"response":{}}'},
            {type: ABHA_MESSAGE.ERROR, payload: '{"error":"bad"}'},
            {type: ABHA_MESSAGE.CLOSE, payload: null},
        ]);
    });

    it('skipDoesNotForwardTheIdentifier Eka passes, which can be an Aadhaar number', () => {
        const page = runPage(buildAbhaHostHtml({environment: "sandbox", initData: {}}));
        page.initOptions().onSkipAbha({identifier: "999988887777", identifier_type: "aadhaar_number"});
        expect(page.posted).to.deep.equal([{type: ABHA_MESSAGE.SKIP, payload: null}]);
    });

    _.forEach(PINNED, ({js: [jsUrl, jsHash], css: [cssUrl, cssHash]}, environment) => {
        it(`includesIntegrityOnScriptAndStylesheet for ${environment}`, () => {
            const html = buildAbhaHostHtml({environment, initData: {}});
            const script = tag(html, 'script', 'src', jsUrl);
            const stylesheet = tag(html, 'link', 'href', cssUrl);
            expect(attribute(script, 'integrity')).to.equal(jsHash);
            expect(attribute(script, 'crossorigin')).to.equal('anonymous');
            expect(attribute(stylesheet, 'integrity')).to.equal(cssHash);
            expect(attribute(stylesheet, 'crossorigin')).to.equal('anonymous');
        });
    });

    _.forEach(PINNED, ({js: [jsUrl], css: [cssUrl], apiHosts}, environment) => {
        it(`cspAllowsOnlyPinnedScript for ${environment}, before anything loads`, () => {
            const html = buildAbhaHostHtml({environment, initData: {}});
            const policy = policyOf(html);
            const scriptSources = policy['script-src'];
            expect(scriptSources).to.have.length(2);
            expect(scriptSources).to.include(jsUrl);
            expect(scriptSources.join(' ')).to.match(/'nonce-[A-Za-z0-9+/_=-]{22,}'/);
            expect(scriptSources.join(' ')).to.not.contain('@latest');
            expect(scriptSources).to.not.include("'unsafe-inline'");
            expect(scriptSources.some(source => CHATBOT_SCRIPT.startsWith(source))).to.equal(false);
            expect(policy['style-src']).to.have.members(["'unsafe-inline'", cssUrl]);
            expect(policy['connect-src']).to.have.members(apiHosts);
            expect(policy['frame-src']).to.deep.equal(["'none'"]);
            const policyAt = html.indexOf('Content-Security-Policy');
            expect(policyAt).to.be.lessThan(html.indexOf('<script'));
            expect(policyAt).to.be.lessThan(html.indexOf('<link'));
        });
    });

    it('bridgeScriptCarriesTheNonce, as does every inline script, and no tag has an inline handler', () => {
        const html = buildAbhaHostHtml({environment: "sandbox", initData: {}});
        const nonce = nonceOf(html);
        const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/g)];
        expect(inlineScripts.length).to.be.greaterThan(0);
        inlineScripts.forEach(([, attributes]) => expect(attribute(attributes, 'nonce')).to.equal(nonce));
        expect(html).to.not.match(/<[a-z]+\s[^>]*\son[a-z]+=/i);
    });

    it('nonceDiffersBetweenRenders', () => {
        const render = () => nonceOf(buildAbhaHostHtml({environment: "sandbox", initData: {}}));
        expect(render()).to.not.equal(render());
    });

    it('reports a pinned file that did not load, such as one that fails its checksum', () => {
        ['abha-sdk-js', 'abha-sdk-css'].forEach(id => {
            const page = runPage(buildAbhaHostHtml({environment: "sandbox", initData: {}}));
            page.dispatchCapturedError({id});
            expect(page.posted, id).to.deep.equal([{type: ABHA_MESSAGE.ERROR, payload: '{"error":"ABHA SDK did not load"}'}]);
        });
    });

    it('does not report the blocked chatbot script as Eka\'s screens failing', () => {
        const page = runPage(buildAbhaHostHtml({environment: "sandbox", initData: {}}));
        page.dispatchCapturedError({id: '', src: CHATBOT_SCRIPT});
        expect(page.posted).to.deep.equal([]);
    });

    it('does not start Eka\'s screens, or throw again, when the SDK never loaded', () => {
        const page = runPage(buildAbhaHostHtml({environment: "sandbox", initData: {}}), {sdkLoaded: false});
        expect(page.initOptions()).to.equal(null);
        expect(page.posted).to.deep.equal([]);
    });

    it('cannot be broken out of by a value that closes the script tag', () => {
        const html = buildAbhaHostHtml({environment: "sandbox", initData: {accessToken: "</script><script>alert(1)</script>"}});
        expect(html).to.not.contain("</script><script>alert(1)");
        expect(toScriptLiteral("a\u2028b")).to.equal('"a\\u2028b"');
        expect(JSON.parse(toScriptLiteral({t: "</x>"}))).to.deep.equal({t: "</x>"});
    });
});
