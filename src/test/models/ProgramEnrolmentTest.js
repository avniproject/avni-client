import {expect} from "chai";
import ProgramEnrolment from "../../js/models/ProgramEnrolment";
import TestContext from "../views/testframework/TestContext";
import ConceptService from "../../js/service/ConceptService";
import ProgramEncounter from "../../js/models/ProgramEncounter";
import moment from "moment";

describe('ProgramEnrolmentTest', () => {
    it('mergeChecklists', () => {
        const testContext = new TestContext([{name: 'A1'}]);
        const enrolment = ProgramEnrolment.createEmptyInstance();
        const expectedChecklists = [{name: 'Vaccination', items: [{name: 'A1', dueDate: new Date(), maxDate: new Date()}]}];
        const checklists = enrolment.createChecklists(expectedChecklists, testContext.get(ConceptService));
        expect(checklists.length).is.equal(1);
    });

    it('getEncounters', () => {
        const enrolment = ProgramEnrolment.createEmptyInstance();

        enrolment.addEncounter(createEncounter(new Date(2017, 3, 1)));
        const newest = createEncounter(new Date(2017, 4, 1));
        enrolment.addEncounter(newest);
        enrolment.addEncounter(createEncounter(new Date(2017, 2, 1)));

        expect(enrolment.getEncounters()[0].uuid).is.equal(newest.uuid);
    });

    describe("lastFulfilledEncounter", () => {

        it("returns null if no encounters are present in enrolment", () => {
            expect(ProgramEnrolment.createEmptyInstance().lastFulfilledEncounter).to.be.undefined;
        });

        it("returns null if none of the encounters have an encounterDatetime", () => {
            const enrolment = ProgramEnrolment.createEmptyInstance();
            enrolment.addEncounter(createEncounter(null));

            expect(enrolment.lastFulfilledEncounter).to.be.undefined;

            enrolment.addEncounter(createEncounter(null));

            expect(enrolment.lastFulfilledEncounter).to.be.undefined;

            enrolment.addEncounter(createEncounter(new Date()));
            expect(enrolment.lastFulfilledEncounter).not.to.be.undefined;
        });

        it("returns the encounter with the greatest encounterDateTime", () => {
            const enrolment = ProgramEnrolment.createEmptyInstance();
            const todaysEncounter = createEncounter(new Date());
            enrolment.addEncounter(todaysEncounter);

            expect(enrolment.lastFulfilledEncounter).to.equal(todaysEncounter);

            const yesterdaysEncounter = createEncounter(moment().subtract(1, 'days').toDate());
            enrolment.addEncounter(yesterdaysEncounter);

            expect(enrolment.lastFulfilledEncounter).to.equal(todaysEncounter);

            const tomorrowsEncounter = createEncounter(moment().add(1, 'days').toDate());
            enrolment.addEncounter(tomorrowsEncounter);

            expect(enrolment.lastFulfilledEncounter).to.equal(tomorrowsEncounter);

            const encounterNotYetFilled = createEncounter(undefined);
            enrolment.addEncounter(encounterNotYetFilled);

            expect(enrolment.lastFulfilledEncounter).to.equal(tomorrowsEncounter);
        });

    });

    function createEncounter(date) {
        const encounter = ProgramEncounter.createEmptyInstance();
        encounter.encounterDateTime = date;
        return encounter;
    }
});