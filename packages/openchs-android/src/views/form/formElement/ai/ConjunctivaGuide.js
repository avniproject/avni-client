// @flow
import React from "react";
import {StyleSheet, View, Dimensions} from "react-native";
import {Text} from "native-base";
import PropTypes from "prop-types";
import CaptureGuideOverlay from "./CaptureGuideOverlay";
import Colors from "../../../primitives/Colors";
import Styles from "../../../primitives/Styles";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const CONJUNCTIVA_INSTRUCTIONS = [
    'pullDownLowerEyelid',
    'holdSteadyAndLookUp',
    'ensureGoodLighting',
    'alignEyeWithinOval',
];

/**
 * ConjunctivaGuide - Specialized capture guide for conjunctiva imaging.
 * Provides an oval guide frame sized for eye region capture,
 * along with specific instructions for pulling down the lower eyelid
 * and positioning the eye for anemia screening.
 */
class ConjunctivaGuide extends CaptureGuideOverlay {
    static propTypes = {
        ...CaptureGuideOverlay.propTypes,
        eyeDetectionStatus: PropTypes.oneOf(['none', 'detecting', 'detected', 'not_found']),
        detectedRegion: PropTypes.object,
    };

    static defaultProps = {
        ...CaptureGuideOverlay.defaultProps,
        guideType: 'conjunctiva',
        instructions: CONJUNCTIVA_INSTRUCTIONS,
        eyeDetectionStatus: 'none',
        detectedRegion: null,
    };

    constructor(props, context) {
        super(props, context);
    }

    renderEyeGuide() {
        const ovalWidth = SCREEN_WIDTH * 0.55;
        const ovalHeight = ovalWidth * 0.5;

        return (
            <View style={styles.eyeGuideContainer}>
                <View style={[styles.eyeOval, {
                    width: ovalWidth,
                    height: ovalHeight,
                    borderRadius: ovalHeight / 2,
                }]}>
                    <Icon name="eye-outline" style={styles.eyeIcon}/>
                    <Text style={styles.eyeGuideText}>{this.I18n.t('positionEyeHere')}</Text>
                </View>
                {this.renderEyelidIndicator(ovalWidth, ovalHeight)}
            </View>
        );
    }

    renderEyelidIndicator(ovalWidth, ovalHeight) {
        return (
            <View style={[styles.eyelidIndicator, {
                width: ovalWidth * 0.8,
                top: ovalHeight * 0.7,
            }]}>
                <View style={styles.eyelidArrow}>
                    <Icon name="arrow-down" style={styles.eyelidArrowIcon}/>
                </View>
                <Text style={styles.eyelidText}>{this.I18n.t('pullDownHere')}</Text>
            </View>
        );
    }

    renderDetectionStatus() {
        const {eyeDetectionStatus} = this.props;
        if (eyeDetectionStatus === 'none') return null;

        let statusIcon, statusColor, statusMessage;
        switch (eyeDetectionStatus) {
            case 'detecting':
                statusIcon = 'eye-circle-outline';
                statusColor = '#FF9800';
                statusMessage = 'detectingEye';
                break;
            case 'detected':
                statusIcon = 'eye-check';
                statusColor = '#4CAF50';
                statusMessage = 'eyeDetected';
                break;
            case 'not_found':
                statusIcon = 'eye-off';
                statusColor = '#F44336';
                statusMessage = 'eyeNotFound';
                break;
            default:
                return null;
        }

        return (
            <View style={[styles.detectionStatus, {borderColor: statusColor}]}>
                <Icon name={statusIcon} style={[styles.detectionIcon, {color: statusColor}]}/>
                <Text style={[styles.detectionText, {color: statusColor}]}>
                    {this.I18n.t(statusMessage)}
                </Text>
            </View>
        );
    }

    renderDetectedRegion() {
        const {detectedRegion} = this.props;
        if (!detectedRegion) return null;

        return (
            <View style={[styles.detectedRegionOverlay, {
                left: detectedRegion.x,
                top: detectedRegion.y,
                width: detectedRegion.width,
                height: detectedRegion.height,
            }]}/>
        );
    }

    render() {
        if (!this.props.isActive) return this.props.children || null;

        return (
            <View style={styles.container}>
                {this.renderTitle()}
                <View style={styles.guideArea}>
                    {this.renderEyeGuide()}
                    {this.renderDetectedRegion()}
                </View>
                {this.renderDetectionStatus()}
                {this.renderInstructions()}
                {this.renderQualityFeedback()}
                {this.props.children}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
    },
    guideArea: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 16,
    },
    eyeGuideContainer: {
        alignItems: 'center',
    },
    eyeOval: {
        borderWidth: 2,
        borderColor: '#4CAF50',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    eyeIcon: {
        color: 'rgba(76, 175, 80, 0.6)',
        fontSize: 36,
    },
    eyeGuideText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: Styles.smallerTextSize,
        marginTop: 4,
    },
    eyelidIndicator: {
        alignItems: 'center',
        position: 'absolute',
    },
    eyelidArrow: {
        marginBottom: 2,
    },
    eyelidArrowIcon: {
        color: '#FF9800',
        fontSize: 20,
    },
    eyelidText: {
        color: '#FF9800',
        fontSize: Styles.smallerTextSize,
        fontWeight: '600',
    },
    detectionStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 16,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginTop: 8,
    },
    detectionIcon: {
        fontSize: 18,
        marginRight: 6,
    },
    detectionText: {
        fontSize: Styles.smallerTextSize,
        fontWeight: '500',
    },
    detectedRegionOverlay: {
        position: 'absolute',
        borderWidth: 2,
        borderColor: '#4CAF50',
        borderRadius: 4,
    },
});

export default ConjunctivaGuide;
