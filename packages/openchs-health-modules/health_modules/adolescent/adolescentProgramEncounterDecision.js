import FormFilterHelper from "../rules/FormFilterHelper";
import RoutineEncounterHandler from "./formFilters/RoutineEncounterHandler";

const encounterTypeHandlerMap = new Map([
    ['Annual Visit', new RoutineEncounterHandler()],
    ['Quarterly Visit', new RoutineEncounterHandler()],
    ['Half-Yearly Visit', new RoutineEncounterHandler()],
    ['Monthly Visit', new RoutineEncounterHandler()],
]);

const filterFormElements = (programEncounter, formElementGroup) => {
    let handler = encounterTypeHandlerMap.get(programEncounter.encounterType.name);
    return FormFilterHelper.filterFormElements(handler, programEncounter, formElementGroup);
};

const getNextScheduledVisits = (programEnrolment, today) => {

};

export {getNextScheduledVisits, filterFormElements};