import AbstractComponent from "../../framework/view/AbstractComponent";
import {StyleSheet, Text, View} from 'react-native';
import React from 'react';
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";

class EntitySyncStatusCell extends AbstractComponent {
    constructor(props, context) {
        super(props, context);
    }

    static propTypes = {
        style: View.propTypes.style,
        textStyle: Text.propTypes.style,
        borderStyle: View.propTypes.style
    };

    render() {
        const { data, width, height, flex, style, textStyle, borderStyle}= this.props;
        const borderTopWidth = borderStyle && borderStyle.borderWidth || 1;
        const borderRightWidth = borderTopWidth;
        const borderColor = borderStyle && borderStyle.borderColor || '#000';
        return (<View style={[
            defaultStyles.vewStyle,
            style,
            {
                borderTopWidth,
                borderRightWidth,
                borderColor,
            },
            width && { width },
            height && { height },
            flex && { flex },
            ]}>
            <Text style={[defaultStyles.textStyle, textStyle]}>{data}</Text>
        </View>);
    }
}

const defaultStyles = StyleSheet.create({
    vewStyle: {
        justifyContent: 'center',
        height: 40,
        flex: 1
    },
    textStyle: {
        color: Colors.InputNormal,
        fontSize: Fonts.Medium,
        textAlign: 'center'
    }
});

export default EntitySyncStatusCell;