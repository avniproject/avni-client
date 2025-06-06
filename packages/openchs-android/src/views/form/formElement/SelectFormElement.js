import {View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import _ from "lodash";
import AbstractFormElement from "./AbstractFormElement";
import Distances from "../../primitives/Distances";
import RadioLabelValue from "../../primitives/RadioLabelValue";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";
import SelectableItemGroup from "../../primitives/SelectableItemGroup";
import UserInfoService from "../../../service/UserInfoService";

class SelectFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        isSelected: PropTypes.func.isRequired,
        validationResult: PropTypes.object,
        allowedValues: PropTypes.array
    };

    constructor(props, context) {
        super(props, context);
    }

    toggleFormElementAnswerSelection(value) {
        const answer = this.props.element.getAnswers().find((ans) => ans.concept.uuid === value);
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

    render() {
        const disabled = this.props.element.editable === false;
        const answers = disabled ? this.getSelectedAnswers() : this.getAnswers();
        const valueLabelPairs = answers
            .map((answer) => new RadioLabelValue(answer.concept.name, answer.concept.uuid, answer.abnormal, answer.subject, answer.concept.mediaType, answer.concept.mediaUrl));
        const currentLocale = this.getService(UserInfoService).getUserSettings().locale;
        const hasMediaContent = this.props.element.concept.hasMedia();
        const mediaType = hasMediaContent ? this.props.element.concept.mediaType : null;
        const mediaUrl = hasMediaContent ? this.props.element.concept.mediaUrl : null;
        return (
            <View style={{flexDirection: 'column', paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems}}>
                <FormElementLabelWithDocumentation element={this.props.element} />
                <SelectableItemGroup
                    multiSelect={this.props.multiSelect}
                    inPairs={!hasMediaContent}
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
                    mediaType={mediaType}
                    mediaUrl={mediaUrl}
                    hasMediaContent={hasMediaContent}
                />
            </View>);
    }

}

export default SelectFormElement;
