import C from '../common';
import _ from 'lodash';

export function getVaccSchedule (programEnrolment) {
    const checklistItems = [];
    const lmpDate = programEnrolment.getObservationValue('Last menstrual period');

    if (ttTakenAlreadyInPreviousPregnancy()) {
        var oneMonthBeforeDelivery = C.addDays(lmpDate, 280 - 30);
        checklistItems.push(C.addChecklistItem(lmpDate, "TT Booster", oneMonthBeforeDelivery, oneMonthBeforeDelivery));
    } else {
        checklistItems.push(C.addChecklistItem(lmpDate, "TT 1", 13 * 7, 21 * 7));
    }

    return {name: 'Vaccination Schedule', items: checklistItems, baseDate: lmpDate};
}

let ttTakenAlreadyInPreviousPregnancy = function (programEnrolment) {
    const ttInjections = programEnrolment.findObservation("TT injections taken");
    var taken = !_.isEmpty(ttInjections) && ttInjections.numberOfAnswers === 2;
    if (!taken) {
        return ttTakenAlreadyInPreviousPregnancy(programEnrolment.individual);
    }
};