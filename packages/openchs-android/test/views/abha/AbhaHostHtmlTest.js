import {expect} from "chai";
import {buildAbhaHostHtml, resolveAbhaSdk, toScriptLiteral} from "../../../src/views/abha/AbhaHostHtml";

describe('AbhaHostHtmlTest', () => {
    it('pins the staging SDK by default and the production SDK only when asked', () => {
        expect(resolveAbhaSdk(undefined).packageName).to.equal("@eka-care/abha-stg");
        expect(resolveAbhaSdk("anything-else").packageName).to.equal("@eka-care/abha-stg");
        expect(resolveAbhaSdk("production").packageName).to.equal("@eka-care/abha");

        const html = buildAbhaHostHtml({sdkEnv: "staging", initData: {}});
        expect(html).to.contain("https://unpkg.com/@eka-care/abha-stg@0.1.126/dist/sdk/abha/js/abha.js");
        expect(html).to.contain("https://unpkg.com/@eka-care/abha-stg@0.1.126/dist/sdk/abha/css/abha.css");
        expect(buildAbhaHostHtml({sdkEnv: "production", initData: {}}))
            .to.contain("https://unpkg.com/@eka-care/abha@0.2.2/dist/sdk/abha/js/abha.js");
    });

    it('defines the native bridge before the SDK loads', () => {
        const html = buildAbhaHostHtml({initData: {}});
        const bridgeAt = html.indexOf("window.EkaAbha = {");
        expect(bridgeAt).to.be.greaterThan(-1);
        expect(bridgeAt).to.be.lessThan(html.indexOf("abha.js"));
        ["onAbhaSuccess", "onAbhaError", "onAbhaFailure", "onAbhaClose", "changeStatusBarColor"]
            .forEach(fn => expect(html).to.contain(`${fn}: function`));
        expect(html).to.contain("window.ReactNativeWebView.postMessage");
    });

    it('passes the init data and method to initAbhaApp', () => {
        const html = buildAbhaHostHtml({method: "login_or_create_abha", initData: {accessToken: "tok-123", skipABHAEnable: true}});
        expect(html).to.contain(`method: "login_or_create_abha"`);
        expect(html).to.contain(`data: {"accessToken":"tok-123","skipABHAEnable":true}`);
        expect(buildAbhaHostHtml({initData: {}})).to.contain("method: null");
    });

    it('cannot be broken out of by a value that closes the script tag', () => {
        const html = buildAbhaHostHtml({initData: {accessToken: "</script><script>alert(1)</script>"}});
        expect(html).to.not.contain("</script><script>alert(1)");
        expect(toScriptLiteral("a\u2028b")).to.equal('"a\\u2028b"');
        expect(JSON.parse(toScriptLiteral({t: "</x>"}))).to.deep.equal({t: "</x>"});
    });
});
