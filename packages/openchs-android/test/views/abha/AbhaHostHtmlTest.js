import {expect} from "chai";
import vm from "vm";
import {ABHA_MESSAGE, buildAbhaHostHtml, resolveAbhaSdk, toScriptLiteral} from "../../../src/views/abha/AbhaHostHtml";

// Runs the page's own inline scripts against a stand-in window, with initAbhaApp captured instead of Eka's SDK.
function runPage(html) {
    const posted = [];
    const window = {ReactNativeWebView: {postMessage: (message) => posted.push(JSON.parse(message))}, addEventListener: () => {}};
    let initOptions = null;
    window.initAbhaApp = (options) => initOptions = options;
    window.window = window;
    const context = vm.createContext(window);
    [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].forEach(([, body]) => vm.runInContext(body, context));
    return {window, posted, initOptions: () => initOptions};
}

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
        expect(bridgeAt).to.be.lessThan(html.indexOf("abha.js"));
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

    it('cannot be broken out of by a value that closes the script tag', () => {
        const html = buildAbhaHostHtml({environment: "sandbox", initData: {accessToken: "</script><script>alert(1)</script>"}});
        expect(html).to.not.contain("</script><script>alert(1)");
        expect(toScriptLiteral("a\u2028b")).to.equal('"a\\u2028b"');
        expect(JSON.parse(toScriptLiteral({t: "</x>"}))).to.deep.equal({t: "</x>"});
    });
});
