jest.mock("../../../src/utility/bugsnag", () => ({__esModule: true, default: {notify: jest.fn()}}));

import {Encounter, ProgramEncounter} from "avni-models";
import {findScheduledEncounters} from "../../../src/action/customDashboard/CustomDashboardActions";
import {realEnrolment, realSubject, realVisit, realVisitType} from "../../service/customDashboard/RecordCommandFixture";

// The Do visit card's rule for a planned visit (CustomDashboardActions.js:28-38), which a card page's startVisit now
// shares. A subject's list holds its general visits, and an enrolment's list its programme visits.
describe.each([
    {parentName: 'a subject', VisitClass: Encounter, parentOf: (subject) => subject},
    {parentName: 'an enrolment', VisitClass: ProgramEncounter, parentOf: (subject) => realEnrolment('e1', subject)},
])("findScheduledEncounters on $parentName", ({VisitClass, parentOf}) => {
    const earliest = new Date(2026, 9, 1);
    const planned = {earliestVisitDateTime: earliest, encounterDateTime: null, cancelDateTime: null};

    it('keeps only the visits of the type that are planned: not voided, with an earliest visit date, neither done nor cancelled', () => {
        const visitType = realVisitType('t1');
        const parent = parentOf(realSubject('s1'));
        const plannedOfType = realVisit('plannedOfType', parent, visitType, planned);
        realVisit('plannedOfAnotherType', parent, realVisitType('t2'), planned);
        realVisit('voidedPlanned', parent, visitType, {...planned, voided: true});
        realVisit('done', parent, visitType, {...planned, encounterDateTime: new Date(2026, 9, 2)});
        realVisit('cancelled', parent, visitType, {...planned, cancelDateTime: new Date(2026, 9, 2)});
        realVisit('noEarliestDate', parent, visitType, {...planned, earliestVisitDateTime: null});
        expect(parent.encounters).toHaveLength(6);

        const found = findScheduledEncounters(parent, visitType);

        expect(found).toHaveLength(1);
        expect(found[0]).toBeInstanceOf(VisitClass);
        expect(found[0].uuid).toBe('plannedOfType');
        expect(found[0].that).toBe(plannedOfType.that);
    });
    it('finds none when the parent has no planned visit of the type', () => {
        const visitType = realVisitType('t1');
        const parent = parentOf(realSubject('s1'));
        realVisit('done', parent, visitType, {...planned, encounterDateTime: new Date(2026, 9, 2)});
        expect(findScheduledEncounters(parent, visitType)).toEqual([]);
    });
});
