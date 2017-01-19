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

class Observations extends AbstractComponent {
    static propTypes = {
        observations: React.PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        const observationRows = _.chunk(this.props.observations, DGS.numberOfRows(this.props.observations.length));
        return (
            <View>
                {
                    observationRows.map((observationRow) => {
                        return (
                            <Grid>
                                <Row style={DGS.observations.observationRow}>
                                    {observationRow.map((observation) => {
                                        return (
                                            <Col>
                                                <Text>{observation.concept.name}</Text>
                                            </Col>
                                        );
                                    })}</Row>
                                <Row style={DGS.observations.observationRow}>
                                    {observationRow.map((observation) => {
                                        return (
                                            <Col>
                                                <Text>{Observation.valueAsString(observation, this.context.getService(ConceptService))}</Text>
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