import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";
import _ from "lodash";
import FormMappingService from "../../service/FormMappingService";
import UserInfoService from "../../service/UserInfoService";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import {Action} from "../util";
import IndividualService from "../../service/IndividualService";
import PrivilegeService from "../../service/PrivilegeService";

class StartProgramActions {

    static getInitialState() {
        return {
            encounters: [],
            encounterTypes: [],
        };
    }

    static preselectEncounterTypeIfRequired(state) {
        if (_.isEmpty(state.encounters) && state.encounterTypes.length === 1) {
            state.encounterTypes[0].selected = true;
        }
    }

    @Action('StartProgramActions.onLoad')
    static onLoad(state, action, context) {
        const formMappingService = context.get(FormMappingService);
        const privilegeService = context.get(PrivilegeService);
        const newState = {};
        const enrolment = action.enrolmentUUID && context.get(ProgramEnrolmentService).findByUUID(action.enrolmentUUID);
        const individual = action.individualUUID && context.get(IndividualService).findByUUID(action.individualUUID);

        const programEncounters = _.isNil(enrolment)
            ? []
            : enrolment.scheduledEncounters().map(encounter => ({encounter, parent: enrolment}));

        const individualEncounters = _.isNil(individual)
            ? []
            : individual.scheduledEncounters().map(encounter => ({encounter, parent: individual}));

        newState.encounters = _.sortBy([...programEncounters, ...individualEncounters], 'encounter.earliestVisitDateTime');

        const programEncounterTypes = _.isNil(enrolment)
            ? []
            : formMappingService
                .findActiveEncounterTypesForProgram(enrolment.program, enrolment.individual.subjectType)
                .filter(encounterType =>
                    context.get(RuleEvaluationService).isEligibleForEncounter(enrolment.individual, encounterType))
                .map(encounterType => ({encounterType, parent: enrolment}));

        const individualEncounterTypes = _.isNil(individual)
            ? []
            : formMappingService
                .findActiveEncounterTypesForSubjectType(individual.subjectType)
                .filter(encounterType =>
                    context.get(RuleEvaluationService).isEligibleForEncounter(individual, encounterType))
                .map(encounterType => ({encounterType, parent: individual}));

        newState.encounterTypes = [...programEncounterTypes, ...individualEncounterTypes];

        StartProgramActions.preselectEncounterTypeIfRequired(newState);

        newState.hideUnplanned = context.get(UserInfoService).getUserSettings().hideUnplanned;
        newState.allowedEncounters = _.filter(newState.encounters, ({encounter}) => !privilegeService.hasEverSyncedGroupPrivileges() || privilegeService.hasAllPrivileges() || _.includes(action.allowedEncounterTypeUuids, encounter.encounterType.uuid));
        newState.allowedEncounterTypes = _.filter(newState.encounterTypes, ({encounterType}) => !privilegeService.hasEverSyncedGroupPrivileges() || privilegeService.hasAllPrivileges() || _.includes(action.allowedEncounterTypeUuids, encounterType.uuid));
        newState.isSingle = _.size([...newState.allowedEncounters, ...newState.allowedEncounterTypes]) === 1;
        const allAllowed = newState.allowedEncounters;
        if (!newState.hideUnplanned) {
            allAllowed.push(...newState.allowedEncounterTypes)
        }
        newState.allAllowed = allAllowed;
        newState.enrolment = enrolment;
        return newState;
    }
}

const StartProgramActionsNames = {};

const StartProgramActionsMap = new Map([
    [StartProgramActions.onLoad.Id, StartProgramActions.onLoad],
]);

export {StartProgramActions, StartProgramActionsNames, StartProgramActionsMap};
