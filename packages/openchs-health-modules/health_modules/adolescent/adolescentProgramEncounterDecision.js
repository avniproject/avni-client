import FormFilterHelper from "../rules/FormFilterHelper";
import EleventhAndTwlefthStandard from './formFilters/EleventhAndTwlefthStandard';
import MonthlyEncounter from './formFilters/MonthlyEncounter';

const encounterTypeHandlerMap = new Map([
    ['Adolescent Monthly Visit (11th and 12th std)', new EleventhAndTwlefthStandard()],
    ['Monthly Visit', new MonthlyEncounter()]]);

export function filterFormElements(programEncounter, formElementGroup, today) {
    let handler = encounterTypeHandlerMap.get(programEncounter.encounterType.name);
    return FormFilterHelper.filterFormElements(handler, programEncounter, formElementGroup, today);
}

