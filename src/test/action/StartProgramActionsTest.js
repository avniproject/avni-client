import {expect} from "chai";

import {
    StartProgramActions as Actions,
} from "../../js/action/program/StartProgramActions";
import ProgramEnrolment from "../../js/models/ProgramEnrolment";
import ProgramEncounter from "../../js/models/ProgramEncounter";
import EncounterType from "../../js/models/EncounterType";
import TestContext from "../views/testframework/TestContext";
import moment from "moment";
import _ from "lodash";


describe("ProgramActions", () => {
    let ancEncounterType, serviceData = {}, enrolment, testContext;

    beforeEach(() => {
        ancEncounterType = new EncounterType("e81c86e8-f744-4730-a3ee-ad0752af380f", "ANC");
        enrolment = ProgramEnrolment.createEmptyInstance();
        enrolment.encounters = [
            ProgramEncounter.createScheduledProgramEncounter(ancEncounterType, enrolment),
            ProgramEncounter.createScheduledProgramEncounter(ancEncounterType, enrolment),
            ProgramEncounter.createScheduledProgramEncounter(ancEncounterType, enrolment)
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
            enrolment.encounters[0].scheduledDateTime = moment().add(10, 'days');
            enrolment.encounters[1].scheduledDateTime = moment().add(20, 'days');
            enrolment.encounters[2].scheduledDateTime = moment().add(5, 'days');

            const state = Actions.onLoad(null, {enrolmentUUID: enrolment.uuid}, testContext);

            expect(state.encounters[0].key).to.equal(enrolment.encounters[2].uuid);
            expect(state.encounters[1].key).to.equal(enrolment.encounters[0].uuid);
            expect(state.encounters[2].key).to.equal(enrolment.encounters[1].uuid);
        });

        it("and selects the next scheduled encounter", () => {
            enrolment.encounters[0].scheduledDateTime = moment().add(10, 'days');
            enrolment.encounters[1].scheduledDateTime = moment().add(20, 'days');
            enrolment.encounters[2].scheduledDateTime = moment().add(5, 'days');

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

    describe("On selection change", () => {
        it("sets the selected encounter to true and others to false", () => {
            const oldState = Actions.onLoad(null, {enrolmentUUID: enrolment.uuid}, testContext);

            const newState = Actions.onSelectionChange(oldState, {key: oldState.encounters[2].key}, testContext);

            expect(newState.encounters[2].selected).to.be.true;
        });

        it ("sets everything to false if uuid not provided", () => {
            const oldState = Actions.onLoad(null, {enrolmentUUID: enrolment.uuid}, testContext);

            let newState = Actions.onSelectionChange(oldState, {}, testContext);

            expect(newState.encounters[0].selected).to.be.false;
            expect(newState.encounters[1].selected).to.be.false;
            expect(newState.encounters[2].selected).to.be.false;

            newState = Actions.onSelectionChange(oldState, {key: "non-existent"}, testContext);
        });

        it("sets the selected encounter to the one selected", () => {
            let state = {};
            enrolment.encounters[0].scheduledDateTime = moment().add(5, 'days');
            enrolment.encounters[1].scheduledDateTime = moment().add(10, 'days');
            enrolment.encounters[2].scheduledDateTime = moment().add(15, 'days');

            state = Actions.onLoad(null, {enrolmentUUID: enrolment.uuid}, testContext);
            expect(state.selectedEncounter.uuid).to.equal(enrolment.encounters[0].uuid);

            state = Actions.onSelectionChange(state, {key: enrolment.encounters[1].uuid}, testContext);
            expect(state.selectedEncounter.uuid).to.equal(enrolment.encounters[1].uuid);

            let encounterTypeSelected = serviceData.programEncounterTypes[0].uuid;
            state = Actions.onSelectionChange(state, {key: encounterTypeSelected});
            expect(state.selectedEncounter.encounterType.uuid).to.equal(encounterTypeSelected);
        });
    });
});