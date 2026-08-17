import {StyleSheet, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import ValidationErrorMessage from "../../form/ValidationErrorMessage";
import MediaFormElement from "./MediaFormElement";
import Colors from "../../primitives/Colors";
import {Button, Text} from "native-base";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Fonts from "../../primitives/Fonts";
import Styles from "../../primitives/Styles";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";
import _ from "lodash";

export default class MultiSelectMediaFormElement extends MediaFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object,
        extraStyle: PropTypes.object,
    };
    static defaultProps = {
        style: {},
    };

    constructor(props, context) {
        super(props, context);
    }

    get mediaUris() {
        const answer = _.get(this, 'props.value.answer', []);
        //this is done to support backward compatibility for the clients where app is not updated
        return _.flatten([answer]);
    }

    UNSAFE_componentWillMount() {
        const initialCount = _.max([1, _.size(this.mediaUris)]);
        this.setState({mediaCount: initialCount});
        return super.UNSAFE_componentWillMount();
    }

    clearAnswer(index) {
        const allAnswers = this.mediaUris;
        this.dismissKeyboard();
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            answerUUID: allAnswers[index],
            parentFormElement: this.props.parentElement,
            questionGroupIndex: this.props.questionGroupIndex,
        });
        this.setState(({mediaCount}) => ({mediaCount: _.max([1, mediaCount - 1])}))
    }

    onUpdateObservations(fileName) {
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            answerUUID: fileName,
            parentFormElement: this.props.parentElement,
            questionGroupIndex: this.props.questionGroupIndex,
        });
        this.setState({mediaCount: _.size(this.mediaUris)});
    }

    // TODO: this previously flagged every image under a field named "Suspicious Images Display",
    // assuming that name alone meant the AI had flagged it. That broke when a non-suspicious image
    // (per the actual AI verdict) still ended up in that field. Disabled until we wire in the real
    // per-image AI verdict (e.g. a sibling "AI Suspicion Result" observation) instead of trusting
    // the field name.
    get isSuspiciousImagesGroup() {
        return false;
    }

    renderMedia(index) {
        const currentMediaElement = this.mediaUris[index];
        return (
            <View key={index} style={{marginBottom: 3}}>
                {currentMediaElement ? this.showMedia(currentMediaElement, this.clearAnswer.bind(this, index), index, this.isSuspiciousImagesGroup) :
                    this.showInputOptions(this.onUpdateObservations.bind(this))}
                {!currentMediaElement && <View
                    style={{flex: 1, borderColor: 'black', borderBottomWidth: StyleSheet.hairlineWidth, opacity: 0.1}}/>}
            </View>
        );
    }

    onAdd() {
        this.setState(({mediaCount}) => ({mediaCount: mediaCount + 1}))
    }

    // Configurable via a "minNumberOfMedia" key-value on the concept in the Form Builder;
    // defaults to the 8-image minimum this field was originally designed around.
    get minRequiredMediaCount() {
        return this.getFromKeyValue('minNumberOfMedia', 8);
    }

    renderMinimumCountHint() {
        const required = this.minRequiredMediaCount;
        const capturedCount = _.size(this.mediaUris);
        return (
            <View style={styles.minCountRow}>
                <Text style={styles.minCountText}>
                    {this.I18n.t('pleaseAddAtLeastNImages', {count: required})}
                </Text>
                <View style={styles.minCountBadge}>
                    <Text style={styles.minCountBadgeText}>{`${capturedCount}/${required}`}</Text>
                </View>
            </View>
        );
    }

    render() {
        if (this.isReadOnly) {
            return (
                <View style={{marginVertical: 16}}>
                    <FormElementLabelWithDocumentation element={this.props.element}/>
                    {this.renderReadOnlyMediaList(this.mediaUris)}
                    <ValidationErrorMessage validationResult={this.props.validationResult}/>
                    {this.renderRemoveConfirmDialog()}
                </View>
            );
        }
        const isDisabled = _.size(this.mediaUris) !== this.state.mediaCount;
        return (
            <View style={{marginVertical: 16}}>
                <FormElementLabelWithDocumentation element={this.props.element}/>
                {this.isImage && this.renderMinimumCountHint()}
                {_.map(_.range(0, this.state.mediaCount), index => this.renderMedia(index))}
                <Button disabled={isDisabled}
                        style={{
                            backgroundColor: isDisabled ? Colors.DisabledButtonColor : Colors.BrandPrimaryDark,
                            justifyContent: 'center',
                            alignSelf: 'stretch',
                            borderRadius: 8,
                            marginTop: 16,
                        }}
                        onPress={() => this.onAdd()}>
                    <Icon name="camera-plus-outline" style={{color: Styles.whiteColor, fontSize: 18, marginRight: 8}}/>
                    <Text style={{fontSize: Fonts.Normal, color: Styles.whiteColor, fontWeight: '600'}}>{this.I18n.t('addMore')}</Text>
                </Button>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
                {this.renderRemoveConfirmDialog()}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    minCountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    minCountText: {
        flex: 1,
        color: Colors.BrandPrimaryDark,
        fontSize: Styles.smallTextSize,
    },
    minCountBadge: {
        minWidth: 40,
        height: 24,
        borderRadius: 12,
        paddingHorizontal: 8,
        backgroundColor: Colors.BrandPrimary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    minCountBadgeText: {
        color: Colors.BrandLight,
        fontSize: Styles.smallerTextSize,
        fontWeight: '600',
    }
});
