import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import MultiSelectFormElement from './MultiSelectFormElement';
import SingleSelectFormElement from './SingleSelectFormElement';
import NumericFormElement from './NumericFormElement';
import {Actions} from "../../action/individual/IndividualEncounterActions";
import _ from "lodash";


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
                    this.props.group.formElements.map((formElement) => {
                        switch (formElement.concept.datatype){
                            case 'numeric' :
                                return <NumericFormElement element={formElement} />
                            case 'multiselect':
                                return <MultiSelectFormElement element={formElement}
                                                               selectedAnswers={this.getSelectedAnswers(formElement.concept.uuid)}
                                                               actionName={Actions.TOGGLE_MULTISELECT_ANSWER}/>
                            case 'singleselect':
                                return <SingleSelectFormElement element={formElement} />
                        }
                    })
                }
            </View>
        );
    }

    getSelectedAnswers(conceptUUID) {
        let observations = this.props.encounter.observations.filter( (observation) => {
             return observation.conceptUUID === conceptUUID;
            }
        );
        return _.isEmpty(observations) ? [] : observations[0].valueJSON.answer;


    }
}

export default FormElementGroup;
