import C from '../common';
import VisitScheduleBuilder from "../rules/VisitScheduleBuilder";
import moment from 'moment';

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

    scheduleBuilder.add({
            name: "School Dropout Followup",
            encounterType: "Dropout Followup Visit",
            earliestDate: C.addDays(new Date(), 7),
            maxDate: C.addDays(C.copyDate(new Date()), 10)
        }
    ).when.valueInEncounter("Have you started going to school once again").containsAnswerConceptName("No")
        .and.whenItem(programEncounter.programEnrolment.encounters
        .filter((encounter) => encounter.encounterType.name === "Dropout Followup Visit").length).lessThanOrEqualTo(5);

    scheduleBuilder.add({
            name: "School Dropout Followup",
            encounterType: "Dropout Followup Visit",
            earliestDate: moment().month(3).date(1).hour(0).minute(0).second(0).toDate(),
            maxDate: C.addDays(C.copyDate(moment().month(3).date(1).hour(0).minute(0).second(0).toDate()), 10)
        }
    ).when.valueInEncounter("Have you started going to school once again")
        .containsAnswerConceptName("Yes, but could not attend");

    return scheduleBuilder.getAll();
};

export {getNextScheduledVisits};
