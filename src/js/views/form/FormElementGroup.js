import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import MultiSelectFormElement from './MultiSelectFormElement';
import SingleSelectFormElement from './SingleSelectFormElement';
import NumericFormElement from './NumericFormElement';
import {Actions} from "../../action/individual/IndividualEncounterActions";
import _ from "lodash";
import Concept from '../../models/Concept';
import FormElement from "../../models/application/FormElement";

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
                            return <NumericFormElement key={idx} element={formElement}/>
                        } else if (formElement.concept.datatype === Concept.dataType.Coded && formElement.keyValues[FormElement.keys.Select] === FormElement.values.Multi) {
                            return <MultiSelectFormElement key={idx}
                                                           element={formElement}
                                                           selectedAnswers={this.getSelectedAnswers(formElement.concept)}
                                                           actionName={Actions.TOGGLE_MULTISELECT_ANSWER}/>
                        } else if (formElement.concept.datatype === Concept.dataType.Coded && formElement.keyValues[FormElement.keys.Select] === FormElement.values.Single) {
                            return <SingleSelectFormElement key={idx}
                                                            element={formElement}
                                                            selectedAnswer={this.getSelectedAnswer(formElement.concept)}
                                                            actionName={Actions.TOGGLE_SINGLESELECT_ANSWER}/>
                        }
                    })
                }
            </View>
        );
    }

    getSelectedAnswers(concept) {
        let observations = this.props.encounter.observations.filter((observation) => {
                return observation.concept.uuid === concept.uuid;
            }
        );
        return _.isEmpty(observations) ? [] : observations[0].valueJSON.answer;
    }

    getSelectedAnswer(concept) {
        let observations = this.props.encounter.observations.filter((observation) => {
                return observation.concept.uuid === concept.uuid;
            }
        );
        return _.isEmpty(observations) ? {} : observations[0].valueJSON.answer;
    }
}

export default FormElementGroup;
