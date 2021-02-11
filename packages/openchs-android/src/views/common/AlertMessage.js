import React from "react";
import {Alert} from "react-native";
import _ from 'lodash';

export const AlertMessage = (title, message) => {
    const displayMessage = typeof message === "string" ? message : JSON.stringify(message);
    Alert.alert(
        title,
        displayMessage,
        [
            {text: 'OK', onPress: _.noop}
        ],
        {cancelable: false}
    );
};
