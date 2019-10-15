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
import TypedTransition from "../../framework/routing/TypedTransition";
import CompletedEncountersView from "../../encounter/CompletedEncountersView";
import CollapsibleEncounters from "./CollapsibleEncounters";

class PreviousEncounters extends AbstractComponent {
    static propTypes = {
        encounters: PropTypes.any.isRequired,
        formType: PropTypes.string.isRequired,
        style: PropTypes.object,
        showCount: PropTypes.number,
        showPartial: PropTypes.bool.isRequired,
        emptyTitle: PropTypes.string,
        title: PropTypes.string,
        subjectInfo: PropTypes.string,
        expandCollapseView: PropTypes.bool,
        onToggleAction: PropTypes.string,
    };

    constructor(props, context) {
        super(props, context);
    }

    editEncounter(encounter) {
        encounter = encounter.cloneForEdit();
        const editing = !encounter.isScheduled();
        encounter.encounterDateTime = _.isNil(encounter.encounterDateTime) ? new Date() : encounter.encounterDateTime;
        CHSNavigator.navigateToEncounterView(this, {encounter, editing});
    }

    cancelEncounter(encounter) {
        CHSNavigator.navigateToEncounterView(this, {encounter, cancel: true});
    }

    cancelVisitAction(encounter, textColor) {
        const encounterService = this.context.getService(EncounterService);
        if (encounterService.isEncounterTypeCancellable(encounter)) return new ContextAction('cancelVisit', () => this.cancelEncounter(encounter), textColor);
    }

    encounterActions(encounter, actionName, textColor) {
        return [new ContextAction(actionName || 'edit', () => this.editEncounter(encounter), textColor)];
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
                <View style={{paddingTop: 6}}>
                    <ObservationsSectionOptions
                        contextActions={this.encounterActions(encounter, this.I18n.t('do'), Colors.ScheduledVisitColor)}
                        primaryAction={this.cancelVisitAction(encounter, Colors.ValidationError)}/>
                </View>
            </TouchableOpacity>
        </View>
    }

    renderTitleAndDetails(encounter) {
        const visitName = `${_.isNil(encounter.name) ? this.I18n.t(encounter.encounterType.displayName) : this.I18n.t(encounter.name)}`;
        const primaryDate = encounter.encounterDateTime || encounter.cancelDateTime || encounter.earliestVisitDateTime;
        const secondaryDate = !encounter.isScheduled() ? <Text style={{
                fontSize: Fonts.Small,
                color: Colors.SecondaryText
            }}>{encounter.earliestVisitDateTime && `Scheduled : ${General.toDisplayDate(encounter.earliestVisitDateTime)}` || this.I18n.t('unplannedVisit')}</Text> :
            <View/>;
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

    renderViewAll(encountersInfo) {
        return <TouchableOpacity
            onPress={() => TypedTransition.from(this).with({
                encountersInfo,
                renderTitleAndDetails: (encounter) => this.renderTitleAndDetails(encounter),
                encounterActions: (encounter) => this.encounterActions(encounter),
                cancelVisitAction: (encounter) => this.cancelVisitAction(encounter),
                subjectInfo: this.props.subjectInfo
            }).to(CompletedEncountersView)}
            style={styles.viewAllContainer}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={styles.viewAllText}>{this.I18n.t('viewAll')}</Text>
            </View>
        </TouchableOpacity>
    }

    render() {
        let toDisplayEncounters;
        let showingPartial = this.props.showPartial && (this.props.showCount < this.props.encounters.length);
        General.logDebug('PreviousEncounters.render', `ShowingPartial:${showingPartial}, ShowCount:${this.props.showCount}, Total:${this.props.encounters.length}`);
        if (this.props.showPartial) {
            let chronologicalEncounters = _.orderBy(this.props.encounters, ({encounter}) => encounter.encounterDateTime || encounter.cancelDateTime, 'desc');
            toDisplayEncounters = _.slice(chronologicalEncounters, 0, this.props.showCount);
        } else {
            toDisplayEncounters = _.sortBy(this.props.encounters, (encounter) => encounter.encounterDateTime || encounter.cancelDateTime || encounter.earliestVisitDateTime);
        }
        const dataSource = new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(toDisplayEncounters);
        const renderable = (<View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                {this.props.title &&(
                    <Text style={[Styles.cardTitle, {padding: Distances.ScaledContentDistanceFromEdge}]}>
                        {this.props.title}
                    </Text>
                )}
                {this.props.expandCollapseView && this.props.encounters.length > 3 ? this.renderViewAll(this.props.encounters) :
                    <View/>}
            </View>
            {(this.props.emptyTitle && _.isEmpty(toDisplayEncounters)) ? (
                <View style={styles.container}>
                    <Text style={{fontSize: Fonts.Medium}}>{this.props.emptyTitle}</Text>
                </View>
            ):(
                <View/>
            )}
            <ListView
                enableEmptySections={true}
                dataSource={dataSource}
                pageSize={1}
                initialListSize={1}
                removeClippedSubviews={true}
                renderRow={(encounter) => <View style={styles.container}>
                    {this.props.expandCollapseView ?
                        <CollapsibleEncounters encountersInfo={encounter}
                                               onToggleAction={this.props.onToggleAction}
                                               renderTitleAndDetails={() => this.renderTitleAndDetails(encounter.encounter)}
                                               encounterActions={() => this.encounterActions(encounter.encounter)}
                                               cancelVisitAction={() => this.cancelVisitAction(encounter.encounter)}
                                               formType={this.props.formType}
                        />
                        : this.renderNormalView(encounter)}
                </View>}
            />
        </View>);
        return (
            <View>
                {renderable}
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
    viewAllContainer: {
        right: Distances.ScaledContentDistanceFromEdge,
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 5,
    },
    viewAllText: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        color: Colors.ActionButtonColor,
    }
});
