import {Image, View} from "react-native";
import React from "react";
import {Icon} from "native-base";
import Colors from "../primitives/Colors";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import MediaService from "../../service/MediaService";

class SubjectTypeIcon extends AbstractComponent {
    static propTypes = {
        size: PropTypes.number.isRequired,
        subjectType: PropTypes.object.isRequired,
        round: PropTypes.bool,
        style: PropTypes.object
    };

    static defaultProps = {
        round: false
    };

    constructor(props, context) {
        super(props, context);
    }

    renderDefaultIcon(subjectType, size, style) {
        return <Icon {...subjectType.icon()} style={{color: Colors.AccentColor, fontSize: size, ...style}}/>
    }

    renderIcon(subjectType, round, size, style) {
        const containerSize = (Math.pow(2, 0.5) * size);
        const filePath = this.getService(MediaService).getAbsolutePath(subjectType.iconFileS3Key, 'Icons');
        return <View style={{
            height: containerSize,
            width: containerSize,
            borderRadius: round ? containerSize / 2 : 0,
            backgroundColor: '#FFF',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <Image source={{uri: `file://${filePath}`}} style={{height: size, width: size, ...style}}/>
        </View>
    }

    render() {
        const {subjectType, round, size, style} = this.props;
        return subjectType.isIconSetup() ? this.renderIcon(subjectType, round, size, style) : this.renderDefaultIcon(subjectType, size, style);
    }

}

export default SubjectTypeIcon;
