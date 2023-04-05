import {StyleSheet, TouchableOpacity, View} from "react-native";
import ListView from "deprecated-react-native-listview";
import PropTypes from 'prop-types';
import React from "react";
import {Text} from "native-base";
import AbstractComponent from "../../framework/view/AbstractComponent";
import moment from "moment";
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
import Distances from "../primitives/Distances";
import ObservationsSectionOptions from "../common/ObservationsSectionOptions";
import TypedTransition from "../../framework/routing/TypedTransition";
import CompletedEncountersView from "../../encounter/CompletedEncountersView";
import CollapsibleEncounters from "./CollapsibleEncounters";
import PrivilegeService from "../../service/PrivilegeService";
import ListViewHelper from "../../utility/ListViewHelper";

class PreviousEncounters extends AbstractComponent {
    static propTypes = {
        encounters: PropTypes.any.isRequired,
        allowedEncounterTypeUuidsForPerformVisit: PropTypes.array,
        allowedEncounterTypeUuidsForEditVisit: PropTypes.array,
        allowedEncounterTypeUuidsForCancelVisit: PropTypes.array,
        formType: PropTypes.string.isRequired,
        cancelFormType: PropTypes.string,
        style: PropTypes.object,
        showCount: PropTypes.number,
        showPartial: PropTypes.bool.isRequired,
        emptyTitle: PropTypes.string,
        title: PropTypes.string,
        subjectInfo: PropTypes.string,
        expandCollapseView: PropTypes.bool,
        onToggleAction: PropTypes.string,
        containsDrafts: PropTypes.bool,
        deleteDraft: PropTypes.func,
        hideIfEmpty: PropTypes.bool
    };

    constructor(props, context) {
        super(props, context);
        this.privilegeService = context.getService(PrivilegeService);
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
        if (encounterService.isEncounterTypeCancellable(encounter) && (!this.privilegeService.hasEverSyncedGroupPrivileges() || this.privilegeService.hasAllPrivileges() || _.includes(this.props.allowedEncounterTypeUuidsForCancelVisit, encounter.encounterType.uuid))) return new ContextAction('cancelVisit', () => this.cancelEncounter(encounter), textColor);
    }

    hasEditPrivilege(encounter) {
        return !this.privilegeService.hasEverSyncedGroupPrivileges() || this.privilegeService.hasAllPrivileges() || _.includes(this.props.allowedEncounterTypeUuidsForEditVisit, encounter.encounterType.uuid);
    }

    isEditAllowed(encounter) {
        return this.hasEditPrivilege(encounter) && !encounter.encounterType.immutable;
    }

    encounterActions(encounter) {
        return this.isEditAllowed(encounter) ? [new ContextAction('edit', () => this.editEncounter(encounter))] : [];
    }

    addScheduledEncounterActions(encounter, actionName, textColor, actions) {
        if (!this.privilegeService.hasEverSyncedGroupPrivileges() || this.privilegeService.hasAllPrivileges() || _.includes(this.props.allowedEncounterTypeUuidsForPerformVisit, encounter.encounterType.uuid)) {
            actions.push(new ContextAction(actionName, () => this.editEncounter(encounter), textColor));
        }
        return actions;
    }

    deleteDraft(encounter) {
        return this.props.deleteDraft(encounter.uuid);
    }

    addDeleteDraftAction(encounter, actionName, textColor, actions) {
        if (!this.privilegeService.hasEverSyncedGroupPrivileges() || this.privilegeService.hasAllPrivileges() || _.includes(this.props.allowedEncounterTypeUuidsForPerformVisit, encounter.encounterType.uuid)) {
            actions.push(new ContextAction(actionName, () => this.deleteDraft(encounter), textColor));
        }
        return actions;
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
        const containsDrafts = this.props.containsDrafts || false;
        const formMappingService = this.context.getService(FormMappingService);
        const actions = [];
        if (containsDrafts) {
            this.addDeleteDraftAction(encounter, this.I18n.t('delete'), Colors.ValidationError, actions);
        }
        this.addScheduledEncounterActions(encounter, this.I18n.t('do'), Colors.ScheduledVisitColor, actions);
        return <View>
            <TouchableOpacity
                onPress={() => !this.privilegeService.hasEverSyncedGroupPrivileges() || this.privilegeService.hasAllPrivileges() || _.includes(this.props.allowedEncounterTypeUuidsForPerformVisit, encounter.encounterType.uuid) ? this.editEncounter(encounter) : _.noop()}>
                {containsDrafts && (<View style={{flexDirection: 'row', justifyContent: 'flex-end'}}>
                    {this.badge(this.I18n.t('draft'), Colors.WarningButtonColor)}
                </View>)}
                {this.renderTitleAndDetails(encounter)}
                <Observations form={formMappingService.findFormForEncounterType(encounter.encounterType,
                    this.props.formType, encounter.subjectType)} observations={encounter.getObservations()}/>
                <View style={{paddingTop: 6}}>
                    <ObservationsSectionOptions
                        contextActions={actions}
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
                subjectInfo: this.props.subjectInfo,
                formType: this.props.formType,
                cancelFormType: this.props.cancelFormType,
                isEditAllowed: (encounter) => this.isEditAllowed(encounter),
            }).to(CompletedEncountersView)}
            style={styles.viewAllContainer}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={styles.viewAllText}>{`${this.I18n.t('viewAll')} (${this.props.encounters.length})`}</Text>
            </View>
        </TouchableOpacity>
    }

    render() {
        if (this.props.hideIfEmpty && this.props.encounters.length === 0) return null;

        let toDisplayEncounters;
        let showingPartial = this.props.showPartial && (this.props.showCount < this.props.encounters.length);
        General.logDebug('PreviousEncounters.render', `ShowingPartial:${showingPartial}, ShowCount:${this.props.showCount}, Total:${this.props.encounters.length}`);
        if (this.props.showPartial) {
            let chronologicalEncounters = _.orderBy(this.props.encounters, ({encounter}) => encounter.encounterDateTime || encounter.cancelDateTime, 'desc');
            toDisplayEncounters = _.slice(chronologicalEncounters, 0, this.props.showCount);
        } else {
            toDisplayEncounters = _.sortBy(this.props.encounters, (encounter) => encounter.encounterDateTime || encounter.cancelDateTime || encounter.earliestVisitDateTime);
        }
        const dataSource = ListViewHelper.getDataSource(toDisplayEncounters);
        const renderable = (<View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                {this.props.title && (
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
            ) : (
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
                                               cancelFormType={this.props.cancelFormType}
                                               isEditAllowed={() => this.isEditAllowed(encounter.encounter)}
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
