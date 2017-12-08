import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";
import _ from "lodash";
import FormMappingService from "../../service/FormMappingService";
import moment from "moment";
import {ProgramEncounter} from "openchs-models";
import General from "../../utility/General";

class StartProgramActions {
    static clone(state) {
        return {
            enrolment: state.enrolment,
            encounters: _.map(state.encounters, (encounter) => {
                return {
                    key: encounter.key,
                    label: StartProgramActions.displayLabel(encounter),
                    data: encounter.data,
                    selected: encounter.selected
                };
            }),
            encounterTypes: _.map(state.encounterTypes, (encounterType) => {
                return {
                    key: encounterType.key,
                    label: encounterType.name,
                    data: encounterType.data,
                    selected: encounterType.selected
                }

            }),
            selectedEncounter: state.selectedEncounter
        }
    }

    static displayLabel(encounter) {
        const encounterName = encounter.name || '';
        const displayDate = encounter.earliestVisitDateTime && `(${General.toDisplayDate(encounter.earliestVisitDateTime)})` || '';
        return `${encounterName} ${displayDate}`;
    }

    static getInitialState() {
        return {
            enrolment: null,
            encounters: [],
            encounterTypes: [],
            selectedEncounter: null,
        };
    }

    static newProgramEncounter(state, encounterType) {
        const programEncounter = ProgramEncounter.createEmptyInstance();
        programEncounter.programEnrolment = state.enrolment;
        programEncounter.encounterDateTime = moment().toDate();
        programEncounter.encounterType = encounterType;

        return programEncounter;
    }

    static preselectEncounterTypeIfRequired(state) {
        if (_.isEmpty(state.encounters) && state.encounterTypes.length === 1) {
            state.encounterTypes[0].selected = true;
        }
    }

    static onLoad(state, action, context) {
        const newState = {};
        let enrolment = context.get(ProgramEnrolmentService).findByUUID(action.enrolmentUUID);
        if (!enrolment) {
            return state;
        }
        newState.enrolment = enrolment;
        newState.encounters = _.chain(enrolment.scheduledEncounters())
                .sortBy('earliestVisitDateTime')
                .map((encounter, index) => {return {key: encounter.uuid, label: StartProgramActions.displayLabel(encounter),
                    data: encounter, selected: index === 0}})
            .value();

        let encounterTypes = context.get(FormMappingService).findEncounterTypesForProgram(enrolment.program);
        newState.encounterTypes = _.map(encounterTypes, (encounterType) => {
            return {key: encounterType.uuid, label: encounterType.name, data: encounterType, selected: false}});

        StartProgramActions.preselectEncounterTypeIfRequired(newState)

        newState.selectedEncounter = StartProgramActions.selectedEncounter(newState);

        return newState;
    }

    static selectedEncounter(state) {
        let selectedExistingEncounter = _.find(state.encounters, (item) => item.selected);
        let selectedNewEncounterType = _.find(state.encounterTypes, (item) => item.selected);
        return (selectedExistingEncounter && selectedExistingEncounter.data)
            || (selectedNewEncounterType && StartProgramActions.newProgramEncounter(state, selectedNewEncounterType.data));

    }

    static updateSelection(items, uuid) {
        return _.map(items, (item)=> { return {key: item.key, label: item.label, data: item.data, selected: uuid === item.key} });
    }

    static selectEncounter(state, uuid) {
        const newState = StartProgramActions.clone(state);

        newState.encounters = StartProgramActions.updateSelection(state.encounters, uuid);
        newState.encounterTypes = StartProgramActions.updateSelection(state.encounterTypes, uuid);
        newState.selectedEncounter = StartProgramActions.selectedEncounter(newState);

        return newState;
    }

    static onSelectionChange(state, action) {
        return StartProgramActions.selectEncounter(state, action.key);
    }
}

const StartProgramActionsNames = {
    ON_LOAD: "0e498a2e-4aaa-429b-b39f-d0fa256f44a5",
    ON_SELECTION_CHANGE: "b6ad3b30-daab-49d1-a55f-c2312c174ebb",
};

const StartProgramActionsMap = new Map([
    [StartProgramActionsNames.ON_LOAD, StartProgramActions.onLoad],
    [StartProgramActionsNames.ON_SELECTION_CHANGE, StartProgramActions.onSelectionChange],
]);

export {StartProgramActions, StartProgramActionsNames, StartProgramActionsMap};