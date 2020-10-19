import {View, Text} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import MultiSelectFormElement from './formElement/MultiSelectFormElement';
import SingleSelectFormElement from './formElement/SingleSelectFormElement';
import NumericFormElement from './formElement/NumericFormElement';
import TextFormElement from './formElement/TextFormElement';
import DateFormElement from './formElement/DateFormElement';
import TimeFormElement from './formElement/TimeFormElement';
import _ from "lodash";
import {
    Concept,
    MultipleCodedValues,
    SingleCodedValue,
    PrimitiveValue,
    Duration,
    CompositeDuration,
    ValidationResult
} from 'avni-models';
import Distances from '../primitives/Distances';
import DurationDateFormElement from "./formElement/DurationDateFormElement";
import Styles from "../primitives/Styles";
import MediaFormElement from "./formElement/MediaFormElement";
import IdFormElement from "./formElement/IdFormElement";
import DurationFormElement from "./formElement/DurationFormElement";
import LocationHierarchyFormElement from "./formElement/LocationHierarchyFormElement";
import SingleSelectSubjectFormElement from "./formElement/SingleSelectSubjectFormElement";
import MultiSelectSubjectFormElement from "./formElement/MultiSelectSubjectFormElement";

class FormElementGroup extends AbstractComponent {
    static propTypes = {
        group: PropTypes.object.isRequired,
        filteredFormElements: PropTypes.any,
        observationHolder: PropTypes.object.isRequired,
        actions: PropTypes.object.isRequired,
        validationResults: PropTypes.array,
        formElementsUserState: PropTypes.object,
        dataEntryDate: PropTypes.object,
        onValidationError: PropTypes.func,
    };

    constructor(props, context) {
        super(props, context);
    }

    wrap(x, idx, shouldScroll) {
        return <View style={{marginTop: Distances.ScaledVerticalSpacingBetweenFormElements}} key={idx}
                     onLayout={(event) => shouldScroll && _.isFunction(this.props.onValidationError) ? this.props.onValidationError(event.nativeEvent.layout.x, event.nativeEvent.layout.y) : _.noop()}>{x}</View>;
    }

    getCompositeDuration(concept, formElement) {
        const observation = this.props.observationHolder.findObservation(concept);
        const durationOptions = formElement.durationOptions;
        if (_.isNil(observation)) {
            return CompositeDuration.fromOpts(durationOptions);
        } else {
            return observation.getValueWrapper();
        }
    }

