import {Image, TouchableNativeFeedback, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import MediaService from "../../service/MediaService";
import _, {isEmpty} from 'lodash';
import AvniModel from "./AvniModel";

class SubjectProfilePicture extends AbstractComponent {
    static propTypes = {
        size: PropTypes.number.isRequired,
        subjectType: PropTypes.object.isRequired,
        round: PropTypes.bool,
        style: PropTypes.object,
        individual: PropTypes.object,
        allowEnlargementOnClick: PropTypes.bool,
        containerStyle: PropTypes.object,
    };

    static defaultProps = {
        round: false,
        allowEnlargementOnClick: false,
        containerStyle: {}
    };

    constructor(props, context) {
        super(props, context);
        this.state = {loadProfilePic: false, expandIcon: false};
        this.props.size = (Math.pow(2, 0.5) * this.props.size);
    }

    UNSAFE_componentWillMount() {
        const isProfilePictureAllowed = this.props.subjectType.allowProfilePicture;
        const isSubjectProfileIconSetup = isProfilePictureAllowed && !isEmpty(this.props.individual.profilePicture);
        isSubjectProfileIconSetup && this.getService(MediaService)
            .downloadFileIfRequired(this.props.individual.profilePicture, 'Profile-Pics')
            .then(url => this.setState({loadProfilePic: true}));
        return super.UNSAFE_componentWillMount();
    }

    renderDefaultIcon({subjectType, size, style, round}) {
        const defaultIconFileName = `${_.toLower(subjectType.type)}.png`;
        return <Image source={{uri: `asset:/icons/${defaultIconFileName}`}}
                      style={{height: size, width: size, borderRadius: round ? size / 2 : 0, ...style}}/>
    }

    renderIcon({subjectType, size, style, round, individual}) {
        const filePath = this.state.loadProfilePic
            ? this.getService(MediaService).getAbsolutePath(individual.profilePicture, 'Profile-Pics')
            : this.getService(MediaService).getAbsolutePath(subjectType.iconFileS3Key, 'Icons');
        return <Image source={{uri: `file://${filePath}`}}
                      style={{height: size, width: size, borderRadius: round ? size / 2 : 0, ...style}}/>
    }

    onIconTouch(expand = false) {
        this.setState({expandIcon: expand})
    }

    renderImage({round, size}) {
        const iconConfig = {...this.props, round, size};
        const loadDefaultIcon = !(this.props.subjectType.iconFileS3Key || this.state.loadProfilePic);
        return <View style={{
            height: size,
            width: size,
            borderRadius: round ? size / 2 : 0,
            backgroundColor: '#FFF',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {loadDefaultIcon ? this.renderDefaultIcon(iconConfig) : this.renderIcon(iconConfig)}
        </View>
    }

    render() {
        return (
            <React.Fragment>
                <AvniModel dismiss={() => this.onIconTouch()} visible={this.state.expandIcon}>
                    {this.renderImage({round: false, size: 250})}
                </AvniModel>
                <TouchableNativeFeedback
                    pointerEvents={"none"}
                    onPress={() => this.onIconTouch(true)}>
                    <View style={this.props.containerStyle}>
                        {this.renderImage(this.props)}
                    </View>
                </TouchableNativeFeedback>
            </React.Fragment>
        )
    }
}

export default SubjectProfilePicture;
