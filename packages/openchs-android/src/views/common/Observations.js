import {ListView, Text, TouchableOpacity, View} from "react-native";
import PropTypes from 'prop-types';
import React, {Fragment} from "react";
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
import MCIIcon from "react-native-vector-icons/MaterialCommunityIcons";
import {firebaseEvents, logEvent} from "../../utility/Analytics";
import EncounterService from "../../service/EncounterService";

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
        form: PropTypes.object,
        quickFormEdit: PropTypes.bool,
        onFormElementGroupEdit: PropTypes.func,
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
                },
                conceptNameStyle: {
                    textAlign: 'left',
                    fontSize: Fonts.Small,
                    color: Styles.greyText,
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
                },
                iconStyle: {
                    fontSize: 18,
                    marginRight: 10,
                    padding: 0,
                    alignSelf: 'center'
                },
                observationPhoneNumber: {
                    paddingLeft: 3,
                    paddingBottom: 2,
                    flex: 1,
                    textAlign: 'left',
                    fontSize: Fonts.Small,
                    color: Styles.blackColor
                },
                observationPhoneNumberContainer: {
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                },
                conceptNameStyle: {
                    textAlign: 'left',
                    fontSize: Fonts.Small,
                    color: Styles.greyText,
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
        const encounterService = this.context.getService(EncounterService);
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
            i18n: this.I18n,
            encounterService
        });

        if (Concept.dataType.Media.includes(renderType)) {
            const allMediaURIs = _.split(displayable.displayValue, ',');
            return (
                <View style={this.styles.observationColumn}>
                    <View style={{flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                    {_.map(allMediaURIs, (value, index) =>
                        <ExpandableMedia key={index} source={value} type={renderType} relatedMediaURIs={allMediaURIs}/>)}
                    </View>
                </View>
            );
        } else if (Concept.dataType.Subject === renderType) {
            return <View style={[{
                flexDirection: 'row',
                alignItems: 'flex-start', flexWrap: 'wrap'
            }, this.styles.observationColumn]}>
                {_.map(displayable, subject => this.renderSubject(subject))}
            </View>
        } else if (Concept.dataType.Encounter === renderType) {
            const allEncounterNames = _.map(displayable, ({displayValue}) => displayValue).join(', ');
            return <View style={[{
                flexDirection: 'row', alignItems: 'flex-start', flexWrap: 'wrap'
            }, this.styles.observationColumn]}>
                <Text style={{color: Styles.blackColor}}>{allEncounterNames}</Text>
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
        } else if (Concept.dataType.PhoneNumber === renderType) {
            return this.renderPhoneNumber(observationModel.getValueWrapper());
        }
        return this.renderObservationText(isAbnormal, displayable.displayValue);
    }

    renderPhoneNumber(phoneNumber) {
        const isVerified = phoneNumber.isVerified();
        const iconName = isVerified ? 'shield-check' : 'alert';
        const iconStyle = isVerified ? {color: Colors.AccentColor} : {color: Colors.ValidationError};
        return <View style={[this.styles.observationPhoneNumberContainer, this.styles.observationColumn]}>
            <Text style={this.styles.observationPhoneNumber}>{phoneNumber.getValue()}</Text>
            <MCIIcon name={iconName} style={[iconStyle, this.styles.iconStyle]}/>
        </View>
    }

    renderSubject(subject) {
        return <TouchableOpacity key={subject.entityObject.uuid} style={this.styles.observationSubject} onPress={() =>
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

    onFEGEdit(groupUUID) {
        logEvent(firebaseEvents.QUICK_FORM_EDIT);
        this.props.onFormElementGroupEdit(this.props.form.getFormElementGroupOrder(groupUUID));
    }

    observationTable(groupUUID, groupName, observations, groupStyles, quickFormEdit) {
        const initialFlex = quickFormEdit ? 1 : 0.9;
        return <View style={{flexDirection: 'column'}} key={groupUUID}>
            <View style={[{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 4,
                backgroundColor: 'rgba(0, 0, 0, 0.12)'
            }, this.styles.observationRow, this.styles.observationColumn, groupStyles]}>
                <View style={{flex: initialFlex, flexWrap: 'wrap'}}>
                    <Text style={[{fontWeight: 'bold'}, groupStyles]}>{this.I18n.t(groupName)}</Text>
                </View>
                {groupUUID && quickFormEdit &&
                <View style={{flex: 0.1}}>
                    <TouchableOpacity
                        onPress={() => this.onFEGEdit(groupUUID)}>
                        <Text style={{color: Colors.ActionButtonColor,}}>{this.I18n.t('edit')}</Text>
                    </TouchableOpacity>
                </View>}
            </View>
            {_.map(observations, (observation) => this.renderObservationValue(observation, {paddingLeft: 8}))}
        </View>;
    }

    renderNormalView(observation, extraConceptStyle) {
        return (
            <View style={[{flexDirection: "row"}, this.styles.observationRow]} key={observation.concept.uuid}>
                <Text style={[this.styles.conceptNameStyle, this.styles.observationColumn, extraConceptStyle]}>
                    {this.I18n.t(observation.concept.name)}
                </Text>
                {this.renderValue(observation)}
            </View>
        )
    }

    renderQuestionGroup(questionGroupObservations, index) {
        return (
            _.map(questionGroupObservations, obs => (
                <View key={`${obs.concept.uuid}-${index}`} style={[{flexDirection: "row"}, this.styles.observationRow]}>
                    <View style={{width: 5, backgroundColor: 'rgba(0, 0, 0, 0.12)'}}/>
                    <View style={this.styles.observationColumn}>
                        <Text style={[this.styles.conceptNameStyle, {paddingLeft: 10}]}>
                            {this.I18n.t(obs.concept.name)}
                        </Text>
                    </View>
                    {this.renderValue(obs)}
                </View>
            ))
        )
    }

    renderRepeatableQuestionGroup(repeatableObservations) {
        return (
            _.map(repeatableObservations, (questionGroupObservations, index) => (
                <Fragment key={index}>
                    {index !== 0 && <Separator/>}
                    {this.renderQuestionGroup(questionGroupObservations.getValue(), index)}
                </Fragment>
            ))
        )
    }

    renderGroupQuestionView(observation) {
        const valueWrapper = observation.getValueWrapper();
        const isRepeatable = valueWrapper && valueWrapper.isRepeatable();
        const observations = valueWrapper ? valueWrapper.getValue() : [];
        return (
            <Fragment key={observation.concept.uuid}>
                <View style={[{flexDirection: "row"}, this.styles.observationRow]}>
                    <View style={{width: 5, backgroundColor: 'rgba(0, 0, 0, 0.12)'}}/>
                    <Text style={[this.styles.conceptNameStyle, this.styles.observationColumn, observation.styles]}>
                        {this.I18n.t(observation.concept.name)}
                    </Text>
                    <View style={[this.styles.observationColumn, observation.styles]}/>
                </View>
                {isRepeatable ?
                    this.renderRepeatableQuestionGroup(observations) :
                    this.renderQuestionGroup(observations, 0)}
            </Fragment>
        )
    }

    renderObservationValue(observation, extraConceptStyle) {
        return observation.concept.isQuestionGroup() ?
            this.renderGroupQuestionView(observation, extraConceptStyle) :
            this.renderNormalView(observation, extraConceptStyle);
    }

    renderObservationTable(quickFormEdit) {
        const sectionWiseObs = this.props.form.sectionWiseOrderedObservations(this.props.observations);
        const dataSource = new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(sectionWiseObs);

        return <ListView
            enableEmptySections={true}
            dataSource={dataSource}
            style={this.styles.observationTable}
            pageSize={20}
            initialListSize={10}
            removeClippedSubviews={true}
            renderSeparator={(ig, idx) => (<Separator key={idx} height={1}/>)}
            renderHeader={() => (<Separator height={1} backgroundColor={'rgba(0, 0, 0, 0.12)'}/>)}
            renderRow={({groupName, groupUUID, observations, groupStyles}) => this.observationTable(groupUUID, groupName, observations, groupStyles, quickFormEdit)}
        />;
    }

    render() {
        if (this.props.observations.length === 0) return <View/>;
        return (
            <View style={[{flexDirection: "column", paddingVertical: 3}, this.props.style]}>
                {this.renderTitle()}
                {this.renderObservationTable(this.props.quickFormEdit)}
            </View>
        );
    }
}

export default Observations;
