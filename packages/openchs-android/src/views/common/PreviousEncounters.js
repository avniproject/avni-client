import {View, ListView} from "react-native";
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
import {Form} from 'openchs-models';

class PreviousEncounters extends AbstractComponent {
    static propTypes = {
        encounters: React.PropTypes.any.isRequired,
        formType: React.PropTypes.string.isRequired,
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
        const name = `${_.isNil(encounter.name) ? this.I18n.t(encounter.encounterType.name) : this.I18n.t(encounter.name)}`;
        const time = _.isNil(encounter.encounterDateTime) ?
            `${this.I18n.t('scheduled')}: ${moment(encounter.earliestVisitDateTime).format('DD-MM-YYYY')}`
            : `${moment(encounter.encounterDateTime).format('DD-MM-YYYY')}`;
        const cancellationInformation = encounter.isCancelled() ? this.I18n.t('cancelled') : '';
        return `${name}   ${time} ${cancellationInformation}`;
    }

    render() {
        const sortedEncounters = _.sortBy(this.props.encounters, (encounter) => encounter.encounterDateTime || encounter.earliestVisitDateTime);
        const formMappingService = this.context.getService(FormMappingService);
        const dataSource = new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(sortedEncounters);
        const renderable = _.isEmpty(sortedEncounters) ? (
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
                        this.props.formType)} observations={encounter.observations}/>
                </View>}
            />);
        return (
            <View>
                {renderable}
            </View>

        );
    }
}

export default PreviousEncounters;