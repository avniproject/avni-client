import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from "lodash";
import {
    Text, Button, Content, CheckBox, Grid, Col, Row, Container, Header, Title, Icon, InputGroup,
    Input, Radio
} from "native-base";
import DynamicGlobalStyles from '../primitives/DynamicGlobalStyles';
import MultiSelectFormElement from './MultiSelectFormElement';
import SingleSelectFormElement from './SingleSelectFormElement';


class FormElement extends AbstractComponent {
    static propTypes = {
        element: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        if (this.props.element.concept.datatype === 'numeric') {
            return (
                <View>
                    <Row style={{backgroundColor: '#ffffff', marginTop: 10, marginBottom: 10}}>
                        <Text style={DynamicGlobalStyles.formElementLabel}>{this.props.element.name}</Text>
                    </Row>
                    <Row>
                        <InputGroup style={{flex: 1}} borderType='underline'>
                            <Input/>
                        </InputGroup>
                    </Row>

                </View>)
        }
        else if(this.props.element.concept.datatype === 'multiselect') {
            return <MultiSelectFormElement element={this.props.element}/>
        }
        else if (this.props.element.concept.datatype === 'singleselect') {
            return <SingleSelectFormElement element={this.props.element} />
        }
    }
}

export default FormElement;