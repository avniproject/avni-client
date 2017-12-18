import {assert} from "chai";
import _ from "lodash";
import IndividualService from "../../../src/service/IndividualService";
import TestContext from '../views/testframework/TestContext'

import EntityFactory from "openchs-models/test/EntityFactory";

describe('IndividualServiceTest', () => {
    let individualService;

    beforeEach(() => {
        individualService = new IndividualService({}, new TestContext());
    });
    describe("Unique Individuals from Encounter", () => {
        it("Should return empty collection if no encounters", () => {
            const individuals = individualService._uniqIndividualsFrom([]);
            assert.equal(0, individuals.length);
        });

        it("Should return individuals if there is 1 encounter per individual", () => {
            const individual1 = EntityFactory.createIndividual("Person 1");
            const individual2 = EntityFactory.createIndividual("Person 2");
            const individual3 = EntityFactory.createIndividual("Person 3");
            const enrolment1 = EntityFactory.createEnrolment({individual: individual1});
            const enrolment2 = EntityFactory.createEnrolment({individual: individual2});
            const enrolment3 = EntityFactory.createEnrolment({individual: individual3});
            const programEncounter1 = EntityFactory.createProgramEncounter({programEnrolment: enrolment1});
            const programEncounter2 = EntityFactory.createProgramEncounter({programEnrolment: enrolment2});
            const programEncounter3 = EntityFactory.createProgramEncounter({programEnrolment: enrolment3});
            const individuals = individualService._uniqIndividualsFrom([programEncounter1, programEncounter2, programEncounter3]);
            assert.equal(3, individuals.length);
            assert.equal(individual1.uuid, individuals[0].uuid);
            assert.equal(individual2.uuid, individuals[1].uuid);
            assert.equal(individual3.uuid, individuals[2].uuid);
        });

        it("Should return unique individuals if there are multiple encounter per individual", () => {
            const individual1 = EntityFactory.createIndividual("Person 1");
            const individual2 = EntityFactory.createIndividual("Person 2");
            const individual3 = EntityFactory.createIndividual("Person 3");
            const enrolment1 = EntityFactory.createEnrolment({individual: individual1});
            const enrolment2 = EntityFactory.createEnrolment({individual: individual2});
            const enrolment3 = EntityFactory.createEnrolment({individual: individual3});
            const programEncounter11 = EntityFactory.createProgramEncounter({programEnrolment: enrolment1});
            const programEncounter12 = EntityFactory.createProgramEncounter({programEnrolment: enrolment1});
            const programEncounter13 = EntityFactory.createProgramEncounter({programEnrolment: enrolment1});
            const programEncounter14 = EntityFactory.createProgramEncounter({programEnrolment: enrolment1});
            const programEncounter15 = EntityFactory.createProgramEncounter({programEnrolment: enrolment1});
            const programEncounter16 = EntityFactory.createProgramEncounter({programEnrolment: enrolment1});
            const programEncounter21 = EntityFactory.createProgramEncounter({programEnrolment: enrolment2});
            const programEncounter22 = EntityFactory.createProgramEncounter({programEnrolment: enrolment2});
            const programEncounter23 = EntityFactory.createProgramEncounter({programEnrolment: enrolment2});
            const programEncounter24 = EntityFactory.createProgramEncounter({programEnrolment: enrolment2});
            const programEncounter25 = EntityFactory.createProgramEncounter({programEnrolment: enrolment2});
            const programEncounter31 = EntityFactory.createProgramEncounter({programEnrolment: enrolment3});
            const programEncounter32 = EntityFactory.createProgramEncounter({programEnrolment: enrolment3});
            const programEncounter33 = EntityFactory.createProgramEncounter({programEnrolment: enrolment3});
            const programEncounter34 = EntityFactory.createProgramEncounter({programEnrolment: enrolment3});
            const programEncounter35 = EntityFactory.createProgramEncounter({programEnrolment: enrolment3});
            const individuals = individualService._uniqIndividualsFrom([
                programEncounter11, programEncounter12, programEncounter13, programEncounter14, programEncounter15,
                programEncounter16, programEncounter21, programEncounter22, programEncounter23, programEncounter24,
                programEncounter25, programEncounter31, programEncounter32, programEncounter33, programEncounter34,
                programEncounter35]);
            assert.equal(3, individuals.length);
            assert.equal(individual1.uuid, individuals[0].uuid);
            assert.equal(individual2.uuid, individuals[1].uuid);
            assert.equal(individual3.uuid, individuals[2].uuid);
        });
    });

});