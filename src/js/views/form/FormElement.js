import {View, StyleSheet} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import moment from "moment";
import {
    Text, Button, Content, CheckBox, Grid, Col, Row, Container, Header, Title, Icon, InputGroup,
    Input
} from "native-base";
import DynamicGlobalStyles from '../primitives/DynamicGlobalStyles';


class FormElement extends AbstractComponent {
    static propTypes = {
        element: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        console.log(this.props.element.name);
        return (
            <View><Row style={{backgroundColor: '#ffffff', marginTop: 10, marginBottom: 10}}>
            <Text style={DynamicGlobalStyles.formElementLabel}>Complaint</Text>
        </Row>
        <Row style={{
            padding: 28,
                backgroundColor: '#ffffff',
                height: 360,
                borderWidth: 1
        }}>
    <Col>
        {['Fever', 'Chloroquine Resistant', 'Bodyache', 'Headache', 'Giddyness'
            , 'Diarrhoea', 'Wound', 'Ringworm'].map(
            function (item) {
                return <Row>
                    <CheckBox/>
                    <Text style={{fontSize: 16, marginLeft:11}}>{item}</Text>
                </Row>;
            })}
    </Col>
        <Col>
            {['Vomiting', 'Cough', 'Cold', 'Acidity', 'Abdominal Pain', 'Pregnancy'
                , 'Scabies', 'Boils'].map(
                function (item) {
                    return <Row><CheckBox/>
                        <Text style={{fontSize: 16, marginLeft:11}}>{item}</Text>
                    </Row>;
                })}
        </Col>
    </Row></View>);
    }
}

export default FormElement;