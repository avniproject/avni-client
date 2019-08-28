import {expect} from "chai";

import {
    StartProgramActions as Actions,
} from "../../src/action/program/StartProgramActions";
import {ProgramEnrolment, ProgramEncounter, EncounterType} from 'openchs-models';
import TestContext from "./views/testframework/TestContext";
import moment from "moment";
import _ from "lodash";


describe("ProgramActions", () => {
    let ancEncounterType, serviceData = {}, enrolment, testContext;

    beforeEach(() => {
        ancEncounterType = new EncounterType("e81c86e8-f744-4730-a3ee-ad0752af380f", "ANC");
        enrolment = ProgramEnrolment.createEmptyInstance();
        enrolment.encounters = [
            ProgramEncounter.createScheduled(ancEncounterType, enrolment),
            ProgramEncounter.createScheduled(ancEncounterType, enrolment),
            ProgramEncounter.createScheduled(ancEncounterType, enrolment)
        ];

        serviceData[enrolment.uuid] = enrolment;
        serviceData.programEncounterTypes = [
            EncounterType.fromResource({uuid: "e1a853a6-7fbb-4ee2-ba56-e67b3e6f7e8f", name: 'ANC'}),
            EncounterType.fromResource({uuid: "6e53b7bd-9db8-4a5c-87d7-6e436cc23ecc", name: 'PNC'}),
            EncounterType.fromResource({uuid: "30202747-b170-4142-a322-9091377411a9", name: 'Delivery'}),
        ];

        testContext = new TestContext(serviceData);
        return {enrolment: enrolment, testContext: testContext};
    });

    describe("On initialization", () => {

        it("adds list of encounter types for program to state", () => {
            const state = Actions.onLoad(null, {enrolmentUUID: enrolment.uuid}, testContext);
            expect(state.encounterTypes).to.have.lengthOf(3);
            expect(_.map(state.encounterTypes, (encounterType) => encounterType.data)).to.have.members(serviceData.programEncounterTypes);
            expect(_.map(state.encounterTypes, (encounterType) => encounterType.selected)).to.have.members([false, false, false]);
        });

        it("adds existing encounters to state", () => {
            const state = Actions.onLoad(null, {enrolmentUUID: enrolment.uuid}, testContext);
            expect(state.encounters).to.have.lengthOf(3);
        });

        it("only when they are unfulfilled", () => {
            enrolment.encounters[0].encounterDateTime = moment();

            const state = Actions.onLoad(null, {enrolmentUUID: enrolment.uuid}, testContext);

            expect(state.encounters).to.have.lengthOf(2);
        });

        it("sorts them by scheduled date", () => {
            enrolment.encounters[0].earliestVisitDateTime = moment().add(10, 'days');
            enrolment.encounters[1].earliestVisitDateTime = moment().add(20, 'days');
            enrolment.encounters[2].earliestVisitDateTime = moment().add(5, 'days');

            const state = Actions.onLoad(null, {enrolmentUUID: enrolment.uuid}, testContext);

            expect(state.encounters[0].key).to.equal(enrolment.encounters[2].uuid);
            expect(state.encounters[1].key).to.equal(enrolment.encounters[0].uuid);
            expect(state.encounters[2].key).to.equal(enrolment.encounters[1].uuid);
        });

        it("and selects the next scheduled encounter", () => {
            enrolment.encounters[0].earliestVisitDateTime = moment().add(10, 'days');
            enrolment.encounters[1].earliestVisitDateTime = moment().add(20, 'days');
            enrolment.encounters[2].earliestVisitDateTime = moment().add(5, 'days');

            const state = Actions.onLoad(null, {enrolmentUUID: enrolment.uuid}, testContext);
            expect(state.encounters[0].key).to.equal(enrolment.encounters[2].uuid);
            expect(state.encounters[0].selected).to.be.true;
            expect(state.encounters[1].selected).to.be.false;
            expect(state.encounters[2].selected).to.be.false;

        });

        it("preselects first encounter type if no planned encounter available and only one encounter type ", () => {
            enrolment.encounters = [];
            serviceData.programEncounterTypes = [
                EncounterType.fromResource({uuid: "e1a853a6-7fbb-4ee2-ba56-e67b3e6f7e8f", name: 'ANC'})
            ];

            const state = Actions.onLoad(null, {enrolmentUUID: enrolment.uuid}, testContext);
            expect(state.encounterTypes[0].selected).to.be.true;
        });
    });

    describe("Utility functions", () => {
       it("asDisplayDate formats dates in the right display format", () => {
           const encounter =  ProgramEncounter.createScheduled(ancEncounterType, enrolment);
           encounter.name = "ANC 1";
           encounter.earliestVisitDateTime = moment("1995-12-25");
           let i18n = {
               t: function (abc) {
                   return abc;
               }
           };
           expect(Actions.displayLabel(encounter, i18n)).to.equal("ANC 1 (25-Dec-1995)");
       });
    });
});