import C from "../common";
import _ from "lodash";
import moment from 'moment';

const lmp = (programEnrolment) => {
    return programEnrolment.getObservationValue('Last menstrual period');
};

const gestationalAgeAsOn = (date, programEnrolment) => {
    let daysFromLMP = C.getDays(lmp(programEnrolment), date);
    return _.floor(daysFromLMP / 7, 0);
};

const gestationalAgeCategoryAsOn = (date, programEnrolment) => {
    const gestationalAge = gestationalAgeAsOn(date, programEnrolment);
    if (gestationalAge < 36) return "Very preterm";
    if (gestationalAge < 38) return "Preterm";
    return "Term";
};

const estimatedDateOfDelivery = (programEnrolment) => {
    return C.addDays(C.addMonths(lmp(programEnrolment), 9), 7);
};

const gestationalAgeAsOfToday = (estimatedGestationalAgeInWeeks, estimatedOnDate, today) => {
    return moment(today).diff(estimatedOnDate, 'weeks') + estimatedGestationalAgeInWeeks;
};

const eddBasedOnGestationalAge = (estimatedGestationalAgeInWeeks, estimatedOnDate) => {
    let edd = moment(estimatedOnDate).add(40 - estimatedGestationalAgeInWeeks, 'weeks');
    return edd.toDate();
};

export {gestationalAgeAsOn, gestationalAgeCategoryAsOn, estimatedDateOfDelivery, gestationalAgeAsOfToday, eddBasedOnGestationalAge};