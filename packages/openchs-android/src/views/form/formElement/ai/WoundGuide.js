// @flow
import React from "react";
import {StyleSheet, View, Dimensions} from "react-native";
import {Text} from "native-base";
import PropTypes from "prop-types";
import CaptureGuideOverlay from "./CaptureGuideOverlay";
import Styles from "../../../primitives/Styles";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const WOUND_INSTRUCTIONS = [
    'cleanWoundAreaFirst',
    'ensureEvenLighting',
    'captureEntireWound',
    'includeRulerIfAvailable',
    'holdCameraSteady',
];

/**
 * WoundGuide - Specialized capture guide for wound imaging.
 * Provides a rectangular guide frame with measurement reference,
 * along with specific instructions for capturing wound images
 * suitable for severity assessment and healing tracking.
 */
class WoundGuide extends CaptureGuideOverlay {
    static propTypes = {
        ...CaptureGuideOverlay.propTypes,
        showRulerGuide: PropTypes.bool,
        woundSizeEstimate: PropTypes.object,
    };

    static defaultProps = {
        ...CaptureGuideOverlay.defaultProps,
        guideType: 'wound',
        instructions: WOUND_INSTRUCTIONS,
        showRulerGuide: true,
        woundSizeEstimate: null,
    };

    constructor(props, context) {
        super(props, context);
    }

    renderWoundFrame() {
        const frameWidth = SCREEN_WIDTH * 0.75;
        const frameHeight = frameWidth * 0.75;

        return (
            <View style={styles.woundFrameContainer}>
                <View style={[styles.woundFrame, {
                    width: frameWidth,
                    height: frameHeight,
                }]}>
                    <View style={styles.crosshairH}/>
                    <View style={styles.crosshairV}/>
                    <Icon name="bandage" style={styles.woundIcon}/>
                    <Text style={styles.woundGuideText}>{this.I18n.t('positionWoundHere')}</Text>
                </View>
                {this.props.showRulerGuide && this.renderRulerGuide(frameWidth)}
            </View>
        );
    }

    renderRulerGuide(frameWidth) {
        const tickCount = 5;
        const tickSpacing = frameWidth / tickCount;

        return (
            <View style={[styles.rulerContainer, {width: frameWidth}]}>
                <View style={styles.rulerLine}>
                    {Array.from({length: tickCount + 1}, (_, i) => (
                        <View key={i} style={[styles.rulerTick, {left: i * tickSpacing - 1}]}>
                            <View style={styles.rulerTickMark}/>
                            {i < tickCount && (
                                <Text style={styles.rulerLabel}>{`${i * 2}cm`}</Text>
                            )}
                        </View>
                    ))}
                </View>
                <Text style={styles.rulerHint}>{this.I18n.t('placeRulerForScale')}</Text>
            </View>
        );
    }

    renderSizeEstimate() {
        const {woundSizeEstimate} = this.props;
        if (!woundSizeEstimate) return null;

        return (
            <View style={styles.sizeEstimateContainer}>
                <Icon name="ruler" style={styles.sizeIcon}/>
                <Text style={styles.sizeText}>
                    {`${this.I18n.t('estimatedSize')}: ${woundSizeEstimate.width}cm x ${woundSizeEstimate.height}cm`}
                </Text>
            </View>
        );
    }

    renderColorReference() {
        return (
            <View style={styles.colorRefContainer}>
                <Text style={styles.colorRefTitle}>{this.I18n.t('tissueColorReference')}</Text>
                <View style={styles.colorSwatches}>
                    <View style={styles.swatchItem}>
                        <View style={[styles.colorSwatch, {backgroundColor: '#FF6B6B'}]}/>
                        <Text style={styles.swatchLabel}>{this.I18n.t('red')}</Text>
                    </View>
                    <View style={styles.swatchItem}>
                        <View style={[styles.colorSwatch, {backgroundColor: '#FFD93D'}]}/>
                        <Text style={styles.swatchLabel}>{this.I18n.t('yellow')}</Text>
                    </View>
                    <View style={styles.swatchItem}>
                        <View style={[styles.colorSwatch, {backgroundColor: '#2D2D2D'}]}/>
                        <Text style={styles.swatchLabel}>{this.I18n.t('black')}</Text>
                    </View>
                    <View style={styles.swatchItem}>
                        <View style={[styles.colorSwatch, {backgroundColor: '#FF85A1'}]}/>
                        <Text style={styles.swatchLabel}>{this.I18n.t('pink')}</Text>
                    </View>
                </View>
            </View>
        );
    }

    render() {
        if (!this.props.isActive) return this.props.children || null;

        return (
            <View style={styles.container}>
                {this.renderTitle()}
                <View style={styles.guideArea}>
                    {this.renderWoundFrame()}
                </View>
                {this.renderSizeEstimate()}
                {this.renderColorReference()}
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
    woundFrameContainer: {
        alignItems: 'center',
    },
    woundFrame: {
        borderWidth: 2,
        borderColor: '#FF9800',
        borderStyle: 'dashed',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    crosshairH: {
        position: 'absolute',
        width: '100%',
        height: 1,
        backgroundColor: 'rgba(255, 152, 0, 0.3)',
    },
    crosshairV: {
        position: 'absolute',
        width: 1,
        height: '100%',
        backgroundColor: 'rgba(255, 152, 0, 0.3)',
    },
    woundIcon: {
        color: 'rgba(255, 152, 0, 0.5)',
        fontSize: 40,
    },
    woundGuideText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: Styles.smallerTextSize,
        marginTop: 4,
    },
    rulerContainer: {
        alignItems: 'center',
        marginTop: 8,
    },
    rulerLine: {
        height: 24,
        borderBottomWidth: 2,
        borderBottomColor: '#FFFFFF',
        width: '100%',
        position: 'relative',
    },
    rulerTick: {
        position: 'absolute',
        bottom: 0,
        alignItems: 'center',
    },
    rulerTickMark: {
        width: 2,
        height: 10,
        backgroundColor: '#FFFFFF',
    },
    rulerLabel: {
        color: '#FFFFFF',
        fontSize: 10,
        marginTop: 2,
    },
    rulerHint: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: Styles.smallerTextSize,
        marginTop: 4,
        fontStyle: 'italic',
    },
    sizeEstimateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 16,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginTop: 8,
    },
    sizeIcon: {
        color: '#FF9800',
        fontSize: 18,
        marginRight: 6,
    },
    sizeText: {
        color: '#FFFFFF',
        fontSize: Styles.smallerTextSize,
    },
    colorRefContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 8,
        padding: 10,
        marginHorizontal: 16,
        marginTop: 12,
        alignItems: 'center',
    },
    colorRefTitle: {
        color: '#FFFFFF',
        fontSize: Styles.smallerTextSize,
        fontWeight: '600',
        marginBottom: 8,
    },
    colorSwatches: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    swatchItem: {
        alignItems: 'center',
    },
    colorSwatch: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFFFFF',
    },
    swatchLabel: {
        color: '#FFFFFF',
        fontSize: 10,
        marginTop: 4,
    },
});

export default WoundGuide;
