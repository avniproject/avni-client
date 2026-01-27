import React from 'react';
import MCIcon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../primitives/Colors";
import {Badge} from "./Badge";
import {TouchableOpacity} from "react-native";
import Styles from "../primitives/Styles";

export const MessageIcon = ({messageCount, onPress}) => {

    const Icon = () =>
        <MCIcon name={'message-text-outline'} size={24} style={{
            color: Styles.accentColor,
            alignSelf: 'center',
            fontSize: 24,
        }}/>;

    return (
        <TouchableOpacity onPress={onPress}>
            <Badge
                hideWhenZero
                number={messageCount || 0}
                component={<Icon/>}
                badgeLeftPosition={-7}
                badgeTopPosition={-3}/>
        </TouchableOpacity>
    )
};
