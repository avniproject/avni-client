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
        if (this.props.observations.length === 0) return <View/>;

        const numberOfColumns = DGS.numberOfRows(this.props.observations.length);
        const conceptService = this.context.getService(ConceptService);

        return (
            <View style={this.appendedStyle({backgroundColor: Colors.GreyContentBackground})}>
                <Grid style={DGS.observations.observationTable}>
                    <Row style={DGS.observations.observationRowHeader}>
                        <Col style={DGS.observations.observationColumn}>
                            <Text style={{textAlign: 'center', fontSize: Fonts.Normal}}>{this.I18n.t('name')}</Text>
                        </Col>
                        <Col style={DGS.observations.observationColumn}>
                            <Text style={{textAlign: 'center', fontSize: Fonts.Normal}}>{this.I18n.t('value')}</Text>
                        </Col>
                    </Row>
                    {
                        this.props.observations.map((observation, cellIndex) => {
                            return <Row style={DGS.observations.observationRow} key={`${cellIndex}`}>
                                <Col style={DGS.observations.observationColumn} key={`${cellIndex}col1`}>
                                    <Text style={{textAlign: 'left', fontSize: Fonts.Normal}}>{this.I18n.t(observation.concept.name)}</Text>
                                </Col>
                                <Col style={DGS.observations.observationColumn} key={`${cellIndex}col2`}>
                                    <Text style={{textAlign: 'left', fontSize: Fonts.Large}}>{Observation.valueAsString(observation, conceptService)}</Text>
                                </Col>
                            </Row>
                        })
                    }
                </Grid>
            </View>
        );
    }
}

export default Observations;