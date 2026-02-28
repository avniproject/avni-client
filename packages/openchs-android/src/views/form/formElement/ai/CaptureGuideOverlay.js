// @flow
import React from "react";
import {StyleSheet, View, Dimensions} from "react-native";
import {Text} from "native-base";
import PropTypes from "prop-types";
import AbstractComponent from "../../../../framework/view/AbstractComponent";
import Colors from "../../../primitives/Colors";
import Styles from "../../../primitives/Styles";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import _ from "lodash";

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

/**
 * CaptureGuideOverlay - Base overlay component for guided media capture.
 * Provides visual guides, instructions, and feedback to help field workers
 * capture appropriate media for AI analysis.
 */
class CaptureGuideOverlay extends AbstractComponent {
    static propTypes = {
        guideType: PropTypes.oneOf(['conjunctiva', 'wound', 'generic']).isRequired,
        isActive: PropTypes.bool,
        qualityFeedback: PropTypes.object,
        instructions: PropTypes.arrayOf(PropTypes.string),
        onDismiss: PropTypes.func,
        children: PropTypes.node,
    };

    static defaultProps = {
        isActive: true,
        qualityFeedback: null,
        instructions: [],
    };

    constructor(props, context) {
        super(props, context);
        this.state = {
            showInstructions: true,
        };
    }

    getGuideConfig() {
        switch (this.props.guideType) {
            case 'conjunctiva':
                return {
                    title: 'eyeCaptureGuide',
                    icon: 'eye-outline',
                    borderColor: '#4CAF50',
                    overlayShape: 'oval',
                };
            case 'wound':
                return {
                    title: 'woundCaptureGuide',
                    icon: 'bandage',
                    borderColor: '#FF9800',
                    overlayShape: 'rectangle',
                };
            default:
                return {
                    title: 'captureGuide',
                    icon: 'camera',
                    borderColor: Colors.ActionButtonColor,
                    overlayShape: 'rectangle',
                };
        }
    }

    renderGuideFrame() {
        const config = this.getGuideConfig();
        const isOval = config.overlayShape === 'oval';
        const frameWidth = SCREEN_WIDTH * 0.7;
        const frameHeight = isOval ? frameWidth * 0.6 : frameWidth * 0.75;

        return (
            <View style={[styles.guideFrame, {
                width: frameWidth,
                height: frameHeight,
                borderRadius: isOval ? frameHeight / 2 : 8,
                borderColor: config.borderColor,
            }]}>
                {this.renderCornerMarkers(config.borderColor)}
            </View>
        );
    }

    renderCornerMarkers(color) {
        const markerStyle = {position: 'absolute', width: 20, height: 20, borderColor: color};
        return (
            <>
                <View style={[markerStyle, {top: -2, left: -2, borderTopWidth: 3, borderLeftWidth: 3}]}/>
                <View style={[markerStyle, {top: -2, right: -2, borderTopWidth: 3, borderRightWidth: 3}]}/>
                <View style={[markerStyle, {bottom: -2, left: -2, borderBottomWidth: 3, borderLeftWidth: 3}]}/>
                <View style={[markerStyle, {bottom: -2, right: -2, borderBottomWidth: 3, borderRightWidth: 3}]}/>
            </>
        );
    }

    renderTitle() {
        const config = this.getGuideConfig();
        return (
            <View style={styles.titleContainer}>
                <Icon name={config.icon} style={styles.titleIcon}/>
                <Text style={styles.titleText}>{this.I18n.t(config.title)}</Text>
            </View>
        );
    }

    renderInstructions() {
        const instructions = this.props.instructions;
        if (_.isEmpty(instructions) || !this.state.showInstructions) return null;

        return (
            <View style={styles.instructionsContainer}>
                {instructions.map((instruction, index) => (
                    <View key={index} style={styles.instructionRow}>
                        <Text style={styles.instructionBullet}>{`${index + 1}.`}</Text>
                        <Text style={styles.instructionText}>{this.I18n.t(instruction)}</Text>
                    </View>
                ))}
            </View>
        );
    }

    renderQualityFeedback() {
        const {qualityFeedback} = this.props;
        if (!qualityFeedback) return null;

        const feedbackColor = qualityFeedback.isGood ? '#4CAF50' : '#F44336';
        const feedbackIcon = qualityFeedback.isGood ? 'check-circle' : 'alert-circle';

        return (
            <View style={[styles.feedbackContainer, {borderLeftColor: feedbackColor}]}>
                <Icon name={feedbackIcon} style={[styles.feedbackIcon, {color: feedbackColor}]}/>
                <Text style={styles.feedbackText}>{qualityFeedback.message}</Text>
            </View>
        );
    }

    render() {
        if (!this.props.isActive) return this.props.children || null;

        return (
            <View style={styles.container}>
                {this.renderTitle()}
                <View style={styles.guideArea}>
                    {this.renderGuideFrame()}
                </View>
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
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 8,
        marginBottom: 16,
    },
    titleIcon: {
        color: '#FFFFFF',
        fontSize: 22,
        marginRight: 8,
    },
    titleText: {
        color: '#FFFFFF',
        fontSize: Styles.normalTextSize,
        fontWeight: '600',
    },
    guideArea: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 16,
    },
    guideFrame: {
        borderWidth: 2,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    instructionsContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 8,
        padding: 12,
        marginHorizontal: 16,
        marginTop: 12,
    },
    instructionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    instructionBullet: {
        color: '#FFFFFF',
        fontSize: Styles.smallerTextSize,
        fontWeight: '600',
        marginRight: 8,
        width: 16,
    },
    instructionText: {
        color: '#FFFFFF',
        fontSize: Styles.smallerTextSize,
        flex: 1,
    },
    feedbackContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 8,
        borderLeftWidth: 4,
        padding: 10,
        marginHorizontal: 16,
        marginTop: 12,
    },
    feedbackIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    feedbackText: {
        color: '#FFFFFF',
        fontSize: Styles.smallerTextSize,
        flex: 1,
    },
});

export default CaptureGuideOverlay;
