import React from "react";
import {Alert} from "react-native";


export const AvniAlert = (title, message, onYesPress, I18n) => {
    Alert.alert(title, message, [
        {
            text: I18n.t('yes'), onPress: onYesPress
        },
        {
            text: I18n.t('no'), onPress: () => {
            },
            style: 'cancel'
        }
    ])
};

