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

    renderValue(observationModel) {
        const conceptService = this.context.getService(ConceptService);
        const subjectService = this.context.getService(IndividualService);
        const concept = observationModel.concept;
        const mobileNo = observationModel.getMobileNo();
        const renderType = observationModel.concept.datatype;
        const isAbnormal = observationModel.isAbnormal();

        let addressLevelService = null;
        if (renderType === Concept.dataType.Location) {
            const isWithinCatchment = concept.recordValueByKey(Concept.keys.isWithinCatchment);
            addressLevelService = this.getService(isWithinCatchment ? AddressLevelService : LocationHierarchyService);
        }

        const displayable = Observation.valueForDisplay({
            observation: observationModel,
            conceptService,
            subjectService,
            addressLevelService,
            i18n: this.I18n
        });

        if ([Concept.dataType.Image, Concept.dataType.Video].includes(renderType)) {
            return (
                <View style={this.styles.observationColumn}>
                    <ExpandableMedia source={displayable.displayValue} type={renderType}/>
                </View>
            );
        } else if (Concept.dataType.Subject === renderType) {
            return <View style={[{
                flexDirection: 'row',
                alignItems: 'flex-start', flexWrap: 'wrap'
            }, this.styles.observationColumn]}>
                {_.map(displayable, subject => this.renderSubject(subject))}
            </View>
        } else if (mobileNo) {
            return (
                <Text style={[{
                    textAlign: 'left',
                    fontSize: Fonts.Small,
                    color: isAbnormal ? Styles.redColor : Styles.blueColor
                }, this.styles.observationColumn]} onPress={() => {
                    this.makeCall(mobileNo)
                }}>{displayable.displayValue}</Text>
            )
        }
        return this.renderObservationText(isAbnormal, displayable.displayValue);
    }

    renderSubject(subject) {
        return <TouchableOpacity style={this.styles.observationSubject} onPress={() =>
            CHSNavigator.navigateToProgramEnrolmentDashboardView(this, subject.entityObject.uuid, null, true, null, null, 1)}>
            {this.renderChip(subject.displayValue)}
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

        const orderedObservation = this.getOrderedObservation()
            .map(observation => [observation]);
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
                    renderRow={([observation]) =>
                        < View style={[{flexDirection: "row"}, this.styles.observationRow]}>
                            <Text style={[{
                                textAlign: 'left',
                                fontSize: Fonts.Small,
                                color: Styles.greyText
                            }, this.styles.observationColumn]}>{this.I18n.t(observation.concept.name)}</Text>
                            {this.renderValue(observation)}
                        </View>}
                />
            </View>
        );
    }
}

export default Observations;