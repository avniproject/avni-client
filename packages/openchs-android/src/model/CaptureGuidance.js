import _ from "lodash";
import General from "../utility/General";

export const BlockReason = {
    GuidanceMissing: "guidanceMissing",
    Misconfiguration: "misconfiguration"
};

export const FLASH_MODES = ["on", "auto", "off"];

export const BLOCK_MESSAGE_KEYS = {
    [BlockReason.GuidanceMissing]: "guidedCaptureGuidanceMissing",
    [BlockReason.Misconfiguration]: "guidedCaptureMisconfigured"
};

const DEFAULTS = Object.freeze({
    label: null,
    flash: "auto",
    blockOnNoFlash: false,
    blockOnCaptureFailure: true,
    reckonerPath: null,
    overlayPath: null,
    blockCapture: null
});

export function isGuidedCameraKeyValue(value) {
    return value === true || value === "true";
}

export function toFileUri(path) {
    if (!_.isString(path) || path.length === 0) return null;
    return path.startsWith("file://") ? path : `file://${path}`;
}

export const GUIDANCE_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg"];

// The rule hands us an arbitrary string; only render blobs the platform published.
export function isGuidanceBlobPath(guidanceDir, path) {
    if (!_.isString(path) || _.trim(path).length === 0) return false;
    if (path.includes("..")) return false;
    const extension = _.toLower(path.split(".").pop());
    if (!_.includes(GUIDANCE_IMAGE_EXTENSIONS, extension)) return false;
    return _.isNil(guidanceDir) || path.startsWith(`${guidanceDir}/`);
}

function normaliseBlock(blockCapture) {
    const reason = _.get(blockCapture, "reason");
    const message = _.get(blockCapture, "message");
    return {
        // A rule that asked to block must block, whatever reason it named.
        reason: _.includes(_.values(BlockReason), reason) ? reason : BlockReason.Misconfiguration,
        message: _.isString(message) && _.trim(message).length > 0 ? message : null
    };
}

function readBoolean(value, fallback, field) {
    if (_.isNil(value)) return fallback;
    if (_.isBoolean(value)) return value;
    General.logWarn("CaptureGuidance", `captureGuidance.${field} is not a boolean; using ${fallback}`);
    return fallback;
}

// flash/reckoner/overlay block when wrong — a bad value there produces a confidently wrong
// capture. label and the block flags fail open to their defaults.
export function resolveCaptureGuidance(raw, guidanceDir) {
    if (_.isNil(raw)) return {...DEFAULTS};
    if (!_.isPlainObject(raw)) {
        General.logWarn("CaptureGuidance", `captureGuidance is ${typeof raw}, expected an object`);
        return {...DEFAULTS, blockCapture: {reason: BlockReason.Misconfiguration, message: null}};
    }

    const resolved = {...DEFAULTS};
    let misconfigured = false;

    if (!_.isNil(raw.flash)) {
        if (_.includes(FLASH_MODES, raw.flash)) resolved.flash = raw.flash;
        else {
            General.logWarn("CaptureGuidance", `captureGuidance.flash '${raw.flash}' is not one of ${FLASH_MODES}`);
            misconfigured = true;
        }
    }

    _.forEach([["reckoner", "reckonerPath"], ["overlay", "overlayPath"]], ([field, target]) => {
        if (_.isNil(raw[field])) return;
        if (isGuidanceBlobPath(guidanceDir, raw[field])) resolved[target] = raw[field];
        else {
            General.logWarn("CaptureGuidance", `captureGuidance.${field} is not a guidance blob path`);
            misconfigured = true;
        }
    });

    if (!_.isNil(raw.label)) {
        if (_.isString(raw.label)) resolved.label = _.trim(raw.label).length > 0 ? raw.label : null;
        else General.logWarn("CaptureGuidance", "captureGuidance.label is not a string; not rendering it");
    }
    resolved.blockOnNoFlash = readBoolean(raw.blockOnNoFlash, DEFAULTS.blockOnNoFlash, "blockOnNoFlash");
    resolved.blockOnCaptureFailure = readBoolean(raw.blockOnCaptureFailure, DEFAULTS.blockOnCaptureFailure, "blockOnCaptureFailure");

    // Outranks the rule's own reason: "sync and retry" cannot fix a broken rule.
    if (misconfigured) resolved.blockCapture = {reason: BlockReason.Misconfiguration, message: null};
    else if (raw.blockCapture) resolved.blockCapture = normaliseBlock(raw.blockCapture);

    return resolved;
}

// `blobs` maps path -> boolean; a path absent from the map is UNPROBED, never missing.
export function decideGuidedRowState(resolved, blobs = {}) {
    const base = {
        blocked: false,
        reason: null,
        messageKey: null,
        rawMessage: null,
        probing: false,
        showReckoner: false,
        reckonerPath: resolved.reckonerPath,
        overlayReady: false,
        overlayPath: resolved.overlayPath
    };
    if (resolved.blockCapture) {
        return {
            ...base,
            blocked: true,
            reason: resolved.blockCapture.reason,
            messageKey: BLOCK_MESSAGE_KEYS[resolved.blockCapture.reason],
            rawMessage: resolved.blockCapture.message
        };
    }
    const declared = _.compact([resolved.reckonerPath, resolved.overlayPath]);
    if (_.some(declared, path => blobs[path] === false)) {
        return {
            ...base,
            blocked: true,
            reason: BlockReason.GuidanceMissing,
            messageKey: BLOCK_MESSAGE_KEYS[BlockReason.GuidanceMissing]
        };
    }
    // Don't let a tap through on a path we haven't proven is on the device.
    if (_.some(declared, path => !_.isBoolean(blobs[path]))) return {...base, probing: true};
    return {...base, showReckoner: !!resolved.reckonerPath, overlayReady: !!resolved.overlayPath};
}

// Successes only: a missing blob must be re-probed so the row unblocks once sync fetches it.
const presentBlobs = new Set();

// Callers key their own probe memory on this, so invalidating makes them ask again.
let cacheGeneration = 0;

export function guidanceBlobCacheGeneration() {
    return cacheGeneration;
}

export async function probeGuidanceBlobs(existsFn, paths) {
    const result = {};
    for (const path of _.uniq(_.compact(paths))) {
        if (presentBlobs.has(path)) {
            result[path] = true;
            continue;
        }
        try {
            const present = !!(await existsFn(path));
            if (present) presentBlobs.add(path);
            result[path] = present;
        } catch (e) {
            result[path] = false; // an fs error is indistinguishable from a missing file
        }
    }
    return result;
}

export function forgetGuidanceBlob(path) {
    presentBlobs.delete(path);
}

export function clearGuidanceBlobCache() {
    presentBlobs.clear();
    cacheGeneration++;
}
