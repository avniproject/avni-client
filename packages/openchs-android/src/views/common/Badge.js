import {Text, View} from "react-native";
import Colors from "../primitives/Colors";
import React from 'react';

export const Badge = ({number, component, badgeTopPosition, badgeLeftPosition, hideWhenZero}) => {
    const showNumber = !(hideWhenZero && number === 0);
    const [height, width, fontSize, paddingLeft] = number > 99 ? [17, 17, 9, 0] : [17, 17, 11, 6];
    return (
        <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
            <View style={{marginTop: 5}}>
                {component}
            </View>
            {showNumber &&
            <View style={{
                height,
                width,
                top: badgeTopPosition || 1,
                left: badgeLeftPosition || 2,
                backgroundColor: Colors.BadgeColor,
                borderRadius: 14,
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <Text style={{
                    fontSize,
                    color: 'white',
                    textAlignVertical: 'center',
                    textAlign: 'center'
                }}>{number}</Text>
            </View>}
        </View>
    );
};
