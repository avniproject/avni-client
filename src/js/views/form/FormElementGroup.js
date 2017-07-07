import {View, StyleSheet, Text} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import MultiSelectFormElement from './MultiSelectFormElement';
import SingleSelectFormElement from './SingleSelectFormElement';
import BooleanFormElement from './BooleanFormElement';
import NumericFormElement from './NumericFormElement';
import TextFormElement from './TextFormElement';
import DateFormElement from './DateFormElement';
import _ from "lodash";
import Concept from '../../models/Concept';
import MultipleCodedValues from "../../models/observation/MultipleCodedValues";
import SingleCodedValue from "../../models/observation/SingleCodedValue";
import PrimitiveValue from "../../models/observation/PrimitiveValue";
import DGS from '../primitives/DynamicGlobalStyles';
import Fonts from '../primitives/Fonts';
import Colors from '../primitives/Colors';
import Distances from '../primitives/Distances';
import ValidationResult from "../../models/application/ValidationResult";
import DurationDateFormElement from "./DurationDateFormElement";
import Duration from "../../models/Duration";
import General from "../../utility/General";

class FormElementGroup extends AbstractComponent {
    static propTypes = {
        group: React.PropTypes.object.isRequired,
        observationHolder: React.PropTypes.object.isRequired,
        actions: React.PropTypes.object.isRequired,
        validationResults: React.PropTypes.array.isRequired,
        formElementsUserState: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    wrap(x, idx) {
        return <View style={{marginTop: Distances.ScaledVerticalSpacingBetweenFormElements}} key={idx}>{x}</View>;
    }

    render() {
        const formElements = this.props.group.getFormElements();
        return (<View>
                {formElements.length <= 1 ? <View/> :
                    <Text style={{color: Colors.InputNormal, fontSize: Fonts.Medium, marginTop: DGS.resizeHeight(32)}}>{this.I18n.t(this.props.group.display)}</Text>}
                {
                    formElements.map((formElement, idx) => {
                        const validationResult = ValidationResult.findByFormIdentifier(this.props.validationResults, formElement.uuid);
                        if (formElement.concept.datatype === Concept.dataType.Numeric) {
                            return this.wrap(<NumericFormElement
                                element={formElement}
                                inputChangeActionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                endEditingActionName={this.props.actions["PRIMITIVE_VALUE_END_EDITING"]}
                                value={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                validationResult={validationResult}/>, idx);
                        } else if (formElement.concept.datatype === Concept.dataType.Text) {
                            return this.wrap(<TextFormElement
                                element={formElement}
                                actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                value={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                validationResult={validationResult}
                            />, idx);
                        } else if (formElement.concept.datatype === Concept.dataType.Coded && formElement.isMultiSelect()) {
                            return this.wrap(<MultiSelectFormElement key={idx}
                                                                     element={formElement}
                                                                     multipleCodeValues={this.getSelectedAnswer(formElement.concept, new MultipleCodedValues())}
                                                                     actionName={this.props.actions["TOGGLE_MULTISELECT_ANSWER"]}
                                                                     validationResult={validationResult}/>, idx);
                        } else if (formElement.concept.datatype === Concept.dataType.Coded && formElement.isSingleSelect()) {
                            return this.wrap(<SingleSelectFormElement key={idx}
                                                                      element={formElement}
                                                                      singleCodedValue={this.getSelectedAnswer(formElement.concept, new SingleCodedValue())}
                                                                      actionName={this.props.actions["TOGGLE_SINGLESELECT_ANSWER"]}
                                                                      validationResult={validationResult}/>, idx);
                        } else if (formElement.concept.datatype === Concept.dataType.Boolean) {
                            return this.wrap(<BooleanFormElement key={idx}
                                                                 element={formElement}
                                                                 observationValue={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                                                 actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]} validationResult={validationResult}/>, idx);
                        } else if (formElement.concept.datatype === Concept.dataType.Date && _.isNil(formElement.durationOptions)) {
                            return this.wrap(<DateFormElement key={idx}
                                                              element={formElement}
                                                              actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                                              dateValue={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                                              validationResult={validationResult}/>, idx);
                        } else if (!_.isNil(formElement.durationOptions)) {
                            return this.wrap(<DurationDateFormElement key={idx} label={formElement.name}
                                                                      actionName={this.props.actions["DURATION_CHANGE"]}
                                                                      durationOptions={formElement.durationOptions}
                                                                      duration={this.getDuration(formElement.concept, this.props.formElementsUserState[formElement.uuid], formElement)}
                                                                      noDateMessageKey='chooseADate'
                                                                      dateValue={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                                                      validationResult={validationResult} element={formElement}/>, idx);
                        }
                    })
                }
            </View>
        );
    }

    getDuration(concept, formElementUserState, formElement) {
        const observation = this.props.observationHolder.findObservation(concept);
        if (_.isNil(observation)) {
            return new Duration(null, formElement.durationOptions[0]);
        } else {
            const date = observation.getValueWrapper().getValue();
            //TODO discuss with Vivek if this is a fix in alignment with design
            if (_.isNil(formElementUserState)) {
                return Duration.fromToday(formElement.durationOptions[0], date);
            } else {
                return Duration.fromToday(formElementUserState.durationUnit, date);
            }
        }
    }

    getSelectedAnswer(concept, nullReplacement) {
        const observation = this.props.observationHolder.findObservation(concept);
        return _.isNil(observation) ? nullReplacement : observation.getValueWrapper();
    }
}

export default FormElementGroup;
