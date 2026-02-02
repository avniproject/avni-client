import {Text, View} from "react-native";
import Colors from "../primitives/Colors";
import React from 'react';
import _ from 'lodash';

export const Badge = ({number, component, badgeTopPosition, badgeLeftPosition, hideWhenZero}) => {
    const showNumber = !(hideWhenZero && number === 0);
    const [height, width, fontSize] = number > 99 ? [17, 17, 9] : [17, 17, 11];
    const useAbsolutePositioning = !_.isNil(badgeTopPosition) || !_.isNil(badgeLeftPosition);
    
    if (useAbsolutePositioning) {
        return (
            <View style={{position: 'relative'}}>
                <View>
                    {component}
                </View>
                {showNumber &&
                <View style={{
                    position: 'absolute',
                    height,
                    width,
                    top: badgeTopPosition || 0,
                    left: badgeLeftPosition || 0,
                    backgroundColor: Colors.BadgeColor,
                    borderRadius: 14,
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1
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
    }
    
    return (
        <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
            <View style={{marginTop: 5}}>
                {component}
            </View>
            {showNumber &&
            <View style={{
                height,
                width,
                marginLeft: 2,
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
