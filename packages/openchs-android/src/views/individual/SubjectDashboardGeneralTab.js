import PropTypes from 'prop-types';
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import {Text, TouchableNativeFeedback, View} from 'react-native';
import {Actions} from "../../action/individual/IndividualGeneralHistoryActions";
import Reducers from "../../reducer";
import PreviousEncounters from "../common/PreviousEncounters";
import _ from "lodash";
import Colors from '../primitives/Colors';
import {Form, Privilege} from 'avni-models';
import Separator from "../primitives/Separator";
import Styles from "../primitives/Styles";
import Fonts from "../primitives/Fonts";
import CHSNavigator from "../../utility/CHSNavigator";
import ActionSelector from "../common/ActionSelector";
import PrivilegeService from "../../service/PrivilegeService";

class SubjectDashboardGeneralTab extends AbstractComponent {
    static propTypes = {
        params: PropTypes.object.isRequired
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualGeneralHistory);
        this.privilegeService = context.getService(PrivilegeService);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, {individualUUID: this.props.params.individualUUID});
        return super.componentWillMount();
    }

    shouldComponentUpdate(nextProps, state) {
        return !_.isNil(state.individual);
    }

    renderButton(onPress, buttonStyle, text, textColor, index) {
        return (
            <TouchableNativeFeedback onPress={onPress} key={index}>
                <View style={buttonStyle}>
                    <Text style={{
                        fontSize: Fonts.Medium,
                        color: textColor,
                        paddingHorizontal: 10
                    }}>{text}</Text>
                </View>
            </TouchableNativeFeedback>
        );
    }

    startEncounter() {
        this.dispatchAction(Reducers.STATE_CHANGE_POSSIBLE_EXTERNALLY);
        this.dispatchAction(Actions.LAUNCH_ENCOUNTER_SELECTOR);
    }

    renderPlannedVisits() {
        const scheduledEncounters = _.filter(_.map(this.state.encounters, 'encounter'), (encounter) => !encounter.encounterDateTime && !encounter.cancelDateTime);
        const cancelVisitCriteria = `privilege.name = '${Privilege.privilegeName.cancelVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}' AND programUuid = null AND subjectTypeUuid = '${this.state.individual.subjectType.uuid}'`;
        const allowedEncounterTypeUuidsForCancelVisit = this.privilegeService.allowedEntityTypeUUIDListForCriteria(cancelVisitCriteria, 'encounterTypeUuid');        
        const performVisitCriteria = `privilege.name = '${Privilege.privilegeName.performVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}' AND programUuid = null AND subjectTypeUuid = '${this.state.individual.subjectType.uuid}'`;
        const allowedEncounterTypeUuidsForPerformVisit = this.privilegeService.allowedEntityTypeUUIDListForCriteria(performVisitCriteria, 'encounterTypeUuid');
        return (<PreviousEncounters encounters={scheduledEncounters}
                                    allowedEncounterTypeUuidsForCancelVisit={allowedEncounterTypeUuidsForCancelVisit}
                                    allowedEncounterTypeUuidsForPerformVisit={allowedEncounterTypeUuidsForPerformVisit}
                                    formType={Form.formTypes.Encounter}
                                    style={{marginBottom: 21}}
                                    showPartial={false}
                                    showCount={this.state.showCount}
                                    title={this.I18n.t('visitsPlanned')}
                                    emptyTitle={this.I18n.t('noPlannedEncounters')}
                                    expandCollapseView={false}
                                    subjectInfo={this.state.individual.name}/>);
    }

    renderCompletedVisits() {
        const actualEncounters = _.filter(this.state.encounters, ({encounter}) => encounter.encounterDateTime || encounter.cancelDateTime);
        const visitEditCriteria = `privilege.name = '${Privilege.privilegeName.editVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}' AND programUuid = null AND subjectTypeUuid = '${this.state.individual.subjectType.uuid}'`;
        const allowedEncounterTypeUuidsForEditVisit = this.privilegeService.allowedEntityTypeUUIDListForCriteria(visitEditCriteria, 'encounterTypeUuid');        

        return (<PreviousEncounters encounters={actualEncounters}
                                    allowedEncounterTypeUuidsForEditVisit={allowedEncounterTypeUuidsForEditVisit}
                                    formType={Form.formTypes.Encounter}
                                    style={{marginBottom: 21}}
                                    showPartial={true}
                                    showCount={this.state.showCount}
                                    title={this.I18n.t('completedEncounters')}
                                    emptyTitle={this.I18n.t('noEncounters')}
                                    expandCollapseView={true}
                                    subjectInfo={this.state.individual.name}
                                    onToggleAction={Actions.ON_TOGGLE}/>);
    }

    render() {
        const performEncounterCriteria = `privilege.name = '${Privilege.privilegeName.performVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}' AND programUuid = null AND subjectTypeUuid = '${this.state.individual.subjectType.uuid}'`;
        const allowedEncounterTypeUuidsForPerformVisit = this.privilegeService.allowedEntityTypeUUIDListForCriteria(performEncounterCriteria, 'encounterTypeUuid');        
        
        const encounterActions = this.state.encounterTypes.filter((encounterType) => !this.privilegeService.hasEverSyncedGroupPrivileges() || this.privilegeService.hasAllPrivileges() || _.includes(allowedEncounterTypeUuidsForPerformVisit, encounterType.uuid)).map(encounterType => ({
            fn: () => {
                this.state.encounter.encounterType = encounterType;
                CHSNavigator.navigateToEncounterView(this, {
                    individualUUID:this.state.individualUUID,
                    encounter:this.state.encounter,
                });
            },
            label: encounterType.displayName,
            backgroundColor: Colors.ActionButtonColor
        }));
        return (
            <View style={{backgroundColor: Colors.GreyContentBackground, marginTop: 10}}>
                <ActionSelector
                    title={this.I18n.t("followupTypes")}
                    hide={() => this.dispatchAction(Actions.HIDE_ENCOUNTER_SELECTOR)}
                    visible={this.state.displayActionSelector}
                    actions={encounterActions}
                />
                <View style={{marginHorizontal: 10}}>
                    <View style={{marginTop: 2, position: 'absolute', right: 8}}>
                        {_.isEmpty(this.state.encounterTypes) || (this.privilegeService.hasEverSyncedGroupPrivileges() && !this.privilegeService.hasAllPrivileges() && _.isEmpty(allowedEncounterTypeUuidsForPerformVisit)) ? <View/> :
                            this.renderButton(() => this.startEncounter(), Styles.basicPrimaryButtonView,
                                this.I18n.t('newGeneralVisit'), Colors.TextOnPrimaryColor)
                        }
                    </View>
                    {this.renderPlannedVisits()}
                    {this.renderCompletedVisits()}
                </View>
                <Separator height={110} backgroundColor={Colors.GreyContentBackground}/>
            </View>
        );
    }
}

export default SubjectDashboardGeneralTab;
