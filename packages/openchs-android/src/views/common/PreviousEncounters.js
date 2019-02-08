import {View, ListView, TouchableNativeFeedback} from "react-native";
import React from "react";
import {Text, Button} from "native-base";
import AbstractComponent from "../../framework/view/AbstractComponent";
import moment from "moment";
import DGS from "../primitives/DynamicGlobalStyles";
import Observations from "../common/Observations";
import CHSNavigator from "../../utility/CHSNavigator";
import ContextAction from "../viewmodel/ContextAction";
import ObservationsSectionTitle from "../common/ObservationsSectionTitle";
import Fonts from "../primitives/Fonts";
import _ from 'lodash';
import FormMappingService from "../../service/FormMappingService";
import EncounterService from "../../service/EncounterService";
import {Badge} from "../filter/AppliedFilters";
import Styles from "../primitives/Styles";
import Colors from "../primitives/Colors";
import General from "../../utility/General";

class PreviousEncounters extends AbstractComponent {
    static propTypes = {
        encounters: React.PropTypes.any.isRequired,
        formType: React.PropTypes.string.isRequired,
        style: React.PropTypes.object,
        onShowMore: React.PropTypes.func.isRequired,
        showCount: React.PropTypes.number,
        showPartial: React.PropTypes.bool.isRequired
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
        }
        else if (encounter.isCancelled()) {
            CHSNavigator.navigateToProgramEncounterCancelView(this, encounter, editing);
        }
        else {
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

    getTitle(encounter) {
        const name = `${_.isNil(encounter.name) ? this.I18n.t(encounter.encounterType.displayName) : this.I18n.t(encounter.name)}`;
        const time = _.isNil(encounter.encounterDateTime)
            ? `${this.I18n.t('scheduled')}: ${moment(encounter.earliestVisitDateTime).format('DD-MM-YYYY')}`
            : `${moment(encounter.encounterDateTime).format('DD-MM-YYYY')}`;
        const cancellationInformation = encounter.isCancelled() ? this.I18n.t('cancelled') : '';
        return `${name}   ${time} ${cancellationInformation}`;
    }

    render() {
        let toDisplayEncounters;
        const scheduledEncounters = _.filter(this.props.encounters, (encounter) => !encounter.encounterDateTime);
        let showingPartial = this.props.showPartial && (this.props.showCount < (this.props.encounters.length - scheduledEncounters.length));

        General.logDebug('PreviousEncounters.render', `ShowingPartial:${showingPartial}, ShowCount:${this.props.showCount}, Scheduled:${scheduledEncounters.length}, Total:${this.props.encounters.length}`);
        if (showingPartial) {
            let chronologicalScheduledEncounters = _.sortBy(scheduledEncounters, (scheduledEncounter) => scheduledEncounter.earliestVisitDateTime);

            let actualEncounters = _.filter(this.props.encounters, (encounter) => encounter.encounterDateTime);
            const reverseChronologicalActualEncounters = _.sortBy(actualEncounters, (encounter) => encounter.encounterDateTime);
            const recentActualEncounters = _.slice(_.reverse(reverseChronologicalActualEncounters), 0, this.props.showCount);
            toDisplayEncounters = _.sortBy(_.concat(recentActualEncounters, chronologicalScheduledEncounters), (encounter) => encounter.encounterDateTime || encounter.earliestVisitDateTime);
        } else {
            toDisplayEncounters = _.sortBy(this.props.encounters, (encounter) => encounter.encounterDateTime || encounter.earliestVisitDateTime);
        }

        const formMappingService = this.context.getService(FormMappingService);
        const dataSource = new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(toDisplayEncounters);
        const renderable = _.isEmpty(toDisplayEncounters) ? (
            <View style={[DGS.common.content]}>
                <Text style={{fontSize: Fonts.Large}}>{this.I18n.t('noEncounters')}</Text>
            </View>) : (
            <ListView
                enableEmptySections={true}
                dataSource={dataSource}
                pageSize={1}
                initialListSize={1}
                removeClippedSubviews={true}
                renderRow={(encounter) => <View style={this.props.style}>
                    <ObservationsSectionTitle
                        contextActions={this.encounterActions(encounter)}
                        primaryAction={this.cancelVisitAction(encounter)}
                        title={this.getTitle(encounter)}/>
                    <Observations form={formMappingService.findFormForEncounterType(encounter.encounterType,
                        this.props.formType)} observations={encounter.getObservations()}/>
                </View>}
            />);
        return (
            <View>
                {(showingPartial) ?
                    <Button onPress={() => this.props.onShowMore()} style={[Styles.basicSecondaryButtonView, {alignSelf: 'center'}]} textStyle={{
                        fontSize: Fonts.Medium,
                        color: Colors.DarkPrimaryColor
                    }}>{this.I18n.t('showMoreVisits')}</Button> : null
                }
                {renderable}
            </View>
        );
    }
}

export default PreviousEncounters;