import {Image, TouchableNativeFeedback, View, Text} from 'react-native';
import React from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import PropTypes from 'prop-types';
import MediaService from '../../service/MediaService';
import _, {isEmpty} from 'lodash';
import AvniModel from './AvniModel';
import Colors from '../primitives/Colors';

function Initials({name = '', size = 56, round = false}) {
    const initials = name && name.split(' ').map(n => n && n[0].toUpperCase()).join('').substring(0, 2);
    return <View style={{
        backgroundColor: Colors.BrandPrimary,
        borderRadius: round ? size / 2 : 8,
        height: size,
        width: size,
        justifyContent: 'center',
        alignItems: 'center'
    }}>
        <Text style={{
            color: Colors.TextOnPrimaryColor,
            fontWeight: '400',
            fontSize: Math.max(12, Math.round(size * 0.35)),
        }}>{initials}</Text>
    </View>;
}

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
            .then(url => this.setState({loadProfilePic: true}))
            .catch(error => {
                  console.error('Error loading Profile-Pic:', error);
            });
        return super.UNSAFE_componentWillMount();
    }

    renderIcon({subjectType, size, style, round, individual}) {
        const filePath = this.state.loadProfilePic
            ? this.getService(MediaService).getAbsolutePath(individual.profilePicture, 'Profile-Pics')
            : this.getService(MediaService).getAbsolutePath(subjectType.iconFileS3Key, 'Icons');
        return <Image source={{uri: `file://${filePath}`}}
                      style={{height: size, width: size, borderRadius: round ? size / 2 : 0, ...style}}/>;
    }

    onIconTouch(expand = false) {
        this.setState({expandIcon: expand});
    }

    renderImage({round, size, individual}) {
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
            {loadDefaultIcon ? <Initials name={individual.nameString} size={size} round={round}/> : this.renderIcon(iconConfig)}
        </View>;
    }

    render() {
        const {containerStyle, individual} = this.props;

        return (
            <View style={containerStyle}>
                <AvniModel dismiss={() => this.onIconTouch()} visible={this.state.expandIcon}>
                    {this.renderImage({round: this.props.round, size: 250, individual: individual})}
                </AvniModel>
                <TouchableNativeFeedback
                    pointerEvents={'none'}
                    onPress={() => this.onIconTouch(true)}>
                    <View>
                        {this.renderImage(this.props)}
                    </View>
                </TouchableNativeFeedback>
            </View>
        );
    }
}

export default SubjectProfilePicture;
