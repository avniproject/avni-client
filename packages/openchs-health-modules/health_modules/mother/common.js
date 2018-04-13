import C from "../common";
import _ from "lodash";

const gestationalAgeAsOn = (date, programEnrolment) => {
    const lmpDate = programEnrolment.getObservationValue('Last menstrual period');
    let daysFromLMP = C.getDays(lmpDate, date);
    return _.floor(daysFromLMP / 7, 0);
};

const gestationalAgeCategoryAsOn = (date, programEnrolment) => {
    const gestationalAge = gestationalAgeAsOn(date, programEnrolment);
    switch (gestationalAge) {
        case gestationalAge < 36: return "Very preterm";
        case gestationalAge < 38: return "Preterm";
        default: return "Term";
    }
};

export {gestationalAgeAsOn, gestationalAgeCategoryAsOn};