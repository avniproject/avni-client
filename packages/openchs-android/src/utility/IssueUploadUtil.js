import {Alert} from 'react-native';
import AppInfoUploadService from '../service/AppInfoUploadService';
import General from './General';

// IssueUploadUtil is used after login (sync failure, login failure) - translations available
class IssueUploadUtil {
    static uploadIssueInfo(context, I18n, avniError, callerName, onStartUpload, onEndUpload, onProgressUpdate = null, username = null) {
        if (avniError && avniError.reportingText) {
            General.logDebug(callerName || "IssueUploadUtil", avniError.reportingText);
        }

        if (onStartUpload) onStartUpload();

        const appInfoUploadService = context.getService(AppInfoUploadService);

        appInfoUploadService.upload((percentDone, message) => {
            General.logDebug("IssueUploadUtil", `${percentDone}% - ${message}`);
            if (onProgressUpdate) {
                onProgressUpdate(percentDone, message);
            }
            if (percentDone === 100) {
                if (message === "backupFailed") {
                    Alert.alert(I18n.t('uploadFailed'), "");
                } else {
                    Alert.alert(I18n.t('uploadSuccessful'), "");
                }
                if (onEndUpload) onEndUpload();
            }
        }, username);
    }

    static createUploadIssueInfoButton(context, I18n, avniError, callerName, onStartUpload, onEndUpload, onProgressUpdate = null, username = null) {
        return {
            text: I18n.t('uploadIssueInfo'),
            onPress: () => IssueUploadUtil.uploadIssueInfo(context, I18n, avniError, callerName, onStartUpload, onEndUpload, onProgressUpdate, username)
        };
    }
}

export default IssueUploadUtil;
