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
        this.createObservationsStyles();
    }

    createObservationsStyles() {
        this.styles = {
            observationTable: {
                borderRightWidth: 1,
                borderTopWidth: 1,
                borderColor: 'rgba(0, 0, 0, 0.12)',
                marginHorizontal: 3,
                backgroundColor: Colors.GreyContentBackground
            },
            observationRow: {borderBottomWidth: 1, borderColor: 'rgba(0, 0, 0, 0.12)'},
            observationColumn: {borderLeftWidth: 1, borderColor: 'rgba(0, 0, 0, 0.12)', paddingLeft: 3}
        }
    }

    render() {
        if (this.props.observations.length === 0) return <View/>;

        const numberOfColumns = DGS.numberOfRows(this.props.observations.length);
        const conceptService = this.context.getService(ConceptService);

        return (
            <Grid style={this.appendedStyle(this.styles.observationTable)}>
                {
                    this.props.observations.map((observation, cellIndex) => {
                        return <Row style={this.styles.observationRow} key={`${cellIndex}`}>
                            <Col style={this.styles.observationColumn} key={`${cellIndex}col1`}>
                                <Text style={{textAlign: 'left', fontSize: Fonts.Normal}}>{this.I18n.t(observation.concept.name)}</Text>
                            </Col>
                            <Col style={this.styles.observationColumn} key={`${cellIndex}col2`}>
                                <Text style={{textAlign: 'left', fontSize: Fonts.Medium}}>{Observation.valueAsString(observation, conceptService)}</Text>
                            </Col>
                        </Row>
                    })
                }
            </Grid>
        );
    }
}

export default Observations;