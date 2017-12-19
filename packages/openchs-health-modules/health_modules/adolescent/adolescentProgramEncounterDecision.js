import FormFilterHelper from "../rules/FormFilterHelper";
import MonthlyEncounter from './formFilters/MonthlyEncounter';

import EleventhAndTwelfthStandardFormHandler from './formFilters/EleventhAndTwelfthStandardFormHandler';

const encounterTypeHandlerMap = {
    'Adolescent Monthly Visit (11th and 12th std)': new EleventhAndTwelfthStandardFormHandler(),
    'Monthly Visit': new MonthlyEncounter()
};

export function filterFormElements(programEncounter, formElementGroup) {
    let handler = encounterTypeHandlerMap[programEncounter.encounterType.name];
    return FormFilterHelper.filterFormElements(handler, programEncounter, formElementGroup);
}