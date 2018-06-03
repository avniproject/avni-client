import FormElementsStatusHelper from "../../../rules-config/src/rules/FormElementsStatusHelper";
import RoutineEncounterHandler from "./formFilters/RoutineEncounterHandler";
import DropoutEncounterFormHandler from "./formFilters/DropoutEncounterFormHandler";
import {encounterDecisions as vulnerabilityDecisionsFromEncounter} from './vulnerabilityDecisions';
import {encounterDecisions as counsellingEncounterDecisions} from './counsellingDecisions';
import {getNextScheduledVisits} from './adolescentVisitSchedule';
import {referralDecisions} from "./referralDecision";

const encounterTypeHandlerMap = new Map([
    ['Annual Visit', new RoutineEncounterHandler()],
    ['Quarterly Visit', new RoutineEncounterHandler()],
    ['Half-Yearly Visit', new RoutineEncounterHandler()],
    ['Monthly Visit', new RoutineEncounterHandler()],
    ['Dropout Home Visit', new DropoutEncounterFormHandler()]
]);

const getDecisions = (programEncounter) => {
    let vulnerabilityEncounterDecisions = vulnerabilityDecisionsFromEncounter(programEncounter.programEnrolment, programEncounter);
    let counsellingDecisions = counsellingEncounterDecisions(vulnerabilityEncounterDecisions, programEncounter);
    return referralDecisions(counsellingDecisions, programEncounter);
};

const getFormElementsStatuses = (programEncounter, formElementGroup) => {
    let handler = encounterTypeHandlerMap.get(programEncounter.encounterType.name);
    return FormElementsStatusHelper.getFormElementsStatuses(handler, programEncounter, formElementGroup);
};

export {getDecisions, getFormElementsStatuses, getNextScheduledVisits};
