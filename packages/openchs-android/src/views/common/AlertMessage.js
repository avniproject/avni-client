import {Alert} from "react-native";
import _ from 'lodash';

export const AlertMessage = (title, message, onPress = _.noop) => {
    const displayMessage = typeof message === "string" ? message : JSON.stringify(message);
    Alert.alert(
        title,
        displayMessage,
        [
            {text: 'OK', onPress: onPress}
        ],
        {cancelable: false}
    );
};
