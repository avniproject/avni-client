import {ListView, Text, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
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
        highlight: React.PropTypes.bool,
        form: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
        this.createObservationsStyles(props.highlight);
        this.getOrderedObservation = this.getOrderedObservation.bind(this);
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
                    paddingBottom: 2,
                    flex: 1
                }
            }
    }

    renderTitle() {
        if (this.props.title) return (<Text style={Fonts.Title}>{this.props.title}</Text>);
    }

    getOrderedObservation() {
        return _.isNil(this.props.form) ? this.props.observations :
            this.props.form.orderObservations(this.props.observations);
    }

    render() {
        if (this.props.observations.length === 0) return <View/>;

        const conceptService = this.context.getService(ConceptService);
        const orderedObservation = this.getOrderedObservation()
            .map(obs => [this.I18n.t(obs.concept.name), Observation.valueAsString(obs, conceptService, this.I18n), obs.isAbnormal()]);
        const dataSource = new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(orderedObservation);
        return (
            <View style={{flexDirection: "column"}}>
                {this.renderTitle()}
                <ListView
                    enableEmptySections={true}
                    dataSource={dataSource}
                    pageSize={20}
                    initialListSize={10}
                    removeClippedSubviews={true}
                    renderRow={([name, obs, isAbnormal]) =>
                        < View style={[{flexDirection: "row"}, this.styles.observationRow]}>
                            <Text style={[{
                                textAlign: 'left',
                                fontSize: Fonts.Normal,
                                color: Styles.greyText
                            }, this.styles.observationColumn]}>{name}</Text>
                            <Text style={[{
                                textAlign: 'left',
                                fontSize: Fonts.Medium,
                                color: isAbnormal ? Styles.redColor : Styles.blackColor
                            }, this.styles.observationColumn]}>{obs}</Text>
                        </View>}
                />
            </View>
        );
    }
}

export default Observations;