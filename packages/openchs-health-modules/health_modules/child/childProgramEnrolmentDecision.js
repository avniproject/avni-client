import childVaccinationSchedule from './childVaccSchedule';
import {FormElementsStatusHelper, RuleFactory} from "rules-config/rules";
import ExitFormHandler from "./formFilters/ProgramExitFormHandler";

const EnrolmentDecisions = RuleFactory("1608c2c0-0334-41a6-aab0-5c61ea1eb069", "Decision");


@EnrolmentDecisions("91c75af8-3449-4532-b258-323332de5fcd", "All Enrolment Decisions", 1.0, {})
class Enrolment {
    static exec(programEnrolment) {
        return getDecisions(programEnrolment);
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