import EnrolmentFormHandler from "./formFilters/EnrolmentFormHandler";
import FormFilterHelper from "../rules/FormFilterHelper";
import {getEnrolmentDecisions as vulnerabilityDecisionsFromEnrolment} from './vulnerabilityDecisions';


const getDecisions = (programEnrolment, today) => {

    return {enrolmentDecisions: vulnerabilityDecisionsFromEnrolment(programEnrolment), encounterDecisions: [], registrationDecisions: []};
};

const filterFormElements = (programEnrolment, formElementGroup) => {
    let handler = new EnrolmentFormHandler();
    return FormFilterHelper.filterFormElements(handler, programEnrolment, formElementGroup);
};

const getNextScheduledVisits = function (programEnrolment, today, currentEncounter) {


};

export {getDecisions, getNextScheduledVisits, filterFormElements};