import {expect} from "chai";

import {
    StartProgramActions as Actions,
} from "../../src/action/program/StartProgramActions";
import {ProgramEnrolment, ProgramEncounter, EncounterType} from 'avni-models';
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
            expect(_.map(state.encounterTypes, 'encounterType')).to.have.members(serviceData.programEncounterTypes);
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
            enrolment.encounters[0].earliestVisitDateTime = moment().add(10, 'days').toDate();
            enrolment.encounters[1].earliestVisitDateTime = moment().add(20, 'days').toDate();
            enrolment.encounters[2].earliestVisitDateTime = moment().add(5, 'days').toDate();

            enrolment.encounters[0].uuid = '10';
            enrolment.encounters[1].uuid = '20';
            enrolment.encounters[2].uuid = '5';

            const state = Actions.onLoad(null, {enrolmentUUID: enrolment.uuid}, testContext);

            expect(state.encounters[0].encounter.uuid).to.equal('5');
            expect(state.encounters[1].encounter.uuid).to.equal('10');
            expect(state.encounters[2].encounter.uuid).to.equal('20');
        });
    });

});