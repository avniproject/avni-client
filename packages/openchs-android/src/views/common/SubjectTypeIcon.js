import {Image, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import PropTypes from "prop-types";
import MediaService from "../../service/MediaService";
import _ from 'lodash';

class SubjectTypeIcon extends AbstractComponent {
    static propTypes = {
        size: PropTypes.number.isRequired,
        subjectType: PropTypes.object.isRequired,
        round: PropTypes.bool,
        style: PropTypes.object,
        individual: PropTypes.object
    };

    static defaultProps = {
        round: false
    };

    constructor(props, context) {
        super(props, context);
    }

    getAgeSuffix(age) {
        return age <= 10 ? 'child' : 'adult';
    }

    getDefaultPersonIconName(individual) {
        const ageInYears = individual.getAgeInYears();
        const gender = _.toLower(individual.gender.name);
        if (ageInYears < 1) {
            return 'person_baby.png';
        }
        if (gender === 'other') {
            return 'person.png';
        } else {
            return `person_${this.getAgeSuffix(ageInYears)}_${gender}.png`
        }
    }

    getDefaultIconName(subjectType, individual) {
        return subjectType.isPerson() && !_.isNil(individual) ? this.getDefaultPersonIconName(individual) : `${_.toLower(subjectType.type)}.png`;
    }

    renderDefaultIcon({subjectType, size, style}) {
        const defaultIconFileName = this.getDefaultIconName(subjectType, this.props.individual);
        return <Image source={{uri: `asset:/icons/${defaultIconFileName}`}}
                      style={{height: size, width: size, ...style}}/>
    }

    renderIcon({subjectType, size, style}) {
        const filePath = this.getService(MediaService).getAbsolutePath(subjectType.iconFileS3Key, 'Icons');
        return <Image source={{uri: `file://${filePath}`}} style={{height: size, width: size, ...style}}/>
    }

    render() {
        const {subjectType, round, size} = this.props;
        const containerSize = (Math.pow(2, 0.5) * size);
        return (
            <View style={{
                height: containerSize,
                width: containerSize,
                borderRadius: round ? containerSize / 2 : 0,
                backgroundColor: '#FFF',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {subjectType.isIconSetup() ? this.renderIcon(this.props) : this.renderDefaultIcon(this.props)}
            </View>
        )
    }

}

export default SubjectTypeIcon;
