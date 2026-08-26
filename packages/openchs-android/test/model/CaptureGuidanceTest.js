import {assert} from "chai";
import {
    BlockReason,
    clearGuidanceBlobCache,
    guidanceBlobCacheGeneration,
    decideGuidedRowState,
    forgetGuidanceBlob,
    isGuidanceBlobPath,
    isGuidedCameraKeyValue,
    probeGuidanceBlobs,
    resolveCaptureGuidance,
    toFileUri
} from "../../src/model/CaptureGuidance";

const GUIDANCE_DIR = "/storage/Avni/guidance";
const RECKONER = `${GUIDANCE_DIR}/aaa.png`;
const OVERLAY = `${GUIDANCE_DIR}/bbb.png`;

describe("resolveCaptureGuidance — defaults", () => {
    it("applies the safe defaults when the rule set no guidance", () => {
        [undefined, null].forEach(raw => {
            const resolved = resolveCaptureGuidance(raw, GUIDANCE_DIR);
            assert.deepEqual(resolved, {
                label: null, flash: "auto", blockOnNoFlash: false, blockOnCaptureFailure: true,
                reckonerPath: null, overlayPath: null, blockCapture: null
            });
        });
    });

    it("applies the same defaults for an empty object", () => {
        const resolved = resolveCaptureGuidance({}, GUIDANCE_DIR);
        assert.equal(resolved.flash, "auto");
        assert.isFalse(resolved.blockOnNoFlash);
        assert.isTrue(resolved.blockOnCaptureFailure);
        assert.isNull(resolved.blockCapture);
    });

    it("does not leak state between calls", () => {
        resolveCaptureGuidance({flash: "on", label: "x"}, GUIDANCE_DIR);
        assert.equal(resolveCaptureGuidance({}, GUIDANCE_DIR).flash, "auto");
        assert.isNull(resolveCaptureGuidance({}, GUIDANCE_DIR).label);
    });
});

describe("resolveCaptureGuidance — malformed guidance blocks", () => {
    it("blocks with misconfiguration when captureGuidance is not a plain object", () => {
        [[], "x", 42, true, new Date()].forEach(raw => {
            const resolved = resolveCaptureGuidance(raw, GUIDANCE_DIR);
            assert.equal(resolved.blockCapture.reason, BlockReason.Misconfiguration,
                `expected ${JSON.stringify(raw)} to be treated as misconfigured`);
        });
    });

    it("still returns the safe defaults alongside the block", () => {
        const resolved = resolveCaptureGuidance("nonsense", GUIDANCE_DIR);
        assert.equal(resolved.flash, "auto");
        assert.isTrue(resolved.blockOnCaptureFailure);
    });
});

describe("resolveCaptureGuidance — flash", () => {
    it("accepts each valid mode", () => {
        ["on", "auto", "off"].forEach(flash => {
            const resolved = resolveCaptureGuidance({flash}, GUIDANCE_DIR);
            assert.equal(resolved.flash, flash);
            assert.isNull(resolved.blockCapture);
        });
    });

    it("blocks on an invalid mode rather than quietly using auto", () => {
        ["On", "ON", 1, "flash"].forEach(flash => {
            const resolved = resolveCaptureGuidance({flash}, GUIDANCE_DIR);
            assert.equal(resolved.blockCapture.reason, BlockReason.Misconfiguration);
        });
    });
});

describe("resolveCaptureGuidance — blob paths", () => {
    it("accepts paths under the models directory", () => {
        const resolved = resolveCaptureGuidance({reckoner: RECKONER, overlay: OVERLAY}, GUIDANCE_DIR);
        assert.equal(resolved.reckonerPath, RECKONER);
        assert.equal(resolved.overlayPath, OVERLAY);
        assert.isNull(resolved.blockCapture);
    });

    it("blocks on a path outside the models directory", () => {
        const resolved = resolveCaptureGuidance({reckoner: "/somewhere/else/aaa.png"}, GUIDANCE_DIR);
        assert.equal(resolved.blockCapture.reason, BlockReason.Misconfiguration);
        assert.isNull(resolved.reckonerPath);
    });

    it("blocks on traversal, a non-image extension, and a non-string", () => {
        [`${GUIDANCE_DIR}/../../etc/passwd.png`, `${GUIDANCE_DIR}/aaa.bin`, 42, ""].forEach(reckoner => {
            const resolved = resolveCaptureGuidance({reckoner}, GUIDANCE_DIR);
            assert.equal(resolved.blockCapture.reason, BlockReason.Misconfiguration,
                `expected ${JSON.stringify(reckoner)} to be rejected`);
        });
    });

    it("accepts every image extension the platform publishes", () => {
        ["png", "jpg", "jpeg", "PNG"].forEach(extension => {
            const path = `${GUIDANCE_DIR}/aaa.${extension}`;
            assert.equal(resolveCaptureGuidance({reckoner: path}, GUIDANCE_DIR).reckonerPath, path);
        });
    });

    it("isGuidanceBlobPath skips containment when no guidance dir is given", () => {
        assert.isTrue(isGuidanceBlobPath(null, "/anywhere/aaa.png"));
        assert.isFalse(isGuidanceBlobPath(null, "/anywhere/aaa.bin"));
    });
});

