import FormFilterHelper from "../rules/FormFilterHelper";
import EleventhAndTwlefthStandard from './formFilters/EleventhAndTwlefthStandard';

const encounterTypeHandlerMap = new Map([['Adolescent Monthly Visit (11th and 12th std)', new EleventhAndTwlefthStandard()]]);

export function filterFormElements (programEncounter, formElementGroup, today) {
    let handler = encounterTypeHandlerMap.get(programEncounter.encounterType.name);
    return FormFilterHelper.filterFormElements(handler, programEncounter, formElementGroup, today);
}