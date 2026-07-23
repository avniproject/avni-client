import {StyleSheet, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import ValidationErrorMessage from "../../form/ValidationErrorMessage";
import MediaFormElement from "./MediaFormElement";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";
import _ from "lodash";

export default class SingleSelectMediaFormElement extends MediaFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object,
        extraStyle: PropTypes.object,
        isShown: PropTypes.bool,
    };
    static defaultProps = {
        style: {},
        isShown: true
    };

    constructor(props, context) {
        super(props, context);
    }

    get mediaUri() {
        return _.get(this, 'props.value.answer');
    }

    clearAnswer() {
        this.dismissKeyboard();
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            parentFormElement: this.props.parentElement,
            questionGroupIndex: this.props.questionGroupIndex,
            answerUUID: this.mediaUri,
        });
    }

    onUpdateObservations(fileName) {
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            parentFormElement: this.props.parentElement,
            questionGroupIndex: this.props.questionGroupIndex,
            answerUUID: fileName
        });
    }

    render() {
        // Rows inside a repeatable group (e.g. AI Oral Screening Results) already carry a numbered badge
        // on the image itself, so the per-row concept label ("Oral Image") is redundant and isn't shown
        // in Figma, whether or not the row is still editable. Non-repeated usages (e.g. profile picture
        // capture, which never gets a questionGroupIndex) are unaffected.
        const isRepeatableRow = !_.isNil(this.props.questionGroupIndex);
        // Every image under the "Suspicious Images Display" field is, by definition, one the AI
        // already flagged - show the "AI Flagged" marker instead of a plain row number. Checked on
        // both the element itself (standalone field) and its parent (repeatable-group row) since
        // either can carry that name depending on how the form is structured.
        const isSuspiciousImagesGroup = this.props.element.name === 'Suspicious Images Display'
            || _.get(this.props, 'parentElement.name') === 'Suspicious Images Display';
        return (
            this.props.isShown &&
            <View style={{marginVertical: 16}}>
                {!isRepeatableRow && <FormElementLabelWithDocumentation element={this.props.element}/>}
                {this.mediaUri ? this.showMedia(this.mediaUri, this.clearAnswer.bind(this), this.props.questionGroupIndex, isSuspiciousImagesGroup) :
                    (this.isReadOnly ? this.showEmptyReadOnly() : this.showInputOptions(this.onUpdateObservations.bind(this)))}
                <View
                    style={{flex: 1, borderColor: 'black', borderBottomWidth: StyleSheet.hairlineWidth, opacity: 0.1}}/>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
                {this.renderRemoveConfirmDialog()}
            </View>
        );
    }
}
