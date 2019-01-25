import {ListView, Text, View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import ConceptService from "../../service/ConceptService";
import {Concept, Observation} from "openchs-models";
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import _ from "lodash";
import Separator from "../primitives/Separator";
import ExpandableImage from "./ExpandableImage";
import ExpandableVideo from "./ExpandableVideo";

const renderTypes = {
    Image: "Image",
    Text: "Text",
};

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
                    marginHorizontal: 3,
                    backgroundColor: Colors.HighlightBackgroundColor
                },
                observationRow: {borderRightWidth: 1, borderColor: 'rgba(0, 0, 0, 0.12)'},
                observationColumn: {
                    borderLeftWidth: 1,
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    paddingLeft: 3,
                    paddingBottom: 2,
                    flex: 1
                }
            }
            :
            {
                observationTable: {
                    marginHorizontal: 3,
                    backgroundColor: Colors.GreyContentBackground
                },
                observationRow: {borderRightWidth: 1, borderColor: 'rgba(0, 0, 0, 0.12)'},
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

    renderValue(obs, isAbnormal, renderType) {
        if ([Concept.dataType.Image, Concept.dataType.Video].includes(renderType)) {
            return (
                <View style={this.styles.observationColumn}>
                    {renderType === Concept.dataType.Image && <ExpandableImage source={obs}/>}
                    {renderType === Concept.dataType.Video && <ExpandableVideo source={obs}/>}
                </View>
            );
        }
        return (
            <Text style={[{
                textAlign: 'left',
                fontSize: Fonts.Medium,
                color: isAbnormal ? Styles.redColor : Styles.blackColor
            }, this.styles.observationColumn]}>{obs}</Text>
        )
    }


    render() {
        if (this.props.observations.length === 0) return <View/>;

        const conceptService = this.context.getService(ConceptService);
        const orderedObservation = this.getOrderedObservation()
            .map(obs => [this.I18n.t(obs.concept.name), Observation.valueAsString(obs, conceptService, this.I18n), obs.isAbnormal(), obs.concept.datatype]);
        const dataSource = new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(orderedObservation);
        return (
            <View style={[{flexDirection: "column", paddingBottom: 10}, this.props.style]}>
                {this.renderTitle()}
                <ListView
                    enableEmptySections={true}
                    dataSource={dataSource}
                    style={this.styles.observationTable}
                    pageSize={20}
                    initialListSize={10}
                    removeClippedSubviews={true}
                    renderSeparator={(ig, idx) => (<Separator key={idx} height={1}/>)}
                    renderHeader={() => (<Separator height={1} backgroundColor={'rgba(0, 0, 0, 0.12)'}/>)}
                    renderRow={([name, obs, isAbnormal, renderType]) =>
                        < View style={[{flexDirection: "row"}, this.styles.observationRow]}>
                            <Text style={[{
                                textAlign: 'left',
                                fontSize: Fonts.Normal,
                                color: Styles.greyText
                            }, this.styles.observationColumn]}>{name}</Text>
                            {this.renderValue(obs, isAbnormal, renderType)}
                        </View>}
                />
            </View>
        );
    }
}

export default Observations;
