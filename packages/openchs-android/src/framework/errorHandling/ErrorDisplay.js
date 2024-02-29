import Config from "../Config";
import {Alert, Clipboard, ToastAndroid, View} from "react-native";
import React from 'react';
import RNRestart from "react-native-restart";
import {JSONStringify} from "../../utility/JsonStringify";

export function ErrorDisplay({avniError}) {
    console.log("ErrorDisplay", "render", Config.allowServerURLConfig);
    if (!Config.allowServerURLConfig) {
        Alert.alert("App will restart now", avniError.getDisplayMessage(),
            [
                {
                    text: "copyErrorAndRestart",
                    onPress: () => {
                        console.log("ErrorDisplay", JSONStringify(avniError));
                        Clipboard.setString(avniError.reportingText);
                        RNRestart.Restart();
                    }
                },
                {
                    text: "restart",
                    onPress: () => RNRestart.Restart()
                }
            ],
            {cancelable: true}
        );
    }
    return <View/>;
}
