import Config from "../Config";
import {Alert, View, ToastAndroid} from "react-native";
import React from 'react';
import RNRestart from "react-native-restart";
import {JSONStringify} from "../../utility/JsonStringify";
import Clipboard from "@react-native-clipboard/clipboard";
import _ from "lodash";
import BackupRestoreRealmService from "../../service/BackupRestoreRealmService";
import MediaQueueService from "../../service/MediaQueueService";
import General from "../../utility/General";

export function ErrorDisplay({avniError, context}) {
    console.log("ErrorDisplay", "render", Config.allowServerURLConfig);
    if (!Config.allowServerURLConfig) {
        const uploadIssueInfo = () => {
            console.log("ErrorDisplay", JSONStringify(avniError));
            Clipboard.setString(avniError.reportingText);
            
            if (context) {
                const backupRestoreService = context.getService(BackupRestoreRealmService);
                backupRestoreService.backup(MediaQueueService.DumpType.Adhoc, (percentDone, message) => {
                    General.logDebug("ErrorDisplay", `${percentDone}% - ${message}`);
                    if (percentDone === 100) {
                        if (message === "backupCompleted") {
                            ToastAndroid.show("Upload successful", ToastAndroid.LONG);
                        } else {
                            ToastAndroid.show("Upload failed", ToastAndroid.LONG);
                        }
                        RNRestart.Restart();
                    }
                });
            } else {
                ToastAndroid.show("Upload not available", ToastAndroid.SHORT);
                RNRestart.Restart();
            }
        };

        const buttons = [
            {
                text: "uploadIssueInfo",
                onPress: uploadIssueInfo
            },
            {
                text: "restart",
                onPress: () => RNRestart.Restart()
            },
            {text: "close", onPress: _.noop}
        ];
        Alert.alert("App will restart now", avniError.getDisplayMessage(),
            buttons,
            {cancelable: true}
        );
    }
    return <View/>;
}
