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
            onFocus={() => {
                General.clearClipboard();
            }}
            onBlur={() => {
                General.clearClipboard();
            }}
            onSelectionChange={onSelectionChange}
            selection={inputTextSelection}
        />
    )
}