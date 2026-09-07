import _ from "lodash";

// Follows the ServerError / AuthenticationError pattern in this codebase: a plain function
// that borrows a real Error (for the message and stack) and re-points its prototype, so the
// result is both a MediaUploadError and an Error. SyncComponent._onError dispatches on that
// instanceof check.
function MediaUploadError({fileName, mediaType, sizeBytes, bytesSent, cause, originalError}) {
    const instance = new Error(`Media upload failed: ${cause}`);
    instance.fileName = fileName;
    instance.mediaType = mediaType;
    instance.sizeBytes = _.isFinite(sizeBytes) ? sizeBytes : null;
    instance.bytesSent = _.isFinite(bytesSent) ? bytesSent : null;
    instance.cause = cause;
    instance.originalError = originalError;

    if (Object.setPrototypeOf) {
        Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
    } else {
        instance.__proto__ = Object.getPrototypeOf(this);
    }
    return instance;
}

MediaUploadError.CauseCategory = {
    StorageUnreachable: 'storageUnreachable',
    UploadStalled: 'uploadStalled',
    UploadFailed: 'uploadFailed'
};

// Causes observed in the seven-week device log dump on #2067, in the order they must be
// tested: a watchdog cancel can also carry network wording, and the cancel is the real cause.
const STALLED = /canceled|cancelled|ReactNativeBlobUtilCanceledFetch/i;
const UNREACHABLE = /Unable to resolve host|No address associated with hostname|Network request failed|Unable to connect|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|timed out/i;

MediaUploadError.causeCategory = function (error) {
    const cause = _.get(error, "cause", "") || "";
    if (STALLED.test(cause)) return MediaUploadError.CauseCategory.UploadStalled;
    if (UNREACHABLE.test(cause)) return MediaUploadError.CauseCategory.StorageUnreachable;
    return MediaUploadError.CauseCategory.UploadFailed;
};

const MEDIA_TYPE_KEYS = {
    'Image': 'mediaTypePhoto',
    'ImageV2': 'mediaTypePhoto',
    'Profile-Pics': 'mediaTypePhoto',
    'Video': 'mediaTypeVideo',
    'Audio': 'mediaTypeAudio'
};

MediaUploadError.mediaTypeKey = function (mediaType) {
    return MEDIA_TYPE_KEYS[mediaType] || 'mediaTypeFile';
};

const orUnknown = (value) => (_.isFinite(value) ? value : 'unknown');

MediaUploadError.logLine = function (error) {
    return `MediaUpload blocked sync: file=${error.fileName} type=${error.mediaType} ` +
        `size=${orUnknown(error.sizeBytes)} sent=${orUnknown(error.bytesSent)} ` +
        `category=${MediaUploadError.causeCategory(error)} cause=${error.cause}`;
};

MediaUploadError.failureDetail = function (error) {
    return {
        stage: 'mediaUpload',
        category: MediaUploadError.causeCategory(error),
        cause: error.cause,
        fileName: error.fileName,
        mediaType: error.mediaType,
        sizeBytes: error.sizeBytes,
        bytesSent: error.bytesSent
    };
};

const REASON_KEYS = {
    [MediaUploadError.CauseCategory.StorageUnreachable]: 'mediaUploadReasonStorageUnreachable',
    [MediaUploadError.CauseCategory.UploadStalled]: 'mediaUploadReasonUploadStalled',
    [MediaUploadError.CauseCategory.UploadFailed]: 'mediaUploadReasonUploadFailed'
};

// The filename is a UUID and the raw cause is a stack-trace fragment; neither helps a field
// user, and both are already on the log line and the telemetry row. See #2097.
MediaUploadError.userMessage = function (error, i18n) {
    const mediaType = i18n.t(MediaUploadError.mediaTypeKey(error.mediaType));
    const reason = i18n.t(REASON_KEYS[MediaUploadError.causeCategory(error)]);
    return i18n.t('mediaUploadBlockedSync', {mediaType, reason});
};

MediaUploadError.prototype = Object.create(Error.prototype, {
    constructor: {
        value: Error,
        enumerable: false,
        writable: true,
        configurable: true
    }
});

if (Object.setPrototypeOf) {
    Object.setPrototypeOf(MediaUploadError, Error);
} else {
    MediaUploadError.__proto__ = Error;
}

export default MediaUploadError;
