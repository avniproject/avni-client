import {StyleSheet, View} from "react-native";
import React, {Component} from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import _ from "lodash";
import {Col, Grid, Row, Text} from "native-base";
import DGS from "../primitives/DynamicGlobalStyles";
import ConceptService from "../../service/ConceptService";
import Observation from "../../models/Observation";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import General from "../../utility/General";

class Observations extends AbstractComponent {
    static propTypes = {
        observations: React.PropTypes.any.isRequired,
        style: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    render() {
        this.props.observations.forEach((observation) => General.logDebug('Observations', JSON.stringify(observation)));
        const observationRows = _.chunk(this.props.observations, DGS.numberOfRows(this.props.observations.length));
        const conceptService = this.context.getService(ConceptService);
        return (
            <View style={this.appendedStyle({backgroundColor: Colors.GreyContentBackground})}>
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
                                                <Text style={{textAlign: 'center', fontSize: Fonts.Large}}>{Observation.valueAsString(observation, conceptService)}</Text>
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