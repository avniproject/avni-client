import React, {useState} from "react";
import {TextInput} from "react-native";
import General from "../../utility/General";

export const SecureTextInput = (props) => {
    const [inputTextSelection, setInputTextSelection] = useState({ start: 0, end: 0 });
    const onSelectionChange = ({ nativeEvent: { selection } }) => {
        setInputTextSelection({ start: selection.end, end: selection.end } );
    };

    return (
        <TextInput
            {...props}
            contextMenuHidden={true}
            onFocus={() => General.clearClipboard()}
            onBlur={() => General.clearClipboard()}
            onPressIn={() => General.clearClipboard()}
            onSelectionChange={onSelectionChange}
            selection={inputTextSelection}
            keyboardType={props.secureTextEntry ? 'default' : 'visible-password'}   // hides additional options like clipboard when password is shown (on some devices)
            autoCapitalize={'none'}
        />
    )
}