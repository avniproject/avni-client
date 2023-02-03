import React, {Fragment} from 'react';
import AbstractFormElement from "./AbstractFormElement";
import PropTypes from "prop-types";
import {StyleSheet, View} from "react-native";
import {
    Concept,
    Identifier,
    MultipleCodedValues,
    PrimitiveValue,
    SingleCodedValue,
    PhoneNumber,
    Duration,
    CompositeDuration
} from 'avni-models';
import _ from 'lodash';
import ValidationErrorMessage from "../ValidationErrorMessage";
import NumericFormElement from "./NumericFormElement";
import TextFormElement from "./TextFormElement";
import Colors from "../../primitives/Colors";
import DateFormElement from "./DateFormElement";
import AudioFormElement from "./AudioFormElement";
import TimeFormElement from "./TimeFormElement";
import SingleSelectMediaFormElement from "./SingleSelectMediaFormElement";
import IdFormElement from "./IdFormElement";
import LocationHierarchyFormElement from "./LocationHierarchyFormElement";
import SingleSelectFormElement from "./SingleSelectFormElement";
import MultiSelectFormElement from "./MultiSelectFormElement";
import SingleSelectFileFormElement from "./SingleSelectFileFormElement";
import DurationDateFormElement from "./DurationDateFormElement";
import DurationFormElement from "./DurationFormElement";
import MultiSelectMediaFormElement from "./MultiSelectMediaFormElement";
import PhoneNumberFormElement from "./PhoneNumberFormElement";
import SingleSelectSubjectLandingFormElement from './SingleSelectSubjectLandingFormElement';
import MultiSelectSubjectLandingFormElement from './MultiSelectSubjectLandingFormElement';

class QuestionGroup extends AbstractFormElement {
    static propTypes = {
        element: PropTypes.object.isRequired,
        actionName: PropTypes.string.isRequired,
        value: PropTypes.object,
        formElementsUserState: PropTypes.object,
        observationHolder: PropTypes.object,
        validationResults: PropTypes.array,
        filteredFormElements: PropTypes.array,
        questionGroupIndex: PropTypes.number,
        actions: PropTypes.object
    };

    static defaultProps = {
        questionGroupIndex: 0
    };

    constructor(props, context) {
        super(props, context);
    }

    getCompositeDuration(concept, formElement) {
        const observation = this.props.observationHolder.findQuestionGroupObservation(concept, this.props.element, this.props.questionGroupIndex);
        const durationOptions = formElement.durationOptions;
        if (_.isNil(observation)) {
            return CompositeDuration.fromOpts(durationOptions);
        } else {
            return observation.getValueWrapper();
        }
    }

    getDuration(concept, formElementUserState, formElement) {
        const observation = this.props.observationHolder.findQuestionGroupObservation(concept, this.props.element, this.props.questionGroupIndex);
        if (_.isNil(observation)) {
            return new Duration(null, formElement.durationOptions[0]);
        } else {
            const date = observation.getValueWrapper().getValue();
            if (_.isNil(formElementUserState)) {
                return Duration.fromDataEntryDate(formElement.durationOptions[0], date, this.props.dataEntryDate);
            } else {
                return Duration.fromDataEntryDate(formElementUserState.durationUnit, date, this.props.dataEntryDate);
            }
        }
    }

    getChildFormElements() {
        //form elements without rule will not have questionGroupIndex. Since these FE does not have rule it's always visible
        return _.sortBy(
            _.filter(this.props.filteredFormElements, ({questionGroupIndex, groupUuid, voided}) =>
                groupUuid === this.props.element.uuid && (_.isNil(questionGroupIndex) || questionGroupIndex === this.props.questionGroupIndex) && !voided),
            "displayOrder"
        );
    }

    getValidationResultForFormElement(formElement) {
        return _.find(this.props.validationResults, ({formIdentifier, questionGroupIndex}) =>
            formIdentifier === formElement.uuid && questionGroupIndex === this.props.questionGroupIndex);
    }

    getSelectedAnswer(concept, nullReplacement) {
        const observation = this.props.value.findObservation(concept);
        return _.isNil(observation) ? nullReplacement : observation.getValueWrapper();
    }

    getSelectedAnswerFromObservationHolder(concept, element, questionGroupIndex, nullReplacement) {
        const observation = this.props.observationHolder.findQuestionGroupObservation(concept, element, questionGroupIndex);
        return _.isNil(observation) ? nullReplacement : observation.getValueWrapper();
    }

