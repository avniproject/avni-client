// Follows the ServerError / AuthenticationError pattern in this codebase: a plain function
// that borrows a real Error (for the message and stack) and re-points its prototype, so the
// result is both a MediaUploadError and an Error. SyncComponent._onError dispatches on that
// instanceof check to show a readable dialog. #2097
function MediaUploadError(originalError) {
    const cause = originalError && originalError.message ? originalError.message : originalError;
    const instance = new Error(`Media upload failed: ${cause}`);
    instance.originalError = originalError;

    if (Object.setPrototypeOf) {
        Object.setPrototypeOf(instance, Object.getPrototypeOf(this));
    } else {
        instance.__proto__ = Object.getPrototypeOf(this);
    }
    return instance;
}

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
