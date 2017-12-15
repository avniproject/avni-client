import React from 'react';
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Picker} from "react-native";

class Filter extends AbstractComponent {
    render() {
        return (
            <Picker
                selectedValue={"All Programs"}
                onValueChange={(itemValue) => itemValue}>
                <Picker.Item label="Mother" value="mother"/>
                <Picker.Item label="Child" value="child"/>
                <Picker.Item label="Adolescent" value="adolescent"/>
            </Picker>
        );
    }
}

export default Filter;