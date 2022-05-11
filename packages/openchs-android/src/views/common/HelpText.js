import React, {useState} from 'react';
import _ from 'lodash';
import Styles from "../primitives/Styles";
import {Text} from "native-base";
import {Alert, TouchableNativeFeedback} from "react-native";

export const HelpText = ({text, t}) => {

    const [showModal, setShowModal] = useState(false);

    if (showModal) {
        Alert.alert(
            "",
            text,
            [],
            {onDismiss: () => setShowModal(false)}
        )
    }

    const renderText = () => (
        <TouchableNativeFeedback onPress={() => setShowModal(true)}>
            <Text style={Styles.helpText} numberOfLines={2}>{t(text)}</Text>
        </TouchableNativeFeedback>
    );

    return _.isEmpty(text) ? null : renderText()
};
