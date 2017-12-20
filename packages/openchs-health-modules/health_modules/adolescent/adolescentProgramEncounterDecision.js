import FormFilterHelper from "../rules/FormFilterHelper";

import EleventhAndTwelfthStandardFormHandler from './formFilters/EleventhAndTwelfthStandardFormHandler';
import RoutineEncounterHandler from "./formFilters/RoutineEncounterHandler";

const encounterTypeHandlerMap = new Map([
    ['Annual Visit', new RoutineEncounterHandler()],
    ['Quarterly Visit', new RoutineEncounterHandler()],
    ['Half-Yearly Visit', new RoutineEncounterHandler()],
    ['Monthly Visit', new RoutineEncounterHandler()]
]);

export function filterFormElements(programEncounter, formElementGroup) {
    let handler = encounterTypeHandlerMap.get(programEncounter.encounterType.name);
    return FormFilterHelper.filterFormElements(handler, programEncounter, formElementGroup);
}