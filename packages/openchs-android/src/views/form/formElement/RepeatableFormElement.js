import React, {Fragment} from 'react';
import AbstractFormElement from "./AbstractFormElement";
import PropTypes from "prop-types";
import {StyleSheet, TouchableOpacity, View} from "react-native";
import {Icon} from "native-base";
import Colors from "../../primitives/Colors";
import {RepeatableQuestionGroup, QuestionGroup as QuestionGroupModel} from 'avni-models';
import QuestionGroup from "./QuestionGroup";


class RepeatableFormElement extends AbstractFormElement {

    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResults: PropTypes.array,
        extraStyle: PropTypes.object,
        filteredFormElements: PropTypes.array,
    };

    static defaultProps = {
        style: {},
    };

    constructor(props, context) {
        super(props, context);
    }

    onAdd() {
        this.dispatchAction(this.props.actionName, {
            action: RepeatableQuestionGroup.actions.add,
            parentFormElement: this.props.element,
            formElement: this.props.element
        });
    }

    onRemove(questionGroupIndex) {
        this.dispatchAction(this.props.actionName, {
            action: RepeatableQuestionGroup.actions.remove,
            parentFormElement: this.props.element,
            formElement: this.props.element,
            questionGroupIndex
        });
    }

    actionButton(iconName, onPress, isDisabled, primaryColor) {
        return (
            <TouchableOpacity activeOpacity={0.5}
                              disabled={isDisabled}
                              onPress={onPress}
                              style={styles.actionButton}>
                <Icon name={iconName}
                      style={{fontSize: 25, color: isDisabled ? Colors.DisabledButtonColor : primaryColor}}
                />
            </TouchableOpacity>
        )
    }

    renderQuestionGroup(questionGroupIndex) {
        const isRemoveDisabled = this.props.value.size() <= 1;
        return (
            <Fragment key={questionGroupIndex}>
                {this.actionButton('remove-circle', () => this.onRemove(questionGroupIndex), isRemoveDisabled, Colors.NegativeActionButtonColor)}
                <QuestionGroup
                    questionGroupIndex={questionGroupIndex}
                    element={this.props.element}
                    actionName={this.props.actionName}
                    value={this.props.value.getGroupObservationAtIndex(questionGroupIndex) || new QuestionGroupModel()}
                    validationResults={this.props.validationResults}
                    filteredFormElements={this.props.filteredFormElements}
                    extraContainerStyle={{marginVertical: 0}}
                />
            </Fragment>
        )
    }

    render() {
        const isAddDisabled = this.props.value.nonEmptySize() !== this.props.value.size();
        return (
            <View style={{marginVertical: 16}}>
                {this.label}
                {_.map(_.range(0, _.max([1, this.props.value.size()])), index => this.renderQuestionGroup(index))}
                {this.actionButton('add-circle', () => this.onAdd(), isAddDisabled, Colors.ActionButtonColor)}
            </View>
        );
    }

}

const styles = StyleSheet.create({
    actionButton: {
        alignSelf: 'flex-end',
        marginTop: 10,
    }
});

export default RepeatableFormElement;
