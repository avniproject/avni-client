import React, {Fragment} from 'react';
import AbstractFormElement from "./AbstractFormElement";
import PropTypes from "prop-types";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import MCIIcon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../../primitives/Colors";
import Styles from "../../primitives/Styles";
import {QuestionGroup as QuestionGroupModel, RepeatableQuestionGroup} from 'avni-models';
import QuestionGroup from "./QuestionGroup";
import FormElementLabelWithDocumentation from "../../common/FormElementLabelWithDocumentation";
import _ from "lodash";

class RepeatableFormElement extends AbstractFormElement {

    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        validationResults: PropTypes.array,
        extraStyle: PropTypes.object,
        formElementsUserState: PropTypes.object,
        observationHolder: PropTypes.object,
        filteredFormElements: PropTypes.array,
        actions: PropTypes.object,
        subjectUUID: PropTypes.string
    };

    static defaultProps = {
        style: {},
    };

    constructor(props, context) {
        super(props, context);
        this.rowKeys = [];
    }

    onAdd() {
        this.rowKeys.push(_.uniqueId('rqg_'));
        this.dispatchAction(this.props.actionName, {
            action: RepeatableQuestionGroup.actions.add,
            parentFormElement: this.props.element,
            formElement: this.props.element
        });
    }

    onRemove(questionGroupIndex) {
        this.rowKeys.splice(questionGroupIndex, 1);
        this.dispatchAction(this.props.actionName, {
            action: RepeatableQuestionGroup.actions.remove,
            parentFormElement: this.props.element,
            formElement: this.props.element,
            questionGroupIndex
        });
    }

    actionButton(iconName, onPress, isDisabled, primaryColor) {
        return this.props.element.recordValueByKey('disableManualActions') ? null :
            <TouchableOpacity activeOpacity={0.5}
                              disabled={isDisabled}
                              onPress={onPress}
                              style={styles.actionButton}>
                <MCIIcon name={iconName}
                      style={{fontSize: 25, color: isDisabled ? Colors.DisabledButtonColor : primaryColor}}
                />
            </TouchableOpacity>;
    }

    // this.props.element is the repeatable group's own FormElement (not a FormElementGroup), so it
    // has no getFormElements() - the group's child questions instead live in filteredFormElements,
    // matched by groupUuid, the same way QuestionGroup.getChildFormElements() finds them.
    get childFormElements() {
        return _.filter(this.props.filteredFormElements, fe => fe.groupUuid === this.props.element.uuid);
    }

    // Repeatable groups whose rows capture an image/video already offer a per-row delete via the
    // "x" on the image itself - the generic minus-circle here would just be a redundant second
    // way to remove the same row, so it's skipped for those groups only.
    get hasOwnRowRemoveControl() {
        return _.some(this.childFormElements, fe => _.includes(['Image', 'Video'], _.get(fe, 'concept.datatype')));
    }

    // Configurable via a "minNumberOfMedia" key-value on the repeatable group's concept in the
    // Form Builder; defaults to the 8-image minimum this field was originally designed around.
    get minRequiredRowCount() {
        return this.props.element.recordValueByKey('minNumberOfMedia') || 8;
    }

    // Review-only groups (e.g. AI-results screens showing previously captured images) already
    // disable add/remove via "disableManualActions" - the "please add at least N" hint only makes
    // sense while actively capturing photos, i.e. wherever manual add/remove is actually possible.
    get shouldShowMinimumCountHint() {
        return this.hasOwnRowRemoveControl && !this.props.element.recordValueByKey('disableManualActions');
    }

    renderMinimumCountHint() {
        const required = this.minRequiredRowCount;
        const capturedCount = this.props.value.size();
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

    renderQuestionGroup(questionGroupIndex) {
        const isRemoveDisabled = this.props.value.size() <= 1;
        if (!this.rowKeys[questionGroupIndex]) {
            this.rowKeys[questionGroupIndex] = _.uniqueId('rqg_');
        }
        return (
            <Fragment key={this.rowKeys[questionGroupIndex]}>
                {!this.hasOwnRowRemoveControl &&
                    this.actionButton('minus-circle', () => this.onRemove(questionGroupIndex), isRemoveDisabled, Colors.NegativeActionButtonColor)}
                <QuestionGroup
                    questionGroupIndex={questionGroupIndex}
                    element={this.props.element}
                    actionName={this.props.actionName}
                    actions={this.props.actions}
                    formElementsUserState={this.props.formElementsUserState}
                    observationHolder={this.props.observationHolder}
                    value={this.props.value.getGroupObservationAtIndex(questionGroupIndex) || new QuestionGroupModel()}
                    validationResults={this.props.validationResults}
                    filteredFormElements={this.props.filteredFormElements}
                    extraContainerStyle={{marginVertical: 0}}
                    subjectUUID={this.props.subjectUUID}
                />
            </Fragment>
        )
    }

    render() {
        const isAddDisabled = this.props.value.nonEmptySize() !== this.props.value.size();
        return (
            <View style={{marginVertical: 16}}>
                <FormElementLabelWithDocumentation element={this.props.element}/>
                {this.shouldShowMinimumCountHint && this.renderMinimumCountHint()}
                {_.map(_.range(0, _.max([1, this.props.value.size()])), index => this.renderQuestionGroup(index))}
                {this.actionButton('plus-circle', () => this.onAdd(), isAddDisabled, Colors.ActionButtonColor)}
            </View>
        );
    }

}

const styles = StyleSheet.create({
    actionButton: {
        alignSelf: 'flex-end',
        marginTop: 10,
    },
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

export default RepeatableFormElement;