    renderTextFormElement(formElement) {
        return <TextFormElement
            key={formElement.concept.uuid}
            element={formElement}
            parentElement={this.props.element}
            actionName={this.props.actionName}
            value={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
            validationResult={this.getValidationResultForFormElement(formElement)}
            multiline={false}
            containerStyle={styles.groupContainerStyle}
            labelStyle={styles.groupLabelStyle}
            inputStyle={styles.groupInputStyle}
            questionGroupIndex={this.props.questionGroupIndex}
            isTableView={true}
        />
    }

    renderNumericFormElement(formElement) {
        return <NumericFormElement
            key={formElement.concept.uuid}
            element={formElement}
            parentElement={this.props.element}
            inputChangeActionName={this.props.actionName}
            value={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
            validationResult={this.getValidationResultForFormElement(formElement)}
            containerStyle={styles.groupContainerStyle}
            labelStyle={styles.groupLabelStyle}
            inputStyle={styles.groupInputStyle}
            questionGroupIndex={this.props.questionGroupIndex}
            isTableView={true}
        />
    }

    renderNormalView(allGroupQuestions) {
        return (
            <Fragment>
                {_.map(allGroupQuestions, fe => {
                    const concept = fe.concept;
                    const validationResult = this.getValidationResultForFormElement(fe);
                    const commonProps = {
                        key: fe.uuid,
                        element: fe,
                        actionName: this.props.actionName,
                        validationResult: validationResult,
                        parentElement: this.props.element,
                        parentFormElement: this.props.element,
                        questionGroupIndex: this.props.questionGroupIndex
                    };
                    const dataType = concept.datatype;
                    const dataTypes = Concept.dataType;
                    if (dataType === dataTypes.Numeric) {
                        return <NumericFormElement value={this.getSelectedAnswer(concept, new PrimitiveValue())}
                                                   inputChangeActionName={this.props.actionName} {...commonProps}/>
                    }
                    if (_.includes([dataTypes.Text, dataTypes.Notes], dataType)) {
                        return <TextFormElement value={this.getSelectedAnswer(concept, new PrimitiveValue())}
                                                multiline={dataType !== dataTypes.Text} {...commonProps}/>
                    }
                    if (dataType === dataTypes.Coded && fe.isSingleSelect()) {
                        return <SingleSelectFormElement
                            singleCodedValue={this.getSelectedAnswer(fe.concept, new SingleCodedValue())} {...commonProps}/>;
                    }
                    if (dataType === dataTypes.Coded && fe.isMultiSelect()) {
                        return <MultiSelectFormElement
                            multipleCodeValues={this.getSelectedAnswer(fe.concept, new MultipleCodedValues())} {...commonProps}/>;
                    }
                    if ((dataType === dataTypes.Date && _.isNil(fe.durationOptions)) || dataType === dataTypes.DateTime) {
                        return <DateFormElement
                            dateValue={this.getSelectedAnswer(fe.concept, new PrimitiveValue())} {...commonProps}/>;
                    }
                    if (dataType === dataTypes.File && fe.isSingleSelect()) {
                        return <SingleSelectFileFormElement
                            value={this.getSelectedAnswer(fe.concept, new SingleCodedValue())} {...commonProps}/>;
                    }
                    if (dataType === dataTypes.Audio) {
                        return <AudioFormElement
                            value={this.getSelectedAnswer(fe.concept, new PrimitiveValue())} {...commonProps}/>;
                    }
                    if (dataType === dataTypes.Time) {
                        return <TimeFormElement
                            timeValue={this.getSelectedAnswer(fe.concept, new PrimitiveValue())} {...commonProps}/>;
                    }
                    if (_.includes([dataTypes.Image, dataTypes.Video], dataType) && fe.isSingleSelect()) {
                        return <SingleSelectMediaFormElement
                            value={this.getSelectedAnswer(fe.concept, new SingleCodedValue())} {...commonProps}/>;
                    }
                    if (_.includes([dataTypes.Image, dataTypes.Video], dataType) && fe.isMultiSelect()) {
                        return <MultiSelectMediaFormElement
                            value={this.getSelectedAnswer(fe.concept, new MultipleCodedValues())} {...commonProps}/>;
                    }
                    if (dataType === dataTypes.Id) {
                        return <IdFormElement
                            value={this.getSelectedAnswer(fe.concept, new Identifier())}
                            multiline={false} {...commonProps}/>;
                    }
                    if (dataType === dataTypes.Location) {
                        return <LocationHierarchyFormElement
                            value={this.getSelectedAnswer(fe.concept, new PrimitiveValue())} {...commonProps}/>;
                    }
                    if (dataType === dataTypes.Date && !_.isNil(fe.durationOptions)) {
                        return <DurationDateFormElement
                            label={fe.name}
                            durationOptions={fe.durationOptions}
                            duration={this.getDuration(fe.concept, this.props.formElementsUserState[`${fe.uuid}-${this.props.questionGroupIndex}`], fe)}
                            dateValue={this.getSelectedAnswer(fe.concept, new PrimitiveValue())} {...commonProps}/>
                    }
                    if (dataType === dataTypes.Duration && !_.isNil(fe.durationOptions)) {
                        return <DurationFormElement
                            compositeDuration={this.getCompositeDuration(fe.concept, fe)}
                            noDateMessageKey='chooseADate' {...commonProps}/>
                    }
                    if (dataType === dataTypes.PhoneNumber) {
                        return <PhoneNumberFormElement
                            inputChangeActionName={this.props.actionName}
                            successVerificationActionName={this.props.actions["ON_SUCCESS_OTP_VERIFICATION"]}
                            skipVerificationActionName={this.props.actions["ON_SKIP_VERIFICATION"]}
                            value={this.getSelectedAnswer(fe.concept, new PhoneNumber())}
                            observation={this.props.observationHolder.findQuestionGroupObservation(fe.concept, this.props.element, this.props.questionGroupIndex)}
                            {...commonProps}/>
                    }
                    if (dataType === dataTypes.Subject && fe.isSingleSelect()) {
                        return <SingleSelectSubjectLandingFormElement
                          element={fe}
                          value={this.getSelectedAnswerFromObservationHolder(fe.concept, this.props.element, this.props.questionGroupIndex, new SingleCodedValue())}
                          {...commonProps}
                        />
                    }
                    if (dataType === dataTypes.Subject && fe.isMultiSelect()) {
                        return <MultiSelectSubjectLandingFormElement
                          element={fe}
                          value={this.getSelectedAnswerFromObservationHolder(fe.concept, this.props.element, this.props.questionGroupIndex, new MultipleCodedValues())}
                          {...commonProps}
                        />
                    }
                })}
            </Fragment>
        )
    }

    renderGridView(allGroupQuestions) {
        const extraStyle = this.props.extraContainerStyle || {};
        return (
            <View style={[styles.mainContainerStyle, extraStyle]}>
                {_.map(allGroupQuestions, groupQuestionFormElement => {
                    const concept = groupQuestionFormElement.concept;
                    switch (concept.datatype) {
                        case Concept.dataType.Text :
                            return this.renderTextFormElement(groupQuestionFormElement);
                        case Concept.dataType.Numeric:
                        case Concept.dataType.Notes:
                            return this.renderNumericFormElement(groupQuestionFormElement);
                    }
                })}
            </View>
        )
    }

    render() {
        const allGroupQuestions = this.getChildFormElements();
        const hasOtherTypesThanTextNumericAndNotes = _.some(allGroupQuestions, ({concept}) => !_.includes([Concept.dataType.Text, Concept.dataType.Numeric, Concept.dataType.Notes], concept.datatype));
        return (
            <View>
                {hasOtherTypesThanTextNumericAndNotes ?
                    this.renderNormalView(allGroupQuestions) : this.renderGridView(allGroupQuestions)}
                <ValidationErrorMessage
                    validationResult={this.getValidationResultForFormElement(this.props.element)}/>
            </View>
        )
    }

}

const styles = StyleSheet.create({
    mainContainerStyle: {
        flexDirection: 'column',
        justifyContent: 'flex-start',
        borderTopWidth: 1,
        borderTopColor: Colors.InputBorderNormal,
        marginVertical: 3,
    },
    groupContainerStyle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 1,
        borderRightWidth: 1,
        borderLeftWidth: 1,
        borderBottomWidth: 1,
        borderRightColor: Colors.InputBorderNormal,
        borderLeftColor: Colors.InputBorderNormal,
        borderBottomColor: Colors.InputBorderNormal,
    },
    groupLabelStyle: {
        paddingLeft: 1,
        flex: 0.5,
    },
    groupInputStyle: {
        borderLeftWidth: 1,
        borderLeftColor: Colors.InputBorderNormal,
        paddingLeft: 1,
        flex: 0.5
    },
});

export default QuestionGroup;
