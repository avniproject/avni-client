import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import MultiSelectFormElement from './MultiSelectFormElement';
import SingleSelectFormElement from './SingleSelectFormElement';
import NumericFormElement from './NumericFormElement';
import Actions from "../../action/index";


class FormElementGroup extends AbstractComponent {
    static propTypes = {
        group: React.PropTypes.object.isRequired
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
                                return <MultiSelectFormElement element={formElement}/>
                            case 'singleselect':
                                return <SingleSelectFormElement element={formElement} />
                        }
                    })
                }
            </View>
        );
    }
}

export default FormElementGroup;
