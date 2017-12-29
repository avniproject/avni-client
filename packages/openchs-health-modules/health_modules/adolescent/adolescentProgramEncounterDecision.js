import FormFilterHelper from "../rules/FormFilterHelper";
import RoutineEncounterHandler from "./formFilters/RoutineEncounterHandler";
import DropoutEncounterFormHandler from "./formFilters/DropoutEncounterFormHandler";
import {encounterDecisions as vulnerabilityDecisionsFromEncounter} from './vulnerabilityDecisions';
import moment from 'moment';
import _ from 'lodash';

const encounterTypeHandlerMap = new Map([
    ['Annual Visit', new RoutineEncounterHandler()],
    ['Quarterly Visit', new RoutineEncounterHandler()],
    ['Half-Yearly Visit', new RoutineEncounterHandler()],
    ['Monthly Visit', new RoutineEncounterHandler()],
    ['Dropout Home Visit', new DropoutEncounterFormHandler()]
]);

export function getDecisions(programEncounter, today) {
    return vulnerabilityDecisionsFromEncounter(programEncounter.programEnrolment, programEncounter);
}

export function filterFormElements(programEncounter, formElementGroup) {
    let handler = encounterTypeHandlerMap.get(programEncounter.encounterType.name);
    return FormFilterHelper.filterFormElements(handler, programEncounter, formElementGroup);
}


const routineEncounterTypeNames = ["Annual Visit", "Half-Yearly Visit", "Quarterly Visit", "Monthly Visit"];

const isRoutineEncounter = (programEncounter) => {
    return _.some(routineEncounterTypeNames, (scheduledVisitType) => scheduledVisitType === _.get(programEncounter, 'encounterType.name'));
};

const nextScheduledVisit = (enrolment, currentEncounter) => {
    const visit = _.head(_.filter(enrolment.scheduledEncounters(), (enc) => enc.uuid !== currentEncounter.uuid));
    return visit && visit.cloneForEdit();

};

export function getNextScheduledVisits(programEncounter) {
    if (!isRoutineEncounter(programEncounter)) {
        return [];
    }
    const enrolment = programEncounter.programEnrolment;
    const lastFulfilledRoutineVisit = enrolment.lastFulfilledEncounter(routineEncounterTypeNames) || programEncounter;
    const nextScheduledVisitEarliestDate = moment(lastFulfilledRoutineVisit.earliestVisitDateTime).add(1, 'months').startOf('day');
    const nextScheduledVisitLatestDate = moment(lastFulfilledRoutineVisit.earliestVisitDateTime).add(1, 'months').add(10, 'days').startOf('day');
    const lastAnnualVisit = enrolment.lastFulfilledEncounter("Annual Visit");
    const monthsSinceLastAnnualVisit = lastAnnualVisit ? moment(nextScheduledVisitLatestDate).diff(lastAnnualVisit.encounterDateTime, 'months') : 0;
    const nextVisit = nextScheduledVisit(enrolment, programEncounter) || {};

    let createVisit = (encounterType) => {
        nextVisit.name = encounterType;
        nextVisit.encounterType = encounterType;
        nextVisit.earliestDate = nextScheduledVisitEarliestDate.toDate();
        nextVisit.maxDate = nextScheduledVisitLatestDate.toDate();
        return [nextVisit];
    };

    if (monthsSinceLastAnnualVisit === 12) {
        return createVisit('Annual Visit');
    }

    if (monthsSinceLastAnnualVisit === 6) {
        return createVisit('Half-Yearly Visit');
    }

    if (monthsSinceLastAnnualVisit === 9 || monthsSinceLastAnnualVisit === 3) {
        return createVisit('Quarterly Visit');
    }

    return createVisit("Monthly Visit");
}