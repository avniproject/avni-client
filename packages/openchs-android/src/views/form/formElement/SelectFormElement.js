import {View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import _ from "lodash";
import AbstractFormElement from "./AbstractFormElement";
import Distances from "../../primitives/Distances";
import Colors from "../../primitives/Colors";
import RadioLabelValue from "../../primitives/RadioLabelValue";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";
import SelectableItemGroup from "../../primitives/SelectableItemGroup";
import SegmentedOptions from "../../primitives/SegmentedOptions";
import UserInfoService from "../../../service/UserInfoService";
import {captureMethodFor} from "../../../utility/anupath/AnuPathFields";
import {logMedicalDeviceCaptureMethod} from "../../../utility/Analytics";

const ANSWER_SEARCH_THRESHOLD = 20;
// Opt-in key-value (on the concept, or on the form element) that renders a short single-select
// question as a horizontal segmented control, like the Gender selector at registration.
const DISPLAY_AS_SEGMENTED_KEY = "displayAsSegmented";
const MAX_SEGMENTED_OPTIONS = 4;
// Answer pre-selected on a segmented question that has no answer yet.
const DEFAULT_SEGMENTED_ANSWER_PATTERN = /^device\b/i;

class SelectFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        isSelected: PropTypes.func.isRequired,
        validationResult: PropTypes.object,
        allowedValues: PropTypes.array,
        // Set by the last question inside a repeatable card - that card already has its own
        // border, so this element's usual divider-from-next-question line would sit redundantly
        // inside it.
        hideBottomBorder: PropTypes.bool
    };

    constructor(props, context) {
        super(props, context);
    }

    toggleFormElementAnswerSelection(value, selection = 'user') {
        const answer = this.props.element.getAnswers().find((ans) => ans.concept.uuid === value);
        // Analytics for the device capture question; only when an answer is chosen, not when it is un-chosen.
        if (!this.props.multiSelect && !this.props.isSelected(value)) {
            const capture = captureMethodFor(this.props.element, answer.concept.name);
            if (capture) logMedicalDeviceCaptureMethod(capture.test, capture.captureMethod, selection);
        }
        this.dispatchAction(this.props.actionName, {formElement: this.props.element, answerUUID: answer.concept.uuid, parentFormElement: this.props.parentElement, value: answer.concept.uuid, questionGroupIndex: this.props.questionGroupIndex});
    }

    getOnlyAllowedAnswers() {
        return this.props.element.getAnswers().filter(answer => _.includes(this.props.allowedValues, answer.concept.uuid))
    }

    getAnswers() {
        return _.isNil(this.props.allowedValues) ? this.props.element.getAnswers() : this.getOnlyAllowedAnswers();
    }

    getSelectedAnswers() {
        return _.filter(this.getAnswers(), ans => this.props.isSelected(ans.concept.uuid));
    }

    // By design: a segmented capture-method question (e.g. "Device run" / "Manual run") opens with the device
    // option already chosen, so the device fields its rules show are visible straight away. Only for questions
    // opted in with displayAsSegmented, and only when nothing is chosen: an existing answer (e.g. "Manual run")
    // is never overwritten and the worker can switch at any time. A question left unanswered (a record saved
    // before this question existed, or an answer the worker cleared) gets "Device run" again when the page
    // is shown.
    onViewDidMount() {
        const disabled = this.props.element.editable === false;
        const answers = this.getAnswers();
        if (!this.shouldRenderSegmented(answers.length, disabled, this.props.element.concept.hasMedia())) return;
        if (_.some(answers, (answer) => this.props.isSelected(answer.concept.uuid))) return;
        const deviceAnswer = _.find(answers, (answer) => DEFAULT_SEGMENTED_ANSWER_PATTERN.test(answer.concept.name || ''));
        if (deviceAnswer) this.toggleFormElementAnswerSelection(deviceAnswer.concept.uuid, 'auto');
    }

    isOptedInToSegmented() {
        const {element} = this.props;
        const flag = _.invoke(element, 'recordValueByKey', DISPLAY_AS_SEGMENTED_KEY) ??
            _.invoke(element.concept, 'recordValueByKey', DISPLAY_AS_SEGMENTED_KEY);
        return flag === true || flag === 'true';
    }

    shouldRenderSegmented(answerCount, disabled, hasMediaContent) {
        return !this.props.multiSelect && !disabled && !hasMediaContent &&
            answerCount >= 2 && answerCount <= MAX_SEGMENTED_OPTIONS && this.isOptedInToSegmented();
    }

    render() {
        const disabled = this.props.element.editable === false;
        const answers = disabled ? this.getSelectedAnswers() : this.getAnswers();
        const valueLabelPairs = answers
            .map((answer) => new RadioLabelValue(answer.concept.name, answer.concept.uuid, answer.abnormal, answer.subject, answer.concept.media || []));
        const currentLocale = this.getService(UserInfoService).getUserSettings().locale;
        const hasMediaContent = this.props.element.concept.hasMedia();
        return (
            <View style={{
                flexDirection: 'column',
                paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems,
                borderBottomWidth: this.props.hideBottomBorder ? 0 : 1,
                borderBottomColor: Colors.InputBorderNormal
            }}>
                <FormElementLabelWithDocumentation element={this.props.element} />
                {this.shouldRenderSegmented(valueLabelPairs.length, disabled, hasMediaContent) ?
                <SegmentedOptions
                    labelValuePairs={valueLabelPairs}
                    selectionFn={this.props.isSelected}
                    onPress={(value) => this.toggleFormElementAnswerSelection(value)}
                    I18n={this.I18n}
                    labelKey={this.props.element.name}
                    validationError={this.props.validationResult}
                /> :
                <SelectableItemGroup
                    multiSelect={this.props.multiSelect}
                    inPairs={false}
                    onPress={(value) => this.toggleFormElementAnswerSelection(value)}
                    selectionFn={this.props.isSelected}
                    labelKey={this.props.element.name}
                    mandatory={this.props.element.mandatory}
                    validationError={this.props.validationResult}
                    labelValuePairs={valueLabelPairs}
                    disabled={disabled}
                    I18n={this.I18n}
                    locale={currentLocale}
                    skipLabel={true}
                    hasMediaContent={hasMediaContent}
                    searchThreshold={ANSWER_SEARCH_THRESHOLD}
                />}
            </View>);
    }

}

export default SelectFormElement;
