import React, {useState} from "react";
import {TextInput} from "react-native";
import Clipboard from "@react-native-clipboard/clipboard";
import _ from "lodash";

export const SecureTextInput = (props) => {
    const [inputTextSelection, setInputTextSelection] = useState({ start: 0, end: 0 });
    const onSelectionChange = ({ nativeEvent: { selection } }) => {
        setInputTextSelection({ start: selection.end, end: selection.end } );
    };

    const clearClipboard = async () => {
        const clipboardText = await Clipboard.getString()
        if (!_.isEmpty(clipboardText)) {
            Clipboard.setString('');
        }
    }

    return (
        <TextInput
            {...props}
            contextMenuHidden={true}
            onFocus={() => clearClipboard()}
            onBlur={() => clearClipboard()}
            onPressIn={() => clearClipboard()}
            onSelectionChange={onSelectionChange}
            selection={inputTextSelection}
            keyboardType={props.secureTextEntry ? 'default' : 'visible-password'}   // hides additional options like clipboard when password is shown (on some devices)
            autoCapitalize={'none'}
        />
    )
}