describe("resolveCaptureGuidance — label and the block flags fail open", () => {
    it("keeps a label verbatim, including its whitespace and case", () => {
        assert.equal(resolveCaptureGuidance({label: "3 of 14 — Left buccal mucosa"}, GUIDANCE_DIR).label,
            "3 of 14 — Left buccal mucosa");
    });

    it("drops a blank or non-string label without blocking", () => {
        [" ", "", 42, {}].forEach(label => {
            const resolved = resolveCaptureGuidance({label}, GUIDANCE_DIR);
            assert.isNull(resolved.label);
            assert.isNull(resolved.blockCapture);
        });
    });

    it("coerces non-boolean block flags to their defaults without blocking", () => {
        const resolved = resolveCaptureGuidance({blockOnNoFlash: "true", blockOnCaptureFailure: "no"}, GUIDANCE_DIR);
        assert.isFalse(resolved.blockOnNoFlash);
        assert.isTrue(resolved.blockOnCaptureFailure);
        assert.isNull(resolved.blockCapture);
    });

    it("honours the flags when they are real booleans", () => {
        const resolved = resolveCaptureGuidance({blockOnNoFlash: true, blockOnCaptureFailure: false}, GUIDANCE_DIR);
        assert.isTrue(resolved.blockOnNoFlash);
        assert.isFalse(resolved.blockOnCaptureFailure);
    });
});

describe("resolveCaptureGuidance — blockCapture", () => {
    it("preserves a guidanceMissing block and its message", () => {
        const resolved = resolveCaptureGuidance(
            {blockCapture: {reason: "guidanceMissing", message: "Sync and retry"}}, GUIDANCE_DIR);
        assert.equal(resolved.blockCapture.reason, BlockReason.GuidanceMissing);
        assert.equal(resolved.blockCapture.message, "Sync and retry");
    });

    it("normalises an unknown or absent reason to misconfiguration but still blocks", () => {
        [{reason: "weird"}, {}, true].forEach(blockCapture => {
            const resolved = resolveCaptureGuidance({blockCapture}, GUIDANCE_DIR);
            assert.equal(resolved.blockCapture.reason, BlockReason.Misconfiguration);
        });
    });

    it("drops a blank message", () => {
        const resolved = resolveCaptureGuidance({blockCapture: {reason: "guidanceMissing", message: "  "}}, GUIDANCE_DIR);
        assert.isNull(resolved.blockCapture.message);
    });

    it("reports misconfiguration over the rule's own reason when the rule is also malformed", () => {
        const resolved = resolveCaptureGuidance(
            {flash: "ON", blockCapture: {reason: "guidanceMissing"}}, GUIDANCE_DIR);
        assert.equal(resolved.blockCapture.reason, BlockReason.Misconfiguration,
            "telling the worker to sync cannot fix a broken rule");
    });
});

