import C from '../common';
import VisitScheduleBuilder from "../rules/VisitScheduleBuilder";
import moment from 'moment';
import _ from 'lodash';

const routineEncounterTypeNames = ["Annual Visit", "Half-Yearly Visit", "Quarterly Visit", "Monthly Visit"];

const isRoutineEncounter = (programEncounter) => {
    return _.some(routineEncounterTypeNames, (encounterType) => encounterType === _.get(programEncounter, 'encounterType.name'));
};

const nextScheduledRoutineEncounter = (enrolment, currentEncounter) => {
    const nextScheduledRoutineEncounter = _.chain(enrolment.scheduledEncounters())
        .filter((enc) => enc.uuid !== currentEncounter.uuid)
        .filter((enc) => isRoutineEncounter(enc))
        .head()
        .value();

    return nextScheduledRoutineEncounter && nextScheduledRoutineEncounter.cloneForEdit() || {};
};

const findNextRoutineEncounterType = (forDate, enrolment) => {
    const lastAnnualEncounter = enrolment.lastFulfilledEncounter("Annual Visit");
    const monthsSinceLastAnnualEncounter = lastAnnualEncounter ? moment(forDate).diff(lastAnnualEncounter.encounterDateTime, 'months') : 0;

    switch (monthsSinceLastAnnualEncounter) {
        case 12:
            return 'Annual Visit';
        case 9:
            return "Quarterly Visit";
        case 6:
            return "Half-Yearly Visit";
        case 3:
            return "Quarterly Visit";
        default:
            return "Monthly Visit";
    }
};

const addRoutineEncounter = (programEncounter, scheduleBuilder) => {
    if (!isRoutineEncounter(programEncounter)) return;

    const enrolment = programEncounter.programEnrolment;
    const lastFulfilledRoutineEncounter = enrolment.lastFulfilledEncounter(routineEncounterTypeNames) || programEncounter;
    const earliestDate = moment(lastFulfilledRoutineEncounter.earliestVisitDateTime).add(1, 'months').startOf('day');
    const maxDate = moment(lastFulfilledRoutineEncounter.earliestVisitDateTime).add(1, 'months').add(10, 'days').startOf('day');
    const nextEncounterType = findNextRoutineEncounterType(maxDate, enrolment);


    const encounter = nextScheduledRoutineEncounter(enrolment, lastFulfilledRoutineEncounter);
    encounter.name = nextEncounterType;
    encounter.encounterType = nextEncounterType;
    encounter.earliestDate = earliestDate.toDate();
    encounter.maxDate = maxDate.toDate();

    scheduleBuilder.add(encounter);
};

const addDropoutHomeVisits = (programEncounter, scheduleBuilder) => {
    scheduleBuilder.add({
            name: "Dropout Home Visit",
            encounterType: "Dropout Home Visit",
            earliestDate: new Date(),
            maxDate: C.addDays(C.copyDate(new Date()), 15)
        }
    ).when.valueInEncounter("School going").containsAnswerConceptName("Dropped Out");
};

const addDropoutFollowUpVisits = (programEncounter, scheduleBuilder) => {
    scheduleBuilder.add({
            name: "School Dropout Followup",
            encounterType: "Dropout Followup Visit",
            earliestDate: C.addDays(new Date(), 7),
            maxDate: C.addDays(C.copyDate(new Date()), 17)
        }
    ).whenItem(programEncounter.encounterType.name).equals("Dropout Home Visit")
        .and.whenItem(programEncounter.programEnrolment.getEncounters(true)
        .filter((encounter) => encounter.encounterType.name === "Dropout Followup Visit").length).lessThanOrEqualTo(5);

    scheduleBuilder.add({
            name: "School Dropout Followup",
            encounterType: "Dropout Followup Visit",
            earliestDate: C.addDays(new Date(), 7),
            maxDate: C.addDays(C.copyDate(new Date()), 17)
        }
    ).when.valueInEncounter("Have you started going to school once again").containsAnswerConceptName("No")
        .and.whenItem(programEncounter.programEnrolment.getEncounters(true)
        .filter((encounter) => encounter.encounterType.name === "Dropout Followup Visit").length).lessThanOrEqualTo(5);

    let schoolRestartDate = moment().month(5).date(1).hour(0).minute(0).second(0);
    schoolRestartDate = schoolRestartDate < moment() ? schoolRestartDate.add(12, 'months').toDate()
        : schoolRestartDate.toDate();
    scheduleBuilder.add({
            name: "School Dropout Followup",
            encounterType: "Dropout Followup Visit",
            earliestDate: schoolRestartDate,
            maxDate: C.addDays(C.copyDate(schoolRestartDate), 15)
        }
    ).when.valueInEncounter("Have you started going to school once again")
        .containsAnswerConceptName("Yes, but could not attend");

};

const getNextScheduledVisits = function (programEncounter) {
    const scheduleBuilder = new VisitScheduleBuilder({
        programEnrolment: programEncounter.programEnrolment,
        programEncounter: programEncounter
    });

    addRoutineEncounter(programEncounter, scheduleBuilder);
    addDropoutHomeVisits(programEncounter, scheduleBuilder);
    addDropoutFollowUpVisits(programEncounter, scheduleBuilder);
    const scheduledEncounterTypes = programEncounter.programEnrolment.getEncounters(true)
        .filter((e) => _.isNil(e.encounterDateTime) && e.uuid !== programEncounter.uuid)
        .map((e) => e.encounterType.name);
    scheduleBuilder.removeVisitsWith("encounterType", scheduledEncounterTypes);
    return scheduleBuilder.getAllUnique("encounterType");
};

export {getNextScheduledVisits};
