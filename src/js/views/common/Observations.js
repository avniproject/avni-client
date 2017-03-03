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

class Observations extends AbstractComponent {
    static propTypes = {
        observations: React.PropTypes.object.isRequired,
        encounterNumber: React.PropTypes.number.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const observationRows = _.chunk(this.props.observations, DGS.numberOfRows(this.props.observations.length));
        return (
            <View style={DGS.observations.component}>
                {
                    observationRows.map((observationRow) => {
                        return (
                            <Grid style={DGS.observations.observationTable}>
                                <Row style={DGS.observations.observationRowHeader}>
                                    {observationRow.map((observation) => {
                                        return (
                                            <Col style={DGS.observations.observationColumn}>
                                                <Text style={{textAlign: 'center', fontSize: Fonts.Normal}}>{observation.concept.name}</Text>
                                            </Col>
                                        );
                                    })}</Row>
                                <Row style={DGS.observations.observationRow}>
                                    {observationRow.map((observation) => {
                                        return (
                                            <Col style={DGS.observations.observationColumn}>
                                                <Text style={{textAlign: 'center', fontSize: 16}}>{Observation.valueAsString(observation, this.context.getService(ConceptService))}</Text>
                                            </Col>
                                        );
                                    })}</Row>
                            </Grid>)
                    })
                }
            </View>
        );
    }

    getBackgroundColor(encounterNumber) {
        return encounterNumber % 2 ? '#f7f7f7' : '';
    }
}

export default Observations;