describe("decideGuidedRowState", () => {
    const withPaths = (extra = {}) => resolveCaptureGuidance({reckoner: RECKONER, overlay: OVERLAY, ...extra}, GUIDANCE_DIR);

    it("blocks when the guidance itself is blocked, carrying the message key", () => {
        const state = decideGuidedRowState(resolveCaptureGuidance({blockCapture: {reason: "guidanceMissing"}}, GUIDANCE_DIR), {});
        assert.isTrue(state.blocked);
        assert.equal(state.reason, BlockReason.GuidanceMissing);
        assert.equal(state.messageKey, "guidedCaptureGuidanceMissing");
    });

    it("uses the misconfiguration message key for a broken rule", () => {
        const state = decideGuidedRowState(resolveCaptureGuidance("nonsense", GUIDANCE_DIR), {});
        assert.equal(state.messageKey, "guidedCaptureMisconfigured");
    });

    it("blocks when the reckoner is not on the device", () => {
        const state = decideGuidedRowState(withPaths(), {[RECKONER]: false, [OVERLAY]: true});
        assert.isTrue(state.blocked);
        assert.equal(state.reason, BlockReason.GuidanceMissing);
    });

    it("blocks when the overlay is not on the device", () => {
        const state = decideGuidedRowState(withPaths(), {[RECKONER]: true, [OVERLAY]: false});
        assert.isTrue(state.blocked);
        assert.equal(state.reason, BlockReason.GuidanceMissing);
    });

    it("reports probing, not missing, while a path is unprobed", () => {
        const state = decideGuidedRowState(withPaths(), {[RECKONER]: true});
        assert.isFalse(state.blocked);
        assert.isTrue(state.probing);
        assert.isFalse(state.showReckoner);
    });

    it("treats an entirely unprobed row as probing", () => {
        const state = decideGuidedRowState(withPaths(), {});
        assert.isTrue(state.probing);
    });

    it("renders normally once every declared path is present", () => {
        const state = decideGuidedRowState(withPaths(), {[RECKONER]: true, [OVERLAY]: true});
        assert.isFalse(state.blocked);
        assert.isFalse(state.probing);
        assert.isTrue(state.showReckoner);
        assert.isTrue(state.overlayReady);
        assert.equal(state.reckonerPath, RECKONER);
    });

    it("renders normally with no paths declared — camera policy without guidance images", () => {
        const state = decideGuidedRowState(resolveCaptureGuidance({flash: "on"}, GUIDANCE_DIR), {});
        assert.isFalse(state.blocked);
        assert.isFalse(state.probing);
        assert.isFalse(state.showReckoner);
        assert.isFalse(state.overlayReady);
    });
});

describe("probeGuidanceBlobs", () => {
    beforeEach(() => clearGuidanceBlobCache());

    it("memoises a hit so the steady state costs no further filesystem calls", async () => {
        let calls = 0;
        const existsFn = () => { calls++; return Promise.resolve(true); };
        assert.deepEqual(await probeGuidanceBlobs(existsFn, [RECKONER]), {[RECKONER]: true});
        assert.deepEqual(await probeGuidanceBlobs(existsFn, [RECKONER]), {[RECKONER]: true});
        assert.equal(calls, 1);
    });

    it("re-probes a miss, so a row unblocks itself once sync fetches the blob", async () => {
        let calls = 0;
        let present = false;
        const existsFn = () => { calls++; return Promise.resolve(present); };
        assert.deepEqual(await probeGuidanceBlobs(existsFn, [RECKONER]), {[RECKONER]: false});
        present = true;
        assert.deepEqual(await probeGuidanceBlobs(existsFn, [RECKONER]), {[RECKONER]: true});
        assert.equal(calls, 2);
    });

    it("reads a filesystem error as missing rather than throwing", async () => {
        const result = await probeGuidanceBlobs(() => Promise.reject(new Error("boom")), [RECKONER]);
        assert.deepEqual(result, {[RECKONER]: false});
    });

    it("de-duplicates and skips nil paths", async () => {
        const probed = [];
        const existsFn = (p) => { probed.push(p); return Promise.resolve(true); };
        await probeGuidanceBlobs(existsFn, [null, undefined, RECKONER, RECKONER]);
        assert.deepEqual(probed, [RECKONER]);
    });

    it("advances a generation when cleared, so callers retire what they already probed", async () => {
        // A row blocked before a sync must not stay blocked while it remains mounted; the caller
        // keys its own memory on this, and clearing the cache is what a completed sync does.
        const before = guidanceBlobCacheGeneration();
        clearGuidanceBlobCache();
        assert.notEqual(guidanceBlobCacheGeneration(), before);
    });

    it("forgetGuidanceBlob re-enables probing for a path that stopped decoding", async () => {
        let calls = 0;
        const existsFn = () => { calls++; return Promise.resolve(true); };
        await probeGuidanceBlobs(existsFn, [RECKONER]);
        forgetGuidanceBlob(RECKONER);
        await probeGuidanceBlobs(existsFn, [RECKONER]);
        assert.equal(calls, 2);
    });
});

describe("small helpers", () => {
    it("isGuidedCameraKeyValue is true only for a boolean true or the string 'true'", () => {
        assert.isTrue(isGuidedCameraKeyValue(true));
        assert.isTrue(isGuidedCameraKeyValue("true"));
        [false, "false", "TRUE", 1, null, undefined].forEach(v => assert.isFalse(isGuidedCameraKeyValue(v)));
    });

    it("toFileUri prefixes once and is nil-safe", () => {
        assert.equal(toFileUri("/a/b.bin"), "file:///a/b.bin");
        assert.equal(toFileUri("file:///a/b.bin"), "file:///a/b.bin");
        assert.isNull(toFileUri(null));
        assert.isNull(toFileUri(""));
    });
});
