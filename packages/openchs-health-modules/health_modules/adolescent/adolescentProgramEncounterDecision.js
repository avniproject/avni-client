import FormFilterHelper from "../rules/FormFilterHelper";

import EleventhAndTwelfthStandardFormHandler from './formFilters/EleventhAndTwelfthStandardFormHandler';

const encounterTypeHandlerMap = new Map([
    ['Adolescent Monthly Visit (11th and 12th std)', new EleventhAndTwelfthStandardFormHandler()]
]);

export function filterFormElements(programEncounter, formElementGroup) {
    let handler = encounterTypeHandlerMap.get(programEncounter.encounterType.name);
    return FormFilterHelper.filterFormElements(handler, programEncounter, formElementGroup);
}