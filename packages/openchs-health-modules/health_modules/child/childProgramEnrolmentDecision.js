import childVaccinationSchedule from './childVaccSchedule';
import {FormElementsStatusHelper, RuleFactory} from "rules-config/rules";
import ExitFormHandler from "./formFilters/ProgramExitFormHandler";

const EnrolmentDecisions = RuleFactory("1608c2c0-0334-41a6-aab0-5c61ea1eb069", "Decision");
const EnrolmentFilters = RuleFactory("1608c2c0-0334-41a6-aab0-5c61ea1eb069", "ViewFilter");


@EnrolmentDecisions("91c75af8-3449-4532-b258-323332de5fcd", "All Enrolment Decisions", 1.0, {})
class Enrolment {
    static exec(programEnrolment) {
        return getDecisions(programEnrolment);
    }
}

@EnrolmentFilters("43860e9e-a419-435d-a4e9-e4a1961071c4", "All Enrolment Filters", 1.0, {})
class EnrolmentFormFilter {
    static exec(programEnrolment, formElementGroup) {
        return getFormElementsStatuses(programEnrolment, formElementGroup);
    }
}

const getDecisions = function (programEnrolment, today) {
    return {enrolmentDecisions: [], encounterDecisions: []};
};

const getChecklists = function (programEnrolment, today) {
    return [childVaccinationSchedule.getVaccSchedule(programEnrolment)];
};

const getFormElementsStatuses = (programExit, formElementGroup) => {
    let handler = new ExitFormHandler();
    return FormElementsStatusHelper.getFormElementsStatuses(handler, programExit, formElementGroup);
};

export {
    getDecisions,
    getChecklists,
    getFormElementsStatuses
};