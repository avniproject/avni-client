import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";
import _ from "lodash";
import FormMappingService from "../../service/FormMappingService";
import MessageService from "../../service/MessageService";
import General from "../../utility/General";
import UserInfoService from "../../service/UserInfoService";
import RuleEvaluationService from "../../service/RuleEvaluationService";
import {Action} from "../util";

class StartProgramActions {
    static clone(state) {
        return {
            I18n: state.I18n,
            enrolment: state.enrolment,
            encounters: _.map(state.encounters, encounter => {
                return {
                    key: encounter.key,
                    label: StartProgramActions.displayLabel(encounter.data, state.I18n),
                    data: encounter.data,
                    selected: encounter.selected
                };
            }),
            encounterTypes: _.map(state.encounterTypes, encounterType => {
                return {
                    key: encounterType.key,
                    label: state.I18n.t(encounterType.data.name),
                    data: encounterType.data,
                    selected: encounterType.selected
                };
            }),
        };
    }

    static displayLabel(encounter, I18n) {
        const encounterName = I18n.t(encounter.name || encounter.encounterType.name);
        const displayDate =
            (encounter.earliestVisitDateTime && `(${General.toDisplayDate(encounter.earliestVisitDateTime)})`) || "";
        return `${encounterName} ${displayDate}`;
    }

    static getInitialState() {
        return {
            enrolment: null,
            encounters: [],
            encounterTypes: [],
        };
    }

    static preselectEncounterTypeIfRequired(state) {
        if (_.isEmpty(state.encounters) && state.encounterTypes.length === 1) {
            state.encounterTypes[0].selected = true;
        }
    }

    @Action()
    static onLoad(state, action, context) {
        const newState = {};
        let enrolment = context.get(ProgramEnrolmentService).findByUUID(action.enrolmentUUID);
        if (!enrolment) {
            return state;
        }
        newState.I18n = context.get(MessageService).getI18n();
        newState.enrolment = enrolment;
        newState.encounters = _.chain(enrolment.scheduledEncounters())
            .sortBy("earliestVisitDateTime")
            .map((encounter, index) => {
                return {
                    key: encounter.uuid,
                    label: StartProgramActions.displayLabel(encounter, newState.I18n),
                    data: encounter,
                    selected: index === 0
                };
            })
            .value();

        newState.encounterTypes = context
            .get(FormMappingService)
            .findEncounterTypesForProgram(enrolment.program, enrolment.individual.subjectType)
            .filter(encounterType =>
                context.get(RuleEvaluationService).isEligibleForEncounter(enrolment.individual, encounterType)
            )
            .map(encounterType => {
                return {
                    key: encounterType.uuid,
                    label: newState.I18n.t(encounterType.displayName),
                    data: encounterType,
                    selected: false
                };
            });

        StartProgramActions.preselectEncounterTypeIfRequired(newState);

        newState.hideUnplanned = context.get(UserInfoService).getUserSettings().hideUnplanned;

        return newState;
    }
}

const StartProgramActionsNames = {};

const StartProgramActionsMap = new Map([
    [StartProgramActions.onLoad.Id, StartProgramActions.onLoad],
]);

export {StartProgramActions, StartProgramActionsNames, StartProgramActionsMap};
