import RNFetchBlob from "react-native-blob-util";
import {IDP_PROVIDERS} from "../model/IdpProviders";

async function authHeaders(authService, settingsService) {
    const [token, idpType] = await Promise.all([
        authService.getAuthProviderService().getAuthToken(),
        settingsService.getSettings().idpType
    ]);
    return idpType === IDP_PROVIDERS.NONE ? {'USER-NAME': token} : {'AUTH-TOKEN': token};
}

export async function downloadWithAuth(authService, settingsService, url, targetFilePath, cb) {
    const headers = await authHeaders(authService, settingsService);
    return download(url, targetFilePath, headers, cb);
}

// Presigned storage URLs (S3/GCS) carry their own auth in the query string;
// forwarding Avni headers can make GCS reject the request.
export function downloadWithoutAuth(url, targetFilePath, cb) {
    return download(url, targetFilePath, {}, cb);
}

function download(url, targetFilePath, headers, cb) {
    return RNFetchBlob
        .config({fileCache: true, path: targetFilePath})
        .fetch('GET', url, headers)
        .progress((received, total) => {
            if (cb) cb(received, total);
        });
}
