import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import moment from "moment";
import {
    Text, Button, Content, CheckBox, Grid, Col, Row, Container, Header, Title, Icon, InputGroup,
    Input
} from "native-base";
import DynamicGlobalStyles from '../primitives/DynamicGlobalStyles';
import FormElement from './FormElement'


class FormElementGroup extends AbstractComponent {
    static propTypes = {
        group: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        console.log(this.props.group.formElements.length);
        return (<View>
                {
                    this.props.group.formElements.map((formElement) => {
                        console.log(formElement.concept.name);
                        return <FormElement element={formElement}/>
                    })
                }
            </View>
        );
    }
}

export default FormElementGroup;
