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

// These are the diagnostic buckets, not the user-facing ones: this is the field to GROUP BY
// when asking "why are devices blocked?" — the table #2067 had to rebuild by hand from a
// seven-week log dump. DNS and connect failures are kept apart here even though they read
// identically to the user (see REASON_KEYS below, which collapses them again).
MediaUploadError.CauseCategory = {
    DnsFailure: 'dnsFailure',
    ConnectFailure: 'connectFailure',
    UploadStalled: 'uploadStalled',
    HttpError: 'httpError',
    Unknown: 'unknown'
};

// Order matters: a watchdog cancel message can also carry network wording, and the cancel is
// the real cause. DNS is tested before connect because a resolution failure never carries an
// IP, whereas "Failed to connect to host/1.2.3.4:443" proves resolution already succeeded.
const STALLED = /canceled|cancelled|ReactNativeBlobUtilCanceledFetch/i;
const DNS = /Unable to resolve host|No address associated with hostname|UnknownHostException|ENOTFOUND|EAI_AGAIN/i;
const CONNECT = /Failed to connect|Unable to connect|Connection refused|Network is unreachable|Network request failed|ECONNREFUSED|ECONNRESET|ETIMEDOUT|timed out/i;
const HTTP = /HTTP Status:\s*\d+/i;

MediaUploadError.causeCategory = function (error) {
    const cause = _.get(error, "cause", "") || "";
    if (STALLED.test(cause)) return MediaUploadError.CauseCategory.UploadStalled;
    if (DNS.test(cause)) return MediaUploadError.CauseCategory.DnsFailure;
    if (CONNECT.test(cause)) return MediaUploadError.CauseCategory.ConnectFailure;
    if (HTTP.test(cause)) return MediaUploadError.CauseCategory.HttpError;
    return MediaUploadError.CauseCategory.Unknown;
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

// Several diagnostic categories collapse to one sentence on purpose. Neither "your DNS is
// broken" nor "TCP connect refused" is something a field worker can act on, and the action is
// the same either way. The distinction stays in the category and the raw cause.
const REASON_KEYS = {
    [MediaUploadError.CauseCategory.DnsFailure]: 'mediaUploadReasonStorageUnreachable',
    [MediaUploadError.CauseCategory.ConnectFailure]: 'mediaUploadReasonStorageUnreachable',
    [MediaUploadError.CauseCategory.UploadStalled]: 'mediaUploadReasonUploadStalled',
    [MediaUploadError.CauseCategory.HttpError]: 'mediaUploadReasonUploadFailed',
    [MediaUploadError.CauseCategory.Unknown]: 'mediaUploadReasonUploadFailed'
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
