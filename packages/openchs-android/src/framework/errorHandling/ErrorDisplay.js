import Config from "../Config";
import {Alert, View} from "react-native";
import React, {useState, useRef} from 'react';
import RNRestart from "react-native-restart";
import {JSONStringify} from "../../utility/JsonStringify";
import _ from "lodash";
import BackupRestoreRealmService from "../../service/BackupRestoreRealmService";
import MediaQueueService from "../../service/MediaQueueService";
import General from "../../utility/General";
import GlobalContext from "../../GlobalContext";
import ProgressBarView from "../../views/ProgressBarView";
import MessageService from "../../service/MessageService";

export function ErrorDisplay({avniError, context, username = null}) {
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadMessage, setUploadMessage] = useState("");
    
    // Lazy getter for I18n - initializes on first access
    const i18nRef = useRef(null);
    const getI18n = () => {
        if (!i18nRef.current) {
            const serviceContext = context || (GlobalContext.getInstance().isInitialised() ? GlobalContext.getInstance().beanRegistry : null);
            if (serviceContext) {
                try {
                    i18nRef.current = serviceContext.getService(MessageService).getI18n();
                } catch (e) {
                    General.logWarn("ErrorDisplay", `Could not get I18n: ${e.message}`);
                }
            }
        }
        return i18nRef.current;
    };
    
    console.log("ErrorDisplay", "render", Config.allowServerURLConfig);
    
    const uploadIssueInfo = () => {
        console.log("ErrorDisplay", JSONStringify(avniError));
        
        // Try to get context from prop first, fallback to GlobalContext singleton
        const serviceContext = context || (GlobalContext.getInstance().isInitialised() ? GlobalContext.getInstance().beanRegistry : null);
        
        if (serviceContext) {
            setIsUploading(true);
            const backupRestoreService = serviceContext.getService(BackupRestoreRealmService);
            // Pass username to avoid realm access during login flow when realm may be corrupted
            backupRestoreService.backup(MediaQueueService.DumpType.Adhoc, (percentDone, message) => {
                General.logDebug("ErrorDisplay", `${percentDone}% - ${message}`);
                setUploadProgress(percentDone);
                setUploadMessage(message);
                if (percentDone === 100) {
                    setIsUploading(false);
                    const i18n = getI18n();
                    if (message === "backupCompleted") {
                        const title = i18n ? i18n.t('uploadSuccessful') : 'Upload Successful';
                        Alert.alert(title, "", [
                            {text: 'OK', onPress: () => RNRestart.Restart()}
                        ]);
                    } else {
                        const title = i18n ? i18n.t('uploadFailed') : 'Upload Failed';
                        Alert.alert(title, "", [
                            {text: 'OK', onPress: () => RNRestart.Restart()}
                        ]);
                    }
                }
            }, username);
        } else {
            Alert.alert("Upload not available", "App not initialized. The app will restart.");
            RNRestart.Restart();
        }
    };

    const buttons = [
        {text: "Close", onPress: _.noop},
        {text: "Restart", onPress: () => RNRestart.Restart()},
        {text: "Upload & Restart", onPress: uploadIssueInfo}
    ];
    
    // Show alert only if not in server URL config mode and not already uploading
    if (!Config.allowServerURLConfig && !isUploading) {
        Alert.alert("App will restart now", avniError.getDisplayMessage(),
            buttons,
            {cancelable: true}
        );
    }
    
    return (
        <View>
            {isUploading && (
                <ProgressBarView 
                    onPress={_.noop} 
                    progress={uploadProgress / 100}
                    message={uploadMessage}
                    syncing={isUploading} 
                    notifyUserOnCompletion={false}
                />
            )}
        </View>
    );
}
