import C from '../common';
import {RuleCondition, VisitScheduleBuilder, RuleFactory} from "rules-config/rules";
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
    const monthsSinceLastAnnualEncounter = lastAnnualEncounter ? moment(forDate).diff(lastAnnualEncounter.encounterDateTime, 'months') : NaN;

    switch (monthsSinceLastAnnualEncounter) {
        case NaN:
            return "Annual Visit";
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

    let increment = 1;

    if (new RuleCondition({programEncounter: programEncounter})
            .when.valueInEncounter("Standard").containsAnyAnswerConceptName("11", "12")
            .and.addressType.equalsOneOf("School", "Boarding").matches()) {
        increment = 6;
    }
    const dateTimeToUse = lastFulfilledRoutineEncounter.earliestVisitDateTime || lastFulfilledRoutineEncounter.encounterDateTime;
    const earliestDate = moment(dateTimeToUse).add(increment, 'months').startOf('day');
    const maxDate = moment(dateTimeToUse).add(increment, 'months').add(10, 'days').startOf('day');
    const nextEncounterType = findNextRoutineEncounterType(maxDate, enrolment);


    const encounter = nextScheduledRoutineEncounter(enrolment, lastFulfilledRoutineEncounter);
    encounter.name = nextEncounterType;
    encounter.encounterType = nextEncounterType;
    encounter.earliestDate = earliestDate.toDate();
    encounter.maxDate = maxDate.toDate();

    scheduleBuilder.add(encounter);
};

const addDropoutHomeVisits = (programEncounter, scheduleBuilder) => {
    const dateTimeToUse = programEncounter.encounterDateTime;
    const enrolment = programEncounter.programEnrolment;
    const scheduledDropoutVisit = enrolment.scheduledEncountersOfType("Dropout Home Visit");
    if (!_.isEmpty(scheduledDropoutVisit)) return;
    scheduleBuilder.add({
            name: "Dropout Home Visit",
            encounterType: "Dropout Home Visit",
            earliestDate: dateTimeToUse,
            maxDate: C.addDays(dateTimeToUse, 15)
        }
    ).when.valueInEncounter("School going").containsAnswerConceptName("Dropped Out");
};

const addDropoutFollowUpVisits = (programEncounter, scheduleBuilder) => {
    const dateTimeToUse = programEncounter.encounterDateTime;
    const enrolment = programEncounter.programEnrolment;
    const scheduledDropoutVisit = enrolment.scheduledEncountersOfType("Dropout Followup Visit");
    if (!_.isEmpty(scheduledDropoutVisit)) return;
    scheduleBuilder.add({
            name: "Dropout Followup Visit",
            encounterType: "Dropout Followup Visit",
            earliestDate: C.addDays(dateTimeToUse, 7),
            maxDate: C.addDays(dateTimeToUse, 17)
        }
    ).whenItem(programEncounter.encounterType.name).equals("Dropout Home Visit")
        .and.whenItem(programEncounter.programEnrolment.getEncounters(true)
        .filter((encounter) => encounter.encounterType.name === "Dropout Followup Visit").length).lessThanOrEqualTo(5);

    scheduleBuilder.add({
            name: "Dropout Followup Visit",
            encounterType: "Dropout Followup Visit",
            earliestDate: C.addDays(dateTimeToUse, 7),
            maxDate: C.addDays(dateTimeToUse, 17)
        }
    ).when.valueInEncounter("Have you started going to school once again").containsAnswerConceptName("No")
        .and.whenItem(programEncounter.programEnrolment.getEncounters(true)
        .filter((encounter) => encounter.encounterType.name === "Dropout Followup Visit").length).lessThanOrEqualTo(5);

    let schoolRestartDate = moment(programEncounter.encounterDateTime).month(5).date(1).hour(0).minute(0).second(0);
    schoolRestartDate = schoolRestartDate < moment(programEncounter.encounterDateTime) ? schoolRestartDate.add(12, 'months').toDate()
        : schoolRestartDate.toDate();
    scheduleBuilder.add({
            name: "Dropout Followup Visit",
            encounterType: "Dropout Followup Visit",
            earliestDate: schoolRestartDate,
            maxDate: C.addDays(schoolRestartDate, 15)
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

    return scheduleBuilder.getAllUnique("encounterType");
};

const RoutineVisitSchedule = RuleFactory("92cd5f05-eec3-4e70-9537-62119c5e3a16", "VisitSchedule");
const DropoutVisitSchedule = RuleFactory("54636d6b-33bf-4faf-9397-eb3b1d9b1792", "VisitSchedule");
const DropoutFollowupVisitSchedule = RuleFactory("0c444bf3-54c3-41e4-8ca9-f0deb8760831", "VisitSchedule");
const Adolescent11thAnd12thSchedule = RuleFactory("33583095-09be-408d-8e4b-fbcfee047aaa", "VisitSchedule");

@RoutineVisitSchedule("8c711ca5-63de-44c6-a824-6b85177822b3", "Routine Visit Schedule Default", 1.0, {})
class RoutineVisit {
    static exec(programEncounter, schedule, visitScheduleConfig) {
        return getNextScheduledVisits(programEncounter);
    }
}


@DropoutVisitSchedule("08cdd999-47bb-4205-917b-efb2a819121f", "Dropout Visit Schedule Default", 1.0, {})
class DropoutVisit {
    static exec(programEncounter, schedule, visitScheduleConfig) {
        return getNextScheduledVisits(programEncounter);
    }
}


@DropoutFollowupVisitSchedule("64ae053e-97f4-4fc3-878d-81c3545136a7", "Dropout Followup Visit Schedule Default", 1.0, {})
class DropoutFollowupVisit {
    static exec(programEncounter, schedule, visitScheduleConfig) {
        return getNextScheduledVisits(programEncounter);
    }
}


@Adolescent11thAnd12thSchedule("2fb3ed8a-23b4-4478-9782-a597fe547251", "11th and 12th Standard Visit Schedule Default", 1.0, {})
class Adolescent11thAnd12thVisit {
    static exec(programEncounter, schedule, visitScheduleConfig) {
        return getNextScheduledVisits(programEncounter);
    }
}

export {getNextScheduledVisits};
