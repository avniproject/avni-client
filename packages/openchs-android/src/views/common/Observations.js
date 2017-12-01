import {Text, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Col, Grid, Row} from "native-base";
import ConceptService from "../../service/ConceptService";
import {Observation} from "openchs-models";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import _ from "lodash";

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
                                        fontSize: Fonts.Normal,
                                        color: Styles.greyText
                                    }}>{this.I18n.t(observation.concept.name)}</Text>
                                </Col>
                                <Col style={this.styles.observationColumn} key={`${cellIndex}col2`} size={2}>
                                    <Text style={{
                                        textAlign: 'left',
                                        fontSize: Fonts.Medium,
                                        color: observation.isAbnormal()? Styles.redColor: Styles.blackColor
                                    }}>{Observation.valueAsString(observation, conceptService, this.I18n)}</Text>
                                </Col>
                            </Row>
                        })
                    }
                </Grid>
            </View>


        );
    }

    getTextElement(observation) {
        if (observation.getValueWrapper().isMultipleCoded) {
            return <Text >{observation.getValueWrapper().getValue().map((value, cellIndex) =>{
                let answerConcept = this.context.getService(ConceptService).getConceptByUUID(value);
                const  conceptAnswer = observation.concept.answers.find((conceptAnswer) => conceptAnswer.concept.name === answerConcept.name);
                return <Text key={`${cellIndex}`}><Text style={{
                textAlign: 'left',
                fontSize: Fonts.Medium,
                color: conceptAnswer.abnormal? Styles.redColor: Styles.blackColor
                }} >{this.I18n.t(answerConcept.name)}</Text> {this.getComma(cellIndex < observation.getValueWrapper().getValue().length - 1)}</Text>
            })
            }</Text>
        }else if (observation.getValueWrapper().isSingleCoded){
            let answerConcept = this.context.getService(ConceptService).getConceptByUUID(observation.getValueWrapper().getValue());
            const  conceptAnswer = observation.concept.answers.find((conceptAnswer) => conceptAnswer.concept.name === answerConcept.name);
            return <Text style={{
                textAlign: 'left',
                fontSize: Fonts.Medium,
                color: conceptAnswer.abnormal? Styles.redColor: Styles.blackColor
            }} >{this.I18n.t(answerConcept.name)}</Text>
        }
            else{
            return <Text style={{
                textAlign: 'left',
                fontSize: Fonts.Medium,
                color: observation.isAbnormal()? Styles.redColor: Styles.blackColor
            }}>{Observation.valueAsString(observation, this.context.getService(ConceptService), this.I18n)}</Text>
        }

    }

    getComma(get) {
        return get === true ?  <Text style={{color: Styles.blackColor}}>,</Text> : null;
    }
}

export default Observations;