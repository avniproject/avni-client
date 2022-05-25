import {StyleSheet, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import ValidationErrorMessage from "../../form/ValidationErrorMessage";
import MediaFormElement from "./MediaFormElement";

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
        this.state = {};
    }

    get mediaUri() {
        return _.get(this, 'props.value.answer');
    }

    clearAnswer() {
        this.dismissKeyboard();
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            parentFormElement: this.props.parentElement,
            answerUUID: this.mediaUri,
        });
    }

    onUpdateObservations(fileName) {
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            parentFormElement: this.props.parentElement,
            answerUUID: fileName
        });
    }

    render() {
        return (
            this.props.isShown &&
            <View style={{marginVertical: 16}}>
                {this.label}
                {this.mediaUri ? this.showMedia(this.mediaUri, this.clearAnswer.bind(this)) :
                    this.showInputOptions(this.onUpdateObservations.bind(this))}
                <View
                    style={{flex: 1, borderColor: 'black', borderBottomWidth: StyleSheet.hairlineWidth, opacity: 0.1}}/>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </View>
        );
    }
}
