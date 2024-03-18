import Config from "../Config";
import {Alert, View} from "react-native";
import React from 'react';
import RNRestart from "react-native-restart";
import {JSONStringify} from "../../utility/JsonStringify";
import Clipboard from "@react-native-clipboard/clipboard";
import _ from "lodash";

export function ErrorDisplay({avniError}) {
    console.log("ErrorDisplay", "render", Config.allowServerURLConfig);
    if (!Config.allowServerURLConfig) {
        const buttons = [
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
