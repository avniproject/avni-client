import Config from "../Config";
import {Alert, View} from "react-native";
import React from 'react';
import RNRestart from "react-native-restart";
import {JSONStringify} from "../../utility/JsonStringify";
import Clipboard from "@react-native-clipboard/clipboard";
import _ from "lodash";
import BackupRestoreRealmService from "../../service/BackupRestoreRealmService";
import MediaQueueService from "../../service/MediaQueueService";
import General from "../../utility/General";
import GlobalContext from "../../GlobalContext";

export function ErrorDisplay({avniError, context}) {
    console.log("ErrorDisplay", "render", Config.allowServerURLConfig);
    if (!Config.allowServerURLConfig) {
        const uploadIssueInfo = () => {
            console.log("ErrorDisplay", JSONStringify(avniError));
            Clipboard.setString(avniError.reportingText);
            
            // Try to get context from prop first, fallback to GlobalContext singleton
            const serviceContext = context || (GlobalContext.getInstance().isInitialised() ? GlobalContext.getInstance().beanRegistry : null);
            
            if (serviceContext) {
                const backupRestoreService = serviceContext.getService(BackupRestoreRealmService);
                backupRestoreService.backup(MediaQueueService.DumpType.Adhoc, (percentDone, message) => {
                    General.logDebug("ErrorDisplay", `${percentDone}% - ${message}`);
                    if (percentDone === 100) {
                        if (message === "backupCompleted") {
                            Alert.alert("Upload successful");
                        } else {
                            Alert.alert("Upload failed");
                        }
                        RNRestart.Restart();
                    }
                });
            } else {
                Alert.alert("Upload not available - app not initialized");
                RNRestart.Restart();
            }
        };

        const buttons = [
            {text: "Close", onPress: _.noop},
            {text: "Restart", onPress: () => RNRestart.Restart()},
            {text: "Upload & Restart", onPress: uploadIssueInfo}
        ];
        Alert.alert("App will restart now", avniError.getDisplayMessage(),
            buttons,
            {cancelable: true}
        );
    }
    return <View/>;
}
