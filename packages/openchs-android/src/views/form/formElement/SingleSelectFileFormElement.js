import React from 'react';
import {
    SafeAreaView,
    StyleSheet,
    View,
} from 'react-native';
import PropTypes from "prop-types";
import Colors from "../../primitives/Colors";
import ValidationErrorMessage from "../ValidationErrorMessage";
import FileFormElement from "./FileFormElement";

class SingleSelectFileFormElement extends FileFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResult: PropTypes.object,
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
            index: this.props.index,
            answerUUID: this.mediaUri,
        });
    }

    onUpdateObservations(fileName) {
        this.dispatchAction(this.props.actionName, {
            formElement: this.props.element,
            parentFormElement: this.props.parentElement,
            index: this.props.index,
            answerUUID: fileName
        });
    }

    render() {
        return (
            <SafeAreaView>
                {this.label}
                {this.mediaUri ? this.showMedia(this.mediaUri, this.clearAnswer.bind(this)) :
                    this.showInputOptions(this.onUpdateObservations.bind(this))}
                <View style={styles.lineStyle}/>
                <ValidationErrorMessage validationResult={this.props.validationResult}/>
            </SafeAreaView>
        );
    }
}

export default SingleSelectFileFormElement;

const styles = StyleSheet.create({
    lineStyle: {
        flex: 1,
        borderColor: Colors.BlackBackground,
        borderBottomWidth: StyleSheet.hairlineWidth,
        opacity: 0.1
    }
});
