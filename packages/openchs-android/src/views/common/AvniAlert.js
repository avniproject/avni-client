import React from "react";
import {Alert} from "react-native";
import {firebaseEvents, logEvent} from "../../utility/Analytics";


export const AvniAlert = (title, message, onYesPress, I18n, skipEvent) => {
    Alert.alert(title, message, [
        {
            text: I18n.t('yes'), onPress: () => {
                if (!skipEvent) {
                    logEvent(firebaseEvents.ABORT_FORM);
                }
                onYesPress();
            }
        },
        {
            text: I18n.t('no'), onPress: () => {
            },
            style: 'cancel'
        }
    ])
};