    getDuration(concept, formElementUserState, formElement) {
        const observation = this.props.observationHolder.findObservation(concept);
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

    getSelectedAnswer(concept, nullReplacement) {
        const observation = this.props.observationHolder.findObservation(concept);
        return _.isNil(observation) ? nullReplacement : observation.getValueWrapper();
    }

    render() {
        const sortedFormElements = this.props.group.getFormElements();
        const firstErroredFE = _.chain(sortedFormElements)
            .intersectionWith(this.props.validationResults, (a, b) => a.uuid === b.formIdentifier)
            .head()
            .value();
        const erroredUUID = firstErroredFE && firstErroredFE.uuid;
        const formElements = _.isNil(this.props.filteredFormElements) ? this.props.group.getFormElements() : this.props.filteredFormElements;
        return (<View>
                {formElements.length < 1 ? <View/> :
                    <Text style={Styles.formGroupLabel}>{this.I18n.t(this.props.group.display)}</Text>}
                {
                    formElements.map((formElement, idx) => {
                        const validationResult = ValidationResult.findByFormIdentifier(this.props.validationResults, formElement.uuid);
                        if (formElement.concept.datatype === Concept.dataType.Numeric) {
                            return this.wrap(<NumericFormElement
                                element={formElement}
                                inputChangeActionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                endEditingActionName={this.props.actions["PRIMITIVE_VALUE_END_EDITING"]}
                                value={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                validationResult={validationResult}/>, idx, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Text || formElement.concept.datatype === Concept.dataType.Notes) {
                            return this.wrap(<TextFormElement
                                element={formElement}
                                actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                value={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                validationResult={validationResult}
                                multiline={formElement.concept.datatype !== Concept.dataType.Text}
                            />, idx, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Coded && formElement.isMultiSelect()) {
                            return this.wrap(<MultiSelectFormElement key={idx}
                                                                     element={formElement}
                                                                     multipleCodeValues={this.getSelectedAnswer(formElement.concept, new MultipleCodedValues())}
                                                                     actionName={this.props.actions["TOGGLE_MULTISELECT_ANSWER"]}
                                                                     validationResult={validationResult}/>, idx, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Coded && formElement.isSingleSelect()) {
                            return this.wrap(<SingleSelectFormElement key={idx}
                                                                      element={formElement}
                                                                      singleCodedValue={this.getSelectedAnswer(formElement.concept, new SingleCodedValue())}
                                                                      actionName={this.props.actions["TOGGLE_SINGLESELECT_ANSWER"]}
                                                                      validationResult={validationResult}/>, idx, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Date && _.isNil(formElement.durationOptions)) {
                            return this.wrap(<DateFormElement key={idx}
                                                              element={formElement}
                                                              actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                                              dateValue={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                                              validationResult={validationResult}/>, idx, formElement.uuid === erroredUUID);

                        } else if (formElement.concept.datatype === Concept.dataType.DateTime) {
                            return this.wrap(<DateFormElement key={idx}
                                                              element={formElement}
                                                              actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                                              dateValue={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                                              validationResult={validationResult}/>, idx, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Date && !_.isNil(formElement.durationOptions)) {
                            return this.wrap(<DurationDateFormElement key={idx} label={formElement.name}
                                                                      actionName={this.props.actions["DATE_DURATION_CHANGE"]}
                                                                      durationOptions={formElement.durationOptions}
                                                                      duration={this.getDuration(formElement.concept, this.props.formElementsUserState[formElement.uuid], formElement)}
                                                                      dateValue={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                                                      validationResult={validationResult}
                                                                      element={formElement}/>, idx, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Time) {
                            return this.wrap(<TimeFormElement key={idx}
                                                              element={formElement}
                                                              actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                                              timeValue={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                                              validationResult={validationResult}/>, idx, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Duration && !_.isNil(formElement.durationOptions)) {
                            return this.wrap(<DurationFormElement key={idx} label={formElement.name}
                                                                  actionName={this.props.actions["DURATION_CHANGE"]}
                                                                  compositeDuration={this.getCompositeDuration(formElement.concept, formElement)}
                                                                  noDateMessageKey='chooseADate'
                                                                  validationResult={validationResult}
                                                                  element={formElement}/>, idx, formElement.uuid === erroredUUID);
                        } else if ([Concept.dataType.Image, Concept.dataType.Video].includes(formElement.concept.datatype)) {
                            return this.wrap(<MediaFormElement
                                key={idx}
                                element={formElement}
                                actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                value={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                validationResult={validationResult}
                            />, idx, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Id) {
                            return this.wrap(<IdFormElement
                                key={idx}
                                element={formElement}
                                actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                value={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                validationResult={validationResult}
                                multiline={false}
                            />, idx, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Location) {
                            return this.wrap(<LocationHierarchyFormElement
                                key={idx}
                                element={formElement}
                                actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                value={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                validationResult={validationResult}
                            />, idx, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Subject && formElement.isSingleSelect()) {
                            return this.wrap(<SingleSelectSubjectFormElement
                                key={idx}
                                element={formElement}
                                value={this.getSelectedAnswer(formElement.concept, new SingleCodedValue())}
                                actionName={this.props.actions["TOGGLE_SINGLESELECT_ANSWER"]}
                                validationResult={validationResult}
                            />, idx, formElement.uuid === erroredUUID);
                        } else if (formElement.concept.datatype === Concept.dataType.Subject && formElement.isMultiSelect()) {
                            return this.wrap(<MultiSelectSubjectFormElement
                                key={idx}
                                element={formElement}
                                value={this.getSelectedAnswer(formElement.concept, new MultipleCodedValues())}
                                actionName={this.props.actions["TOGGLE_MULTISELECT_ANSWER"]}
                                validationResult={validationResult}
                            />, idx, formElement.uuid === erroredUUID);
                        }
                    })
                }
            </View>
        );
    }
}

export default FormElementGroup;
