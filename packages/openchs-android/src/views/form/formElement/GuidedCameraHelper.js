export function toPickerResponse(photoPath, fileSize) {
    const uri = photoPath.startsWith("file://") ? photoPath : `file://${photoPath}`;
    return {assets: [{uri, fileName: uri.split("/").pop(), type: "image/jpeg", fileSize}]};
}

export function isGuidedCameraEnabled(isImage, keyValueRaw) {
    return isImage === true && (keyValueRaw === true || keyValueRaw === 'true');
}

// Bounds no photo reaches. App Designer saves a size limit of 0 when its field is cleared, and the plain photo
// picker then keeps the photo's own size; the resizer needs real bounds to do the same.
const NO_SIZE_LIMIT = 100000;

// A file:// URI, never a bare path: the resizer reads the photo's orientation tag through a reader that
// cannot open a bare path, and would then save the picture as the sensor laid it out, sideways, with
// the tag dropped (#1996). Like the plain picker, it never enlarges a photo.
export function resizeCapturedImage(ImageResizer, photoPath, {maxWidth, maxHeight, quality}) {
    const qualityPercent = Math.round((quality == null ? 1 : quality) * 100);
    const photoUri = photoPath.startsWith("file://") ? photoPath : `file://${photoPath}`;
    const keepOwnSize = maxWidth === 0 || maxHeight === 0;
    return ImageResizer
        .createResizedImage(photoUri, keepOwnSize ? NO_SIZE_LIMIT : maxWidth, keepOwnSize ? NO_SIZE_LIMIT : maxHeight,
            'JPEG', qualityPercent, 0, null, false, {mode: 'contain', onlyScaleDown: true})
        .then(result => (result.uri.startsWith("file://") ? result.uri : `file://${result.uri}`));
}

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

// The photo settings an admin types as key-values. A bad one is a set-up problem that retaking cannot fix,
// so the row reports it instead of saving a photo at a size or quality nobody chose. Returns null when
// all are usable, or what is wrong with each one for the log.
export function photoSettingsProblem({maxWidth, maxHeight, quality}) {
    const problems = [];
    if (!(isFiniteNumber(maxWidth) && maxWidth >= 0)) problems.push(`maxWidth '${maxWidth}' is not a number of 0 or more`);
    if (!(isFiniteNumber(maxHeight) && maxHeight >= 0)) problems.push(`maxHeight '${maxHeight}' is not a number of 0 or more`);
    if (!(isFiniteNumber(quality) && quality > 0 && quality <= 1)) problems.push(`imageQuality '${quality}' is not a number above 0 and at most 1`);
    return problems.length === 0 ? null : problems.join('; ');
}

// useCameraFormat throws on an empty format list instead of returning undefined.
export function deviceWithFormats(device) {
    const formats = device && device.formats;
    return Array.isArray(formats) && formats.length > 0 ? device : undefined;
}
