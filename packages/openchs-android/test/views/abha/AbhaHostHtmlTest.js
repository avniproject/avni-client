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
            expect(page.posted, id).to.deep.equal([{type: ABHA_MESSAGE.ERROR, payload: '{"error":{"code":"ABHA_SDK_NOT_LOADED"}}'}]);
        });
    });

    it('reports a script error on the page by a fixed code, never its message, which can quote what was typed', () => {
        const page = runPage(buildAbhaHostHtml({environment: "sandbox", initData: {}}));
        page.window.onerror("Uncaught TypeError: cannot read 'Asha Rao 91-1234-5678-9012'");
        expect(page.posted).to.deep.equal([{type: ABHA_MESSAGE.ERROR, payload: '{"error":{"code":"ABHA_PAGE_SCRIPT_ERROR"}}'}]);
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

// A build's branding, as AbhaBranding hands it over.
const BRANDING = {
    theme: {primary: {brand: "#00767D"}, content: {primary: "#111827"}},
    brandColour: "#00767D",
    fontFamily: "Roboto, sans-serif",
    textReplacements: [
        {find: "Allow Eka Care to\\s+create ABHA locker and\\s+link health data", replace: "Allow creation of an ABHA locker and linking of health data"},
        {find: "Create Eka Profile", replace: "Create Profile"},
    ],
    imageTopCrops: {cmj9r: 14},
    logoUrl: "data:image/png;base64,TEST",
    logoInPlaceOfAbdm: true,
};

// The few DOM pieces the wording script touches, so it can run in the vm sandbox.
function fakeDom() {
    const text = (value) => ({nodeType: 3, nodeValue: value});
    const element = (nodeName, children = []) => {
        const node = {nodeType: 1, nodeName, firstChild: null, nextSibling: null};
        children.forEach((child, i) => {
            child.parentNode = node;
            if (i === 0) node.firstChild = child; else children[i - 1].nextSibling = child;
        });
        return node;
    };
    const observers = [];
    const root = element("DIV", [element("SPAN", [text("Allow Eka Care to create ABHA locker and link health data")])]);
    class MutationObserver {
        constructor(callback) { this.callback = callback; observers.push(this); }
        observe(target, options) { this.target = target; this.options = options; }
    }
    const document = {getElementById: (id) => id === "abha" ? root : null};
    const mutate = (mutations) => observers.forEach((o) => o.callback(mutations));
    return {document, MutationObserver, root, text, element, mutate, observers};
}

function runPageWithDom(html, dom) {
    const window = {ReactNativeWebView: {postMessage: () => {}}, addEventListener: () => {}, document: dom.document, MutationObserver: dom.MutationObserver};
    window.initAbhaApp = () => {};
    window.window = window;
    const context = vm.createContext(window);
    [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].forEach(([, body]) => vm.runInContext(body, context));
}

describe('AbhaHostHtmlTest with a build\'s branding', () => {
    it('leaves the page as Eka ships it when the build has no branding', () => {
        const page = buildAbhaHostHtml({environment: "sandbox", method: "login_or_create_abha", initData: {accessToken: "t"}});
        expect(page).to.not.contain('abha-branding');
        expect(page).to.not.contain('theme:');
        expect(page).to.not.contain('MutationObserver');
        expect(runPage(page).initOptions()).to.not.have.property('theme');
        expect(runPage(page).initOptions().data).to.deep.equal({accessToken: "t"});
    });

    it('hands Eka its theme, and the logo for beside the ABDM logo and the link screen', () => {
        const page = runPage(buildAbhaHostHtml({environment: "sandbox", initData: {accessToken: "t"}, branding: BRANDING}));
        expect(page.initOptions().theme).to.deep.equal(BRANDING.theme);
        expect(page.initOptions().data).to.deep.equal({accessToken: "t", orgIconUrl: BRANDING.logoUrl, linkToOrgIcon: BRANDING.logoUrl});
    });

    it('carries the brand colour to every rule of Eka\'s that holds its purple, and sets the font and the crops', () => {
        const html = buildAbhaHostHtml({environment: "sandbox", initData: {}, branding: BRANDING});
        const style = html.match(/<style id="abha-branding">([\s\S]*?)<\/style>/)[1];
        ['pds2-bg-primary-brand {background-color: #00767D !important;}',
            'pds2-text-primary-brand {color: #00767D !important;}',
            'pds2-border-b-primary-brand {border-bottom-color: #00767D !important;}',
            '.pds2-ring-primary-brand {--tw-ring-color: #00767D !important;}',
            '.focus-within\\:pds2-ring-primary-brand:focus-within {--tw-ring-color: #00767D !important;}',
            '.pds2-bg-primary-brand\\/20 {background-color: #00767D33 !important;}',
            '.active\\:pds2-bg-primary-brand\\/20:active {background-color: #00767D33 !important;}',
            '#abha, #abha * {font-family: Roboto, sans-serif !important;}',
            '#abha img[alt="org-icon"] {background-color: #FFFFFF;',
            '#abha img[src*="cmj9r"] {aspect-ratio: 100 / 86; object-fit: cover; object-position: center bottom;}',
        ].forEach((rule) => expect(style, rule).to.contain(rule));
        expect(style).to.not.match(/6b5ce0/i);
        expect(html.indexOf('id="abha-branding"')).to.be.greaterThan(html.indexOf('id="abha-sdk-css"'));
    });

    it('puts the build\'s logo in place of the ABDM logo on the first screen only when asked', () => {
        const rule = '#abha img[alt="abdm-icon"]:has(+ img[alt="org-icon"]) {display: none !important;}';
        expect(buildAbhaHostHtml({environment: "sandbox", initData: {}, branding: BRANDING})).to.contain(rule);
        expect(buildAbhaHostHtml({environment: "sandbox", initData: {}, branding: {...BRANDING, logoInPlaceOfAbdm: false}})).to.not.contain('abdm-icon');
        expect(buildAbhaHostHtml({environment: "sandbox", initData: {}, branding: {...BRANDING, logoUrl: null}})).to.not.contain('abdm-icon');
    });

    it('keeps the page\'s rules with branding: every inline script carries the nonce, and no tag has an inline handler', () => {
        const html = buildAbhaHostHtml({environment: "production", initData: {}, branding: BRANDING});
        const nonce = nonceOf(html);
        const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/g)];
        expect(inlineScripts.length).to.equal(3);
        inlineScripts.forEach(([, attributes]) => expect(attribute(attributes, 'nonce')).to.equal(nonce));
        expect(html).to.not.match(/<[a-z]+\s[^>]*\son[a-z]+=/i);
        expect(policyOf(html)['script-src']).to.have.length(2);
    });

    it('rewrites Eka\'s wording already on the screen, and whatever Eka draws later', () => {
        const dom = fakeDom();
        runPageWithDom(buildAbhaHostHtml({environment: "sandbox", initData: {}, branding: BRANDING}), dom);
        expect(dom.root.firstChild.firstChild.nodeValue).to.equal("Allow creation of an ABHA locker and linking of health data");
        expect(dom.observers[0].target).to.equal(dom.root);
        expect(dom.observers[0].options).to.deep.equal({childList: true, subtree: true, characterData: true});

        const heading = dom.element("H1", [dom.text("Create Eka Profile")]);
        dom.mutate([{type: "childList", addedNodes: [heading]}]);
        expect(heading.firstChild.nodeValue).to.equal("Create Profile");

        const redrawn = dom.text("Create Eka Profile");
        dom.mutate([{type: "characterData", target: redrawn}]);
        expect(redrawn.nodeValue).to.equal("Create Profile");
    });

    it('never rewrites what the worker types', () => {
        const dom = fakeDom();
        runPageWithDom(buildAbhaHostHtml({environment: "sandbox", initData: {}, branding: BRANDING}), dom);
        const typed = dom.element("TEXTAREA", [dom.text("Create Eka Profile")]);
        dom.mutate([{type: "childList", addedNodes: [typed]}]);
        expect(typed.firstChild.nodeValue).to.equal("Create Eka Profile");
    });

    it('cannot be broken out of by wording that closes the script tag', () => {
        const html = buildAbhaHostHtml({environment: "sandbox", initData: {}, branding: {...BRANDING,
            textReplacements: [{find: "Eka", replace: "</script><script>alert(1)</script>"}]}});
        expect(html).to.not.contain("</script><script>alert(1)");
    });
});
