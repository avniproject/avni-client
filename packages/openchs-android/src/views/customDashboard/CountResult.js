import React from 'react';
import {Text, View} from "react-native";
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';

export const CountResult = ({primary, secondary, primaryStyle, secondaryStyle, direction, clickable, chevronColor, colour}) => {
    return (
        <View style={{flex: 1, flexDirection: direction, alignItems: 'center', justifyContent: 'center'}}>
            <Text style={primaryStyle}>{primary}</Text>
            {secondary ?
                <Text style={[secondaryStyle, direction === 'row' ? {marginLeft: 8} : {}]}>
                    {secondary}
                </Text> :
                null}

          <View style={{position: 'absolute', right: 0, bottom: 0, height: 20, width: 20, backgroundColor: chevronColor,
            borderTopLeftRadius: 4, borderBottomRightRadius: 4,}}>
              {clickable &&
                <MCIcon name={'chevron-right'} size={20} color={colour} style={{opacity: 0.8}}/>}
          </View>
        </View>
    )
};
