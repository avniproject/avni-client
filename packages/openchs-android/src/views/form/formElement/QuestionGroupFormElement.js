import React from 'react';
import AbstractFormElement from "./AbstractFormElement";
import PropTypes from "prop-types";
import {View} from "react-native";
import QuestionGroup from "./QuestionGroup";

class QuestionGroupFormElement extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResults: PropTypes.array,
        filteredFormElements: PropTypes.array,
    };


    render() {
        return (
            <View>
                {this.label}
                <QuestionGroup
                    element={this.props.element}
                    actionName={this.props.actionName}
                    value={this.props.value}
                    validationResults={this.props.validationResults}
                    filteredFormElements={this.props.filteredFormElements}
                    questionGroupIndex={0}
                />
            </View>
        )
    }

}

export default QuestionGroupFormElement;
