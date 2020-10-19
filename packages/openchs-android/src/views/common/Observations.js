import {ListView, Text, TouchableOpacity, View} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import ConceptService from "../../service/ConceptService";
import {Concept, Observation} from 'avni-models';
import Fonts from "../primitives/Fonts";
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import _ from "lodash";
import Separator from "../primitives/Separator";
import ExpandableMedia from "./ExpandableMedia";
import RNImmediatePhoneCall from 'react-native-immediate-phone-call';
import AddressLevelService from "../../service/AddressLevelService";
import LocationHierarchyService from "../../service/LocationHierarchyService";
import IndividualService from "../../service/IndividualService";
import CHSNavigator from "../../utility/CHSNavigator";

const renderTypes = {
    Image: "Image",
    Text: "Text",
};

class Observations extends AbstractComponent {
    static propTypes = {
        observations: PropTypes.any.isRequired,
        style: PropTypes.object,
        title: PropTypes.string,
        highlight: PropTypes.bool,
        form: PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
        this.createObservationsStyles(props.highlight);
        this.getOrderedObservation = this.getOrderedObservation.bind(this);
        this.individualService = context.getService(IndividualService);
    }

    createObservationsStyles(highlight) {
        this.styles = highlight ?
            {
                observationTable: {
                    backgroundColor: Colors.HighlightBackgroundColor
                },
                observationRow: {borderRightWidth: 1, borderColor: 'rgba(0, 0, 0, 0.12)'},
                observationColumn: {
                    borderLeftWidth: 1,
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    paddingLeft: 3,
                    paddingBottom: 2,
                    flex: 1
                },
                observationSubject: {
                    marginBottom: 2,
                    marginTop: 2,
                    marginLeft: 2,
                    borderRadius: 10,
                    borderWidth: 0.5,
                    backgroundColor: Colors.GreyBackground,
                    paddingHorizontal: 5,
                    paddingVertical: 2,
                }
            }
            :
            {
                observationTable: {
                    backgroundColor: Colors.cardBackgroundColor
                },
                observationRow: {borderRightWidth: 1, borderColor: 'rgba(0, 0, 0, 0.12)'},
                observationColumn: {
                    borderLeftWidth: 1,
                    borderColor: 'rgba(0, 0, 0, 0.12)',
                    paddingLeft: 3,
                    paddingBottom: 2,
                    flex: 1
                },
                observationSubject: {
                    marginBottom: 2,
                    marginTop: 2,
                    marginLeft: 2,
                    borderRadius: 10,
                    borderWidth: 0.5,
                    backgroundColor: Colors.GreyBackground,
                    paddingHorizontal: 5,
                    paddingVertical: 2,
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


    makeCall(number) {
        RNImmediatePhoneCall.immediatePhoneCall(number);
    }


    renderValue(obs, isAbnormal, renderType, concept) {
        const keyValue = concept.recordValueByKey('primary_contact') || concept.recordValueByKey('contact_number');
        if ([Concept.dataType.Image, Concept.dataType.Video].includes(renderType)) {
            return (
                <View style={this.styles.observationColumn}>
                    <ExpandableMedia source={obs} type={renderType}/>
                </View>
            );
        } else if (Concept.dataType.Location === renderType) {
            const isWithinCatchment = !!concept.recordValueByKey(Concept.keys.isWithinCatchment);
            const addressLevelService = this.getService(isWithinCatchment ? AddressLevelService : LocationHierarchyService);
            const addressLevel = addressLevelService.findByUUID(_.trim(obs));
            return this.renderObservationText(isAbnormal, addressLevel.name);
        } else if (Concept.dataType.Subject === renderType) {
            const subjectUUIDs = obs.split(",");
            return <View style={[{
                flexDirection: 'row',
                alignItems: 'flex-start', flexWrap: 'wrap'
            }, this.styles.observationColumn]}>
                {_.map(subjectUUIDs, uuid => this.renderSubject(this.individualService.findByUUID(_.trim(uuid))))}
            </View>
        } else if (keyValue === 'yes') {
            return (
                <Text style={[{
                    textAlign: 'left',
                    fontSize: Fonts.Small,
                    color: isAbnormal ? Styles.redColor : Styles.blueColor
                }, this.styles.observationColumn]} onPress={() => {
                    this.makeCall(obs)
                }}>{obs}</Text>
            )
        }


        return (
            <Text style={[{
                textAlign: 'left',
                fontSize: Fonts.Small,
                color: isAbnormal ? Styles.redColor : Styles.blackColor
            }, this.styles.observationColumn]}>{obs}</Text>
        )

        return this.renderObservationText(isAbnormal, obs);

    }

    renderSubject(subject) {
        return <TouchableOpacity style={this.styles.observationSubject} onPress={() =>
            CHSNavigator.navigateToProgramEnrolmentDashboardView(this, subject.uuid, null, true, null, null, 1)}>
            {this.renderChip(subject.nameString)}
        </TouchableOpacity>
    }

    renderChip(name) {
        return <Text style={{fontSize: Fonts.Small,}}>{name}</Text>;
    }

    renderObservationText(isAbnormal, obs, additionalStyles) {
        return <Text style={[{
            textAlign: 'left',
            fontSize: Fonts.Small,
            color: isAbnormal ? Styles.redColor : Styles.blackColor
        }, this.styles.observationColumn, additionalStyles]}>{obs}</Text>;
    }

    render() {
        if (this.props.observations.length === 0) return <View/>;

        const conceptService = this.context.getService(ConceptService);
        const orderedObservation = this.getOrderedObservation()
            .map(obs => [this.I18n.t(obs.concept.name), Observation.valueAsString(obs, conceptService, this.I18n), obs.isAbnormal(), obs.concept.datatype, obs.concept]);
        const dataSource = new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(orderedObservation);
        return (
            <View style={[{flexDirection: "column", paddingVertical: 3}, this.props.style]}>
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
                    renderRow={([name, obs, isAbnormal, renderType, concept]) =>
                        < View style={[{flexDirection: "row"}, this.styles.observationRow]}>
                            <Text style={[{
                                textAlign: 'left',
                                fontSize: Fonts.Small,
                                color: Styles.greyText
                            }, this.styles.observationColumn]}>{name}</Text>
                            {this.renderValue(obs, isAbnormal, renderType, concept)}
                        </View>}
                />
            </View>
        );
    }
}

export default Observations;