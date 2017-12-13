import _ from 'lodash';
import {FormElementStatus} from "openchs-models";

export default class MonthlyEncounter {
    haveYouBeenToTheHospitalForAnyOfTheFollowingAilments(programEncounter, formElement) {
        const answersToSkip = formElement.getRawAnswers().filter((answer) => false);
        return new FormElementStatus(formElement.uuid, !_.isEmpty(answersToSkip), undefined, answersToSkip);
    }
}
