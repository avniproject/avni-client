import {View, ListView, TouchableNativeFeedback, TouchableOpacity} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import {Text, Button} from "native-base";
import AbstractComponent from "../../framework/view/AbstractComponent";
import moment from "moment";
import DGS from "../primitives/DynamicGlobalStyles";
import Observations from "../common/Observations";
import CHSNavigator from "../../utility/CHSNavigator";
import ContextAction from "../viewmodel/ContextAction";
import Fonts from "../primitives/Fonts";
import _ from 'lodash';
import FormMappingService from "../../service/FormMappingService";
import EncounterService from "../../service/EncounterService";
import {Badge} from "../filter/AppliedFilters";
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";
import General from "../../utility/General";
import {Form} from 'openchs-models';
import Distances from "../primitives/Distances";
import ObservationsSectionOptions from "../common/ObservationsSectionOptions";
import Icon from 'react-native-vector-icons/AntDesign'

class PreviousEncounters extends AbstractComponent {
    static propTypes = {
        encounters: PropTypes.any.isRequired,
        formType: PropTypes.string.isRequired,
        style: PropTypes.object,
        onShowMore: PropTypes.func.isRequired,
        showCount: PropTypes.number,
        showPartial: PropTypes.bool.isRequired,
        emptyTitle: PropTypes.string,
        title: PropTypes.string,
        expandCollapseView: PropTypes.bool,
        onToggleAction: PropTypes.string,
    };

    constructor(props, context) {
        super(props, context);
    }

    editEncounter(encounter) {
        encounter = encounter.cloneForEdit();
        let editing = !encounter.isScheduled();
        encounter.encounterDateTime = _.isNil(encounter.encounterDateTime) ? new Date() : encounter.encounterDateTime;
        if (encounter.getName() === 'Encounter') {
            CHSNavigator.navigateToIndividualEncounterLandingView(this, null, encounter, editing);
        } else if (encounter.isCancelled()) {
            CHSNavigator.navigateToProgramEncounterCancelView(this, encounter, editing);
        } else {
            CHSNavigator.navigateToProgramEncounterView(this, encounter, editing);
        }

    }

    cancelEncounter(encounter) {
        CHSNavigator.navigateToProgramEncounterCancelView(this, encounter);
    }

    cancelVisitAction(encounter) {
        const encounterService = this.context.getService(EncounterService);
        if (encounterService.isEncounterTypeCancellable(encounter)) return new ContextAction('cancelVisit', () => this.cancelEncounter(encounter));
    }

    encounterActions(encounter) {
        return [new ContextAction('edit', () => this.editEncounter(encounter))];
    }

    renderExpandCollapseView(encounterInfo) {
        const formMappingService = this.context.getService(FormMappingService);
        return <View>
            <TouchableOpacity onPress={() => this.dispatchAction(this.props.onToggleAction, {
                encounterInfo: {...encounterInfo, expand: !encounterInfo.expand}
            })}>
                {this.renderTitle(encounterInfo.encounter)}
                <View style={{flex: 1, right: 2, position: 'absolute', alignSelf: 'center'}}>
                    {encounterInfo.expand === false ?
                        <Icon name={'down'} size={25}/> :
                        <Icon name={'up'} size={25}/>}
                </View>
            </TouchableOpacity>
            <View style={{height: encounterInfo.expand === false ? 0 : null, overflow: 'hidden'}}>
                <Observations form={formMappingService.findFormForEncounterType(encounterInfo.encounter.encounterType,
                    this.props.formType, encounterInfo.encounter.subjectType)}
                              observations={encounterInfo.encounter.getObservations()}/>
                <ObservationsSectionOptions contextActions={this.encounterActions(encounterInfo.encounter)}
                                            primaryAction={this.cancelVisitAction(encounterInfo.encounter)}/>
            </View>
        </View>
    }

    renderNormalView(encounter) {
        const formMappingService = this.context.getService(FormMappingService);
        return <View>
            {this.renderTitle(encounter)}
            <Observations form={formMappingService.findFormForEncounterType(encounter.encounterType,
                this.props.formType, encounter.subjectType)} observations={encounter.getObservations()}/>
            <ObservationsSectionOptions contextActions={this.encounterActions(encounter)}
                                        primaryAction={this.cancelVisitAction(encounter)}/>
        </View>
    }

    renderTitle(encounter) {
        const name = `${_.isNil(encounter.name) ? this.I18n.t(encounter.encounterType.displayName) : this.I18n.t(encounter.name)}`;
        const scheduledInfo = !_.isNil(encounter.earliestVisitDateTime) ? `${this.I18n.t('scheduled')}: ${moment(encounter.earliestVisitDateTime).format('DD-MM-YYYY')}` : '';
        const completedInfo = !_.isNil(encounter.encounterDateTime) ? `${this.I18n.t('completedVisits')}: ${moment(encounter.encounterDateTime).format('DD-MM-YYYY')}` : '';
        const cancellationInformation = encounter.isCancelled() ? `${this.I18n.t('cancelled')}: ${moment(encounter.cancelDateTime).format('DD-MM-YYYY')}` : '';
        const status = moment();
        return <View>
            <Text>{name}</Text>
            <View style={{flexDirection: 'column'}}>
                {[scheduledInfo, completedInfo, cancellationInformation].filter(e => !_.isEmpty(e)).map((e, index) =>
                    <Text key={index}>{e}</Text>)}
            </View>
        </View>;
    }

    render() {
        let toDisplayEncounters;
        let showingPartial = this.props.showPartial && (this.props.showCount < this.props.encounters.length);
        General.logDebug('PreviousEncounters.render', `ShowingPartial:${showingPartial}, ShowCount:${this.props.showCount}, Total:${this.props.encounters.length}`);
        if (this.props.showPartial) {
            let chronologicalEncounters = _.orderBy(this.props.encounters, ({encounter}) => encounter.encounterDateTime || encounter.cancelDateTime || encounter.earliestVisitDateTime, 'desc');
            toDisplayEncounters = _.slice(chronologicalEncounters, 0, this.props.showCount);
        } else {
            toDisplayEncounters = _.sortBy(this.props.encounters, (encounter) => encounter.encounterDateTime || encounter.cancelDateTime || encounter.earliestVisitDateTime);
        }
        const dataSource = new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(toDisplayEncounters);
        const renderable = _.isEmpty(toDisplayEncounters) ? (
            <View style={[DGS.common.content]}>
                <Text style={{fontSize: Fonts.Large}}>{this.props.emptyTitle}</Text>
            </View>) : (
            <View>
                <Text
                    style={[Fonts.MediumBold, {padding: Distances.ScaledContentDistanceFromEdge}]}>{this.props.title}</Text>
                <ListView
                    enableEmptySections={true}
                    dataSource={dataSource}
                    pageSize={1}
                    initialListSize={1}
                    removeClippedSubviews={true}
                    renderRow={(encounter) => <View style={{
                        padding: Distances.ScaledContentDistanceFromEdge,
                        margin: 4,
                        elevation: 2,
                        backgroundColor: Colors.cardBackgroundColor,
                        marginVertical: 3
                    }}>
                        {this.props.expandCollapseView ? this.renderExpandCollapseView(encounter) : this.renderNormalView(encounter)}
                    </View>}
                />
            </View>);
        return (
            <View>
                {renderable}
                {(showingPartial) ?
                    <Button onPress={() => this.props.onShowMore()}
                            style={[Styles.basicSecondaryButtonView, {alignSelf: 'center'}]}><Text
                        style={{
                            fontSize: Fonts.Medium,
                            color: Colors.DarkPrimaryColor
                        }}>{this.I18n.t('showMoreVisits')}</Text></Button> : null
                }
            </View>
        );
    }
}

export default PreviousEncounters;
