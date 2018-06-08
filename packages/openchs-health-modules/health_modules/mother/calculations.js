import C from "../common";
import _ from "lodash";

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

export {gestationalAgeAsOn, gestationalAgeCategoryAsOn, estimatedDateOfDelivery};