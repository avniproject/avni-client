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

class FormElementGroup extends AbstractComponent {
    static propTypes = {
        group: React.PropTypes.object.isRequired,
        observationHolder: React.PropTypes.object.isRequired,
        actions: React.PropTypes.object.isRequired,
        validationResults: React.PropTypes.array.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const formElements = this.props.group.getFormElements();
        return (<View>
                {formElements.length === 0 ? <View/> : <Text>{this.I18n.t(this.props.group.name)}</Text>}
                {
                    formElements.map((formElement, idx) => {
                        const validationResult = _.find(this.props.validationResults, (validationResult) => validationResult.formIdentifier === formElement.uuid);
                        if (formElement.concept.datatype === Concept.dataType.Numeric) {
                            return <NumericFormElement key={idx}
                                                       element={formElement}
                                                       actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                                       value={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                                       validationResult={validationResult}/>
                        } else if (formElement.concept.datatype === Concept.dataType.Text) {
                            return <TextFormElement key={idx}
                                                    element={formElement}
                                                    actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                                    value={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                                    validationResult={validationResult}
                            />
                        } else if (formElement.concept.datatype === Concept.dataType.Coded && formElement.isMultiSelect()) {
                            return <MultiSelectFormElement key={idx}
                                                           element={formElement}
                                                           multipleCodeValues={this.getSelectedAnswer(formElement.concept, new MultipleCodedValues())}
                                                           actionName={this.props.actions["TOGGLE_MULTISELECT_ANSWER"]} validationResult={validationResult}/>
                        } else if (formElement.concept.datatype === Concept.dataType.Coded && formElement.isSingleSelect()) {
                            return <SingleSelectFormElement key={idx}
                                                            element={formElement}
                                                            singleCodedValue={this.getSelectedAnswer(formElement.concept, new SingleCodedValue())}
                                                            actionName={this.props.actions["TOGGLE_SINGLESELECT_ANSWER"]} validationResult={validationResult}/>
                        } else if (formElement.concept.datatype === Concept.dataType.Boolean) {
                            return <BooleanFormElement key={idx}
                                                       element={formElement}
                                                       observationValue={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                                       actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]} validationResult={validationResult}/>
                        } else if (formElement.concept.datatype === Concept.dataType.Date) {
                            return <DateFormElement key={idx}
                                                    element={formElement}
                                                    actionName={this.props.actions["PRIMITIVE_VALUE_CHANGE"]}
                                                    dateValue={this.getSelectedAnswer(formElement.concept, new PrimitiveValue())}
                                                    validationResult={validationResult}/>
                        }
                    })
                }
            </View>
        );
    }

    getSelectedAnswer(concept, nullReplacement) {
        const observation = this.props.observationHolder.findObservation(concept);
        return _.isNil(observation) ? nullReplacement : observation.getValueWrapper();
    }
}

export default FormElementGroup;
