import _ from "lodash";

const isCameraPermission = (permission) => _.endsWith(permission, 'CAMERA');
const isMicrophonePermission = (permission) => _.endsWith(permission, 'RECORD_AUDIO');
const isStoragePermission = (permission) => _.endsWith(permission, 'EXTERNAL_STORAGE');

export function permissionsToRequest(PERMISSIONS, apiLevel, storageDeprecationApiLevel, {camera = false, microphone = false, deviceLocation = false, mediaLocation = false} = {}) {
    const permissions = [];
    if (apiLevel < storageDeprecationApiLevel) {
        permissions.push(PERMISSIONS.READ_EXTERNAL_STORAGE, PERMISSIONS.WRITE_EXTERNAL_STORAGE);
    }
    if (camera) permissions.push(PERMISSIONS.CAMERA);
    if (microphone) permissions.push(PERMISSIONS.RECORD_AUDIO);
    if (mediaLocation) permissions.push(PERMISSIONS.ACCESS_MEDIA_LOCATION);
    if (deviceLocation) permissions.push(PERMISSIONS.ACCESS_FINE_LOCATION, PERMISSIONS.ACCESS_COARSE_LOCATION);
    return permissions;
}

export function deniedPermissions(permissionResult, grantedStatus) {
    return _.keys(_.omitBy(permissionResult, status => status === grantedStatus));
}

// Returns null when nothing the action actually depends on was denied. The location permissions only add a
// geotag to the photo - the element already warns on screen when one has no location - so denying them
// leaves the capture to go ahead rather than stranding the form on a permission the user said no to.
export function permissionDeniedAlertKeys(permissionResult, grantedStatus) {
    const denied = deniedPermissions(permissionResult, grantedStatus);
    if (_.some(denied, isCameraPermission)) return {titleKey: 'cameraPermissionRequired', messageKey: 'giveCameraPermissionFromSettings'};
    if (_.some(denied, isMicrophonePermission)) return {titleKey: 'microphonePermissionRequired', messageKey: 'giveMicrophonePermissionFromSettings'};
    if (_.some(denied, isStoragePermission)) return {titleKey: 'storagePermissionRequired', messageKey: 'giveStoragePermissionFromSettings'};
    return null;
}
