import {ToastAndroid} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import BackupRestoreRealmService from '../service/BackupRestoreRealmService';
import MediaQueueService from '../service/MediaQueueService';
import General from './General';

class IssueUploadUtil {
    static uploadIssueInfo(context, I18n, avniError, callerName, onStartUpload, onEndUpload) {
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
                if (onEndUpload) onEndUpload();
                if (message === "backupCompleted") {
                    ToastAndroid.show(I18n.t('uploadSuccessful'), ToastAndroid.LONG);
                } else {
                    ToastAndroid.show(I18n.t('uploadFailed'), ToastAndroid.LONG);
                }
            }
        });
    }

    static createUploadIssueInfoButton(context, I18n, avniError, callerName, onStartUpload, onEndUpload) {
        return {
            text: I18n.t('uploadIssueInfo'),
            onPress: () => IssueUploadUtil.uploadIssueInfo(context, I18n, avniError, callerName, onStartUpload, onEndUpload)
        };
    }
}

export default IssueUploadUtil;
