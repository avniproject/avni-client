import { FormElementStatus } from 'rules-config/rules';
import { getOldestObsBeforeCurrentEncounter } from '../calculations';

export default class VaccinationFilters {
    static tt1Date(currentEncounter, formElement) {
        const value = getOldestObsBeforeCurrentEncounter(currentEncounter, formElement.concept.name);
        return new FormElementStatus(formElement.uuid, true, value);
    }

    static tt2Date(currentEncounter, formElement) {
        const value = getOldestObsBeforeCurrentEncounter(currentEncounter, formElement.concept.name);
        return new FormElementStatus(formElement.uuid, true, value);
    }

    static ttBoosterDate(currentEncounter, formElement) {
        const value = getOldestObsBeforeCurrentEncounter(currentEncounter, formElement.concept.name);
        return new FormElementStatus(formElement.uuid, true, value);
    }
}
