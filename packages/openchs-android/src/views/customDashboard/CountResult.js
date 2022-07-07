import React from 'react';
import {Text, View} from "react-native";

export const CountResult = ({primary, secondary, primaryStyle, secondaryStyle, direction}) => {
    return (
        <View style={{flex: 1, flexDirection: direction, alignItems: 'center', justifyContent: 'center'}}>
            <Text style={primaryStyle}>{primary}</Text>
            {secondary ?
                <Text style={[secondaryStyle, direction === 'row' ? {marginLeft: 8} : {}]}>
                    {secondary}
                </Text> :
                null}
        </View>
    )
};
