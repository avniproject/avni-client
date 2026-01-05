import {ToastAndroid} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import BackupRestoreRealmService from '../service/BackupRestoreRealmService';
import MediaQueueService from '../service/MediaQueueService';
import General from './General';

class IssueUploadUtil {
    static uploadIssueInfo(context, I18n, avniError, callerName, onStartUpload, onEndUpload, username = null) {
        if (avniError && avniError.reportingText) {
            General.logDebug(callerName || "IssueUploadUtil", avniError.reportingText);
            Clipboard.setString(avniError.reportingText);
            ToastAndroid.show(I18n.t('reportCopiedReportByPasting'), ToastAndroid.SHORT);
        }
        
        if (onStartUpload) onStartUpload();
        
        const backupRestoreService = context.getService(BackupRestoreRealmService);
        
        backupRestoreService.backup(MediaQueueService.DumpType.Adhoc, (percentDone, message) => {
            General.logDebug("IssueUploadUtil", `${percentDone}% - ${message}`);
            if (percentDone === 100) {
                if (message === "backupFailed") {
                    ToastAndroid.show(I18n.t('uploadFailed'), ToastAndroid.LONG);
                } else {
                    ToastAndroid.show(I18n.t('uploadSuccessful'), ToastAndroid.LONG);
                }
                if (onEndUpload) onEndUpload();
            }
        }, username); // Pass username to backup service
    }

    static createUploadIssueInfoButton(context, I18n, avniError, callerName, onStartUpload, onEndUpload, username = null) {
        return {
            text: I18n.t('uploadIssueInfo'),
            onPress: () => IssueUploadUtil.uploadIssueInfo(context, I18n, avniError, callerName, onStartUpload, onEndUpload, username)
        };
    }
}

export default IssueUploadUtil;
