import React from 'react';
import MCIcon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../primitives/Colors";
import {Badge} from "./Badge";
import {TouchableOpacity} from "react-native";

export const MessageIcon = ({messageCount, onPress}) => {

    const Icon = () =>
        <MCIcon name={'message-text-outline'} size={30} style={{
            color: Colors.headerIconColor,
            alignSelf: 'center',
            fontSize: 25
        }}/>;

    return (
        <TouchableOpacity onPress={onPress}>
            <Badge
                number={messageCount || 0}
                component={<Icon/>}
                badgeLeftPosition={-7}
                badgeTopPosition={-3}/>
        </TouchableOpacity>
    )
};
