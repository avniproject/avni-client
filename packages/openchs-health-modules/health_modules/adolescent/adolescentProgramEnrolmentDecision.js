import EnrolmentFormHandler from "./formFilters/ExitFormHandler";
import FormElementsStatusHelper from "../rules/FormElementsStatusHelper";
import C from "../common";
import VisitScheduleBuilder from "../rules/VisitScheduleBuilder";


const getDecisions = (programEnrolment, context, today) => {
    return {enrolmentDecisions: [], encounterDecisions: []};
};

const getFormElementsStatuses = (programEnrolment, formElementGroup) => {
    let handler = new EnrolmentFormHandler();
    return FormElementsStatusHelper.getFormElementsStatuses(handler, programEnrolment, formElementGroup);
};

const newScheduledEncounter = (enrolment) => {
    const nextScheduledRoutineEncounter = _.chain(enrolment.scheduledEncounters())
        .filter((enc) => !enc.encounterDateTime)
        .filter((enc) => isRoutineEncounter(enc))
        .head()
        .value();

    return nextScheduledRoutineEncounter && nextScheduledRoutineEncounter.cloneForEdit() || {};
};

const getNextScheduledVisits = function (programEnrolment, today, currentEncounter) {
    const scheduleBuilder = new VisitScheduleBuilder({programEnrolment: programEnrolment});
    scheduleBuilder.add({
        name: "Annual Visit",
        encounterType: "Annual Visit",
        earliestDate: programEnrolment.enrolmentDateTime,
        maxDate: C.addDays(C.copyDate(programEnrolment.enrolmentDateTime), 10)
    }).whenItem(programEnrolment.getEncounters(true).length).equals(0);


    const existingUnfinishedDropoutHomeVisit = programEnrolment.getEncounters(true)
        .filter(encounter => encounter.encounterType.name === "Dropout Home Visit"
            && _.isNil(encounter.encounterDateTime));
    scheduleBuilder.add({
            name: "Dropout Home Visit",
            encounterType: "Dropout Home Visit",
            earliestDate: programEnrolment.enrolmentDateTime,
            maxDate: C.addDays(C.copyDate(programEnrolment.enrolmentDateTime), 15)
        }
    ).when.valueInEnrolment("School going").containsAnswerConceptName("Dropped Out")
        .and.whenItem(existingUnfinishedDropoutHomeVisit.length).equals(0);
    return scheduleBuilder.getAll();
};

export {getDecisions, getNextScheduledVisits, getFormElementsStatuses};