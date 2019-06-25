import {View, ListView, TouchableNativeFeedback, TouchableOpacity, StyleSheet} from "react-native";
import PropTypes from 'prop-types';
import React from "react";
import {Text, Button, Badge} from "native-base";
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
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";
import General from "../../utility/General";
import {Form} from 'openchs-models';
import Distances from "../primitives/Distances";
import ObservationsSectionOptions from "../common/ObservationsSectionOptions";
import Icon from 'react-native-vector-icons/SimpleLineIcons'
import TypedTransition from "../../framework/routing/TypedTransition";
import CompletedVisitsFilterView from "../filter/CompletedVisitsFilterView";

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

    cancelVisitAction(encounter, textColor) {
        const encounterService = this.context.getService(EncounterService);
        if (encounterService.isEncounterTypeCancellable(encounter)) return new ContextAction('cancelVisit', () => this.cancelEncounter(encounter), textColor);
    }

    encounterActions(encounter, actionName, textColor) {
        return [new ContextAction(actionName || 'edit', () => this.editEncounter(encounter), textColor)];
    }

    renderExpandCollapseView(encounterInfo) {
        const formMappingService = this.context.getService(FormMappingService);
        return <View>
            <TouchableOpacity onPress={() => this.dispatchAction(this.props.onToggleAction, {
                encounterInfo: {...encounterInfo, expand: !encounterInfo.expand}
            })}>
                {this.renderTitleAndDetails(encounterInfo.encounter)}
                <View style={{right: 2, position: 'absolute', alignSelf: 'center'}}>
                    {encounterInfo.expand === false ?
                        <Icon name={'arrow-down'} size={12}/> :
                        <Icon name={'arrow-up'} size={12}/>}
                </View>
            </TouchableOpacity>
            {encounterInfo.expand === true ?
                <View>
                    <Observations
                        form={formMappingService.findFormForEncounterType(encounterInfo.encounter.encounterType,
                            this.props.formType, encounterInfo.encounter.subjectType)}
                        observations={encounterInfo.encounter.getObservations()}/>
                </View> : <View/>}
            <ObservationsSectionOptions contextActions={this.encounterActions(encounterInfo.encounter)}
                                        primaryAction={this.cancelVisitAction(encounterInfo.encounter)}/>
        </View>
    }

    badge = (status, color) => <View style={{
        backgroundColor: color,
        borderRadius: 9,
        paddingHorizontal: 10,
        justifyContent: 'center',
        paddingVertical: 2
    }}>
        <Text style={{color: 'white', fontSize: 10}}>{status}</Text>
    </View>;

    isOverdue = encounter => moment().isAfter(encounter.maxVisitDateTime);

    isDue = encounter => moment().isBetween(encounter.earliestVisitDateTime, encounter.maxVisitDateTime);

    scheduledVisitBadge(encounter) {
        return this.isOverdue(encounter) ? this.badge(this.I18n.t('overdue'), Colors.OverdueVisitColor) :
            this.isDue(encounter) ? this.badge(this.I18n.t('due'), Colors.ScheduledVisitColor) :
                this.badge(this.I18n.t('scheduled'), Colors.FutureVisitColor);
    }

    cancelledVisitBadge(encounter) {
        return encounter.isCancelled() ? this.badge(this.I18n.t('cancelled'), Colors.CancelledVisitColor) : <View/>
    }

    renderStatus(encounter) {
        return encounter.isScheduled() ? this.scheduledVisitBadge(encounter) : this.cancelledVisitBadge(encounter)
    }

    renderNormalView(encounter) {
        const formMappingService = this.context.getService(FormMappingService);
        return <View>
            <TouchableOpacity onPress={() => this.editEncounter(encounter)}>
                {this.renderTitleAndDetails(encounter)}
                <Observations form={formMappingService.findFormForEncounterType(encounter.encounterType,
                    this.props.formType, encounter.subjectType)} observations={encounter.getObservations()}/>
            </TouchableOpacity>
            <ObservationsSectionOptions
                contextActions={this.encounterActions(encounter, this.I18n.t('do'), Colors.ScheduledVisitColor)}
                primaryAction={this.cancelVisitAction(encounter, Colors.ValidationError)}/>
        </View>
    }

    renderTitleAndDetails(encounter) {
        const visitName = `${_.isNil(encounter.name) ? this.I18n.t(encounter.encounterType.displayName) : this.I18n.t(encounter.name)}`;
        const primaryDate = encounter.encounterDateTime || encounter.cancelDateTime || encounter.earliestVisitDateTime;
        const secondaryDate = !encounter.isScheduled() ? <Text style={{
            fontSize: Fonts.Small,
            color: Colors.SecondaryText
        }}>{`Scheduled : ${General.toDisplayDate(encounter.earliestVisitDateTime)}`}</Text> : <View/>;
        return <View>
            <View
                style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap'}}>
                <View style={{flexDirection: 'column'}}>
                    <Text style={{fontSize: Fonts.Normal}}>{visitName}</Text>
                    <Text style={{fontSize: Fonts.Small}}>{General.toDisplayDate(primaryDate)}</Text>
                    {secondaryDate}
                </View>
                {this.renderStatus(encounter)}
            </View>
        </View>;
    }

    renderFilter() {
        return <TouchableOpacity
            onPress={() => TypedTransition.from(this).with({
                encounterTypes: this.props.encounterTypes,
                onFilterApply: this.props.onFilterApply,
                selectedEncounterType: this.props.selectedEncounterType,
            }).to(CompletedVisitsFilterView)}
            style={styles.filterButtonContainer}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Icon name={'equalizer'} size={25}/>
                <Text style={styles.filterButtonText}>{this.I18n.t('sortFilter')}</Text>
            </View>
        </TouchableOpacity>
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
        const renderable = (<View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text
                    style={[Fonts.MediumBold, {padding: Distances.ScaledContentDistanceFromEdge}]}>{this.props.title}</Text>
                {this.props.expandCollapseView ? this.renderFilter() : <View/>}
            </View>
            {_.isEmpty(toDisplayEncounters) ?
                (<View style={styles.container}>
                    <Text style={{fontSize: Fonts.Large}}>{this.props.emptyTitle}</Text>
                </View>)
                :
                <View/>}
            <ListView
                enableEmptySections={true}
                dataSource={dataSource}
                pageSize={1}
                initialListSize={1}
                removeClippedSubviews={true}
                renderRow={(encounter) => <View style={styles.container}>
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


const styles = StyleSheet.create({
    container: {
        padding: Distances.ScaledContentDistanceFromEdge,
        margin: 4,
        elevation: 2,
        backgroundColor: Colors.cardBackgroundColor,
        marginVertical: 3
    },
    filterButtonContainer: {
        right: Distances.ScaledContentDistanceFromEdge,
        position: 'absolute',
        alignItems: 'center'
    },
    filterButtonText: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        color: Colors.ActionButtonColor
    }
});
