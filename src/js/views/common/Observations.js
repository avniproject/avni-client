import {View, StyleSheet} from 'react-native';
import React, {Component} from 'react';
import AbstractComponent from '../../framework/view/AbstractComponent';
import _ from "lodash";
import {
    Text, Button, Content, CheckBox, Grid, Col, Row, Container, Header, Title, Icon, InputGroup,
    Input, Radio
} from "native-base";
import DGS from '../primitives/DynamicGlobalStyles';
import ConceptService from "../../service/ConceptService";
import Observation from '../../models/Observation';
import Fonts from '../primitives/Fonts';
import Colors from '../primitives/Colors';

class Observations extends AbstractComponent {
    static propTypes = {
        observations: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const observationRows = _.chunk(this.props.observations, DGS.numberOfRows(this.props.observations.length));
        const conceptService = this.context.getService(ConceptService);
        return (
            <View style={DGS.observations.component}>
                {
                    observationRows.map((observationRow, rowIndex) => {
                        return (
                            <Grid style={DGS.observations.observationTable} key={`${rowIndex}`}>
                                <Row style={DGS.observations.observationRowHeader} key={`${rowIndex}1`}>
                                    {observationRow.map((observation, cellIndex) => {
                                        return (
                                            <Col style={DGS.observations.observationColumn} key={`${rowIndex}1${cellIndex}`}>
                                                <Text style={{textAlign: 'center', fontSize: Fonts.Normal}}>{observation.concept.name}</Text>
                                            </Col>
                                        );
                                    })}</Row>
                                <Row style={DGS.observations.observationRow} key={`${rowIndex}2`}>
                                    {observationRow.map((observation, cellIndex) => {
                                        return (
                                            <Col style={DGS.observations.observationColumn} key={`${rowIndex}2${cellIndex}`}>
                                                <Text style={{textAlign: 'center', fontSize: 16}}>{Observation.valueAsString(observation, conceptService)}</Text>
                                            </Col>
                                        );
                                    })}</Row>
                            </Grid>)
                    })
                }
            </View>
        );
    }
}

export default Observations;