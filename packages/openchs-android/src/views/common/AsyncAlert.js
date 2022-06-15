import {Alert} from "react-native";

const AsyncAlert = (title, message, I18n) => {
    return new Promise((resolve, reject) => {
        Alert.alert(
            I18n.t(title),
            I18n.t(message),
            [
                {text: I18n.t('Yes'), onPress: () => resolve('YES')},
                {text: I18n.t('No'), onPress: () => resolve('NO')}
            ],
            {cancelable: false}
        )
    })
};

export default AsyncAlert
