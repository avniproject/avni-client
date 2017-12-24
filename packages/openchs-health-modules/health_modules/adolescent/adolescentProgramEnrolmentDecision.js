import EnrolmentFormHandler from "./formFilters/EnrolmentFormHandler";
import FormFilterHelper from "../rules/FormFilterHelper";
import C from "../common";
import {enrolmentDecisions as vulnerabilityEnrolmentDecisions} from './vulnerabilityDecisions';


const getDecisions = (programEnrolment, today) => {

    return vulnerabilityEnrolmentDecisions(programEnrolment);
};

const filterFormElements = (programEnrolment, formElementGroup) => {
    let handler = new EnrolmentFormHandler();
    return FormFilterHelper.filterFormElements(handler, programEnrolment, formElementGroup);
};

const getNextScheduledVisits = function (programEnrolment, today, currentEncounter) {
    if (programEnrolment.getEncounters().length === 0) {
        return [{
            name: "Annual Visit",
            encounterType: "Annual Visit",
            earliestDate: programEnrolment.enrolmentDateTime,
            maxDate: C.addDays(C.copyDate(programEnrolment.enrolmentDateTime), 10)
        }];
    }


};

export {getDecisions, getNextScheduledVisits, filterFormElements};