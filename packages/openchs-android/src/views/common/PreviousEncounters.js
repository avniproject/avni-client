import {View} from "react-native";
import React from "react";
import {Text} from "native-base";
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

class PreviousEncounters extends AbstractComponent {
    static propTypes = {
        encounters: React.PropTypes.any.isRequired,
        style: React.PropTypes.object
    };

    constructor(props, context) {
        super(props, context);
    }

    editEncounter(encounter) {
        encounter = encounter.cloneForEdit();
        encounter.encounterDateTime = _.isNil(encounter.encounterDateTime) ? new Date() : encounter.encounterDateTime;
        if (encounter.getName() === 'Encounter')
            CHSNavigator.navigateToIndividualEncounterLandingView(this, null, encounter);
        else
            CHSNavigator.navigateToProgramEncounterView(this, encounter);
    }

    cancelEncounter(encounter) {
        CHSNavigator.navigateToProgramEncounterCancelView(this, encounter);
    }

    cancelVisitAction(encounter) {
        if (encounter.isCancellable()) return new ContextAction('cancelVisit', () => this.cancelEncounter(encounter));
    }

    encounterActions(encounter) {
        return encounter.isCancelled() ? [] : [new ContextAction('edit', () => this.editEncounter(encounter))];
    }

    getTitle(encounter) {
        const name = `${_.isNil(encounter.name) ? encounter.encounterType.name : encounter.name}`;
        const time = _.isNil(encounter.encounterDateTime) ?
            `${this.I18n.t('scheduled')}: ${moment(encounter.earliestVisitDateTime).format('DD-MM-YYYY')}`
            : `${moment(encounter.encounterDateTime).format('DD-MM-YYYY')}`;
        const cancellationInformation = encounter.isCancelled() ? this.I18n.t('cancelled') : '';
        return `${name}   ${time} ${cancellationInformation}`;
    }

    render() {
        const sortedEncounters = _.sortBy(this.props.encounters, (encounter) => encounter.encounterDateTime || encounter.earliestVisitDateTime);
        const formMappingService = this.context.getService(FormMappingService);
        return (
            <View>
                {sortedEncounters.length === 0 ?
                    (<View>
                        <View style={[DGS.common.content]}>
                            <Text style={{fontSize: Fonts.Large}}>{this.I18n.t('noEncounters')}</Text>
                        </View>
                    </View>)
                    : sortedEncounters.map((encounter, index) => {
                        const title = this.getTitle(encounter);
                        const form = formMappingService.findFormForEncounterType(encounter.encounterType);
                        return (
                            <View key={`${index}-1`} style={this.props.style}>
                                <ObservationsSectionTitle
                                    contextActions={this.encounterActions(encounter)}
                                    primaryAction={this.cancelVisitAction(encounter)}
                                    title={title}/>
                                <Observations form={form} observations={encounter.observations} key={`${index}-2`}/>
                            </View>
                        );
                    })}</View>
        );
    }
}

export default PreviousEncounters;