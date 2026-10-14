export function toPickerResponse(photoPath, fileSize) {
    const uri = photoPath.startsWith("file://") ? photoPath : `file://${photoPath}`;
    return {assets: [{uri, fileName: uri.split("/").pop(), type: "image/jpeg", fileSize}]};
}

export function isGuidedCameraEnabled(isImage, keyValueRaw) {
    return isImage === true && (keyValueRaw === true || keyValueRaw === 'true');
}

export function resizeCapturedImage(ImageResizer, photoPath, {maxWidth, maxHeight, quality}) {
    const qualityPercent = Math.round((quality == null ? 1 : quality) * 100);
    return ImageResizer
        .createResizedImage(photoPath, maxWidth, maxHeight, 'JPEG', qualityPercent, 0)
        .then(result => (result.uri.startsWith("file://") ? result.uri : `file://${result.uri}`));
}
