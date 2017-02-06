import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import MultiSelectFormElement from './MultiSelectFormElement';
import SingleSelectFormElement from './SingleSelectFormElement';
import BooleanFormElement from './BooleanFormElement';
import NumericFormElement from './NumericFormElement';
import {Actions} from "../../action/individual/IndividualEncounterActions";
import _ from "lodash";
import Concept from '../../models/Concept';
import MultipleCodedValues from "../../models/observation/MultipleCodedValues";
import SingleCodedValue from "../../models/observation/SingleCodedValue";

class FormElementGroup extends AbstractComponent {
    static propTypes = {
        group: React.PropTypes.object.isRequired,
        encounter: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        return (<View>
                {
                    this.props.group.formElements.map((formElement, idx) => {
                        if (formElement.concept.datatype === Concept.dataType.Numeric) {
                            return <NumericFormElement key={idx} element={formElement} actionName={Actions.TEXT_INPUT_CHANGE}/>
                        } else if (formElement.concept.datatype === Concept.dataType.Coded && formElement.isMultiSelect()) {
                            return <MultiSelectFormElement key={idx}
                                                           element={formElement}
                                                           multipleCodeValues={this.getSelectedAnswer(formElement.concept, new MultipleCodedValues())}
                                                           actionName={Actions.TOGGLE_MULTISELECT_ANSWER}/>
                        } else if (formElement.concept.datatype === Concept.dataType.Coded && formElement.isSingleSelect()) {
                            return <SingleSelectFormElement key={idx}
                                                            element={formElement}
                                                            singleCodedValue={this.getSelectedAnswer(formElement.concept, new SingleCodedValue())}
                                                            actionName={Actions.TOGGLE_SINGLESELECT_ANSWER}/>
                        } else if (formElement.concept.datatype === Concept.dataType.Boolean) {
                            return <BooleanFormElement key={idx}
                                                       element={formElement}
                                                       value={this.getSelectedAnswer(formElement.concept, null)}
                                                       actionName={Actions.TOGGLE_SINGLESELECT_ANSWER}/>
                        }
                    })
                }
            </View>
        );
    }

    getSelectedAnswer(concept, nullReplacement) {
        const observation = this.findObservation(concept);
        return _.isNil(observation) ? nullReplacement : observation.valueJSON;
    }

    findObservation(concept) {
        return _.find(this.props.encounter.observations, (observation) => {
            return observation.concept.uuid === concept.uuid;
        });
    }
}

export default FormElementGroup;
