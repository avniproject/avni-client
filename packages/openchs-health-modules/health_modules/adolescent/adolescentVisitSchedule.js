import C from '../common';
import VisitScheduleBuilder from "../rules/VisitScheduleBuilder";

const encounterSchedule = {
    "Monthly Visit": {earliest: 30, max: 40},
    "Quarterly Visit": {earliest: 90, max: 100},
    "Half Yearly Visit": {earliest: 180, max: 190},
    "Annual Visit": {earliest: 360, max: 370}
};

const getNextScheduledVisits = function (programEncounter) {
    const scheduleBuilder = new VisitScheduleBuilder({
        programEnrolment: programEncounter.programEnrolment,
        programEncounter: programEncounter
    });
    scheduleBuilder.add({
            name: "Dropout Home Visit",
            encounterType: "Dropout Home Visit",
            earliestDate: new Date(),
            maxDate: C.addDays(C.copyDate(new Date()), 15)
        }
    ).when.valueInEncounter("School going").containsAnswerConceptName("Dropped Out");
    return scheduleBuilder.getAll();
};

export {getNextScheduledVisits};
