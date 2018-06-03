import childVaccinationSchedule from './childVaccSchedule';
import FormElementsStatusHelper from "../../../rules-config/src/rules/FormElementsStatusHelper";
import ExitFormHandler from "./formFilters/ProgramExitFormHandler";

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