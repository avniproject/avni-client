import {Text, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Col, Grid, Row} from "native-base";
import ConceptService from "../../service/ConceptService";
import Observation from "../../models/Observation";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";

class Observations extends AbstractComponent {
    static propTypes = {
        observations: React.PropTypes.any.isRequired,
        style: React.PropTypes.object,
        title: React.PropTypes.string,
        highlight: React.PropTypes.bool
    };

    constructor(props, context) {
        super(props, context);
        this.createObservationsStyles(props.highlight);
    }

    createObservationsStyles(highlight) {
        this.styles = highlight ?
            {
                observationTable: {
                    borderRightWidth: 1,
                    borderTopWidth: 1,
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    marginHorizontal: 3,
                    backgroundColor: Colors.HighlightBackgroundColor
                },
                observationRow: {borderBottomWidth: 1, borderColor: 'rgba(0, 0, 0, 0.12)'},
                observationColumn: {
                    borderLeftWidth: 1,
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    paddingLeft: 3,
                    paddingBottom: 2
                }
            }
            :
            {
                observationTable: {
                    borderRightWidth: 1,
                    borderTopWidth: 1,
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    marginHorizontal: 3,
                    backgroundColor: Colors.GreyContentBackground
                },
                observationRow: {borderBottomWidth: 1, borderColor: 'rgba(0, 0, 0, 0.12)'},
                observationColumn: {
                    borderLeftWidth: 1,
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    paddingLeft: 3,
                    paddingBottom: 2
                }
            }
    }

    get allObservationNamesSmall() {
        return !this.props.observations.some((obs) => obs.concept.name.length > 17);
    }

    renderTitle() {
        if (this.props.title) return (<Text style={Fonts.Title}>{this.props.title}</Text>);
    }

    render() {
        if (this.props.observations.length === 0) return <View/>;

        const conceptService = this.context.getService(ConceptService);
        const nameColSize = this.allObservationNamesSmall ? 1 : 2;

        return (
            <View style={{flexDirection: "column"}}>
                {this.renderTitle()}
                <Grid style={this.appendedStyle(this.styles.observationTable)}>
                    {
                        this.props.observations.map((observation, cellIndex) => {
                            return <Row style={this.styles.observationRow} key={`${cellIndex}`}>
                                <Col style={this.styles.observationColumn} key={`${cellIndex}col1`} size={nameColSize}>
                                    <Text style={{
                                        textAlign: 'left',
                                        fontSize: Fonts.Normal
                                    }}>{this.I18n.t(observation.concept.name)}</Text>
                                </Col>
                                <Col style={this.styles.observationColumn} key={`${cellIndex}col2`} size={2}>
                                    <Text style={{
                                        textAlign: 'left',
                                        fontSize: Fonts.Medium
                                    }}>{Observation.valueAsString(observation, conceptService, this.I18n)}</Text>
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