import {Image} from "react-native";
import React from "react";
import {Icon} from "native-base";
import Colors from "../primitives/Colors";

export const SubjectTypeIcon = ({individual, size, style, mediaService}) => {

    const renderDefaultIcon = () => {
        return <Icon {...individual.icon()} style={{color: Colors.AccentColor, fontSize: size, ...style}}/>
    };

    const renderIcon = () => {
        const filePath = mediaService.getAbsolutePath(individual.subjectType.iconFileS3Key, 'Icons');
        return <Image source={{uri: `file://${filePath}`}} style={{height: size, width: size, ...style}}/>
    };

    return individual.isIconSetup() ? renderIcon() : renderDefaultIcon();

};
