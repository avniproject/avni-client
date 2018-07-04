import childVaccinationSchedule from './childVaccSchedule';
import {FormElementsStatusHelper, RuleFactory} from "rules-config/rules";
import ExitFormHandler from "./formFilters/ProgramExitFormHandler";

const EnrolmentDecisions = RuleFactory("1608c2c0-0334-41a6-aab0-5c61ea1eb069", "Decision");
const EnrolmentChecklists = RuleFactory("1608c2c0-0334-41a6-aab0-5c61ea1eb069", "Checklists");
const EnrolmentFilters = RuleFactory("1608c2c0-0334-41a6-aab0-5c61ea1eb069", "ViewFilter");
const ChildProgramExit = RuleFactory("67165f46-890d-4747-ba9a-dbaa0cfa5353", "ViewFilter");


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

@ChildProgramExit("9c275d3a-c850-4d6e-aa62-58520b747f59", "Child Program exit filters", 1.0)
class ChildProgramExitFilter {
    static exec(programExit, formElementGroup) {
        return getFormElementsStatuses(programExit, formElementGroup);
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


@EnrolmentChecklists("5cd0bf6d-1e62-499b-80f4-c72538992abb", "Child vaccination schedule", 1.0)
class ChildVaccinationChecklist {
    static exec(enrolment, checklists = []) {
        const items = ["BCG", "OPV 0"].map(i => ({
            conceptName: i,
            states: {
                "good": {from: {"week": 1}, to: {"week": 2}, color: 'yellow'},
                "v.good": {from: {"week": 2}, to: {"week": 3}, color: 'green'}
            }
        }));
        const checklist = {
            name: 'Vaccination Schedule',
            items: items,
            baseDate: enrolment.individual.dateOfBirth
        };
        return checklists.concat([checklist]);
    }
}

const getEnrolmentSummary = function (programEnrolment, context, today) {
    let summary = [];
    summaryForObservation("Weight for age z-score", programEnrolment, summary);
    summaryForObservation("Height for age z-score", programEnrolment, summary);
    summaryForObservation("Weight for height z-score", programEnrolment, summary);
    return summary;
};

const summaryForObservation = function(conceptName, programEnrolment, summary) {
    let observationValue = programEnrolment.getObservationValue(conceptName);
    if (observationValue)
        summary.push({name: conceptName, value: observationValue});
};

export {
    getDecisions,
    getChecklists,
    getFormElementsStatuses,
    getEnrolmentSummary
};