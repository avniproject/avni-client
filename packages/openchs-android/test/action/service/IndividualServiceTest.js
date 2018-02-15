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

    const callTestFunction = (individuals) => {
        return [...individuals.reduce(individualService._uniqIndividualsFrom, new Map()).values()];
    };
    describe("Unique Individuals from Encounter", () => {
        it("Should return empty collection if no encounters", () => {
            const individuals = callTestFunction([]);
            assert.equal(0, individuals.length);
        });

        it("Should return individuals if there is 1 encounter per individual", () => {
            const individual1 = EntityFactory.createIndividual("Person 1");
            const individual2 = EntityFactory.createIndividual("Person 2");
            const individual3 = EntityFactory.createIndividual("Person 3");
            const individuals = callTestFunction([individual1, individual2, individual3]);
            assert.equal(3, individuals.length);
            assert.equal(individual1.uuid, individuals[0].uuid);
            assert.equal(individual2.uuid, individuals[1].uuid);
            assert.equal(individual3.uuid, individuals[2].uuid);
        });

        it("Should return unique individuals if there are multiple encounter per individual", () => {
            const individual1 = EntityFactory.createIndividual("Person 1");
            const individual2 = EntityFactory.createIndividual("Person 2");
            const individual3 = EntityFactory.createIndividual("Person 3");
            const individuals = callTestFunction([individual1, individual2, individual3, individual1, individual2, individual3, individual2, individual2, individual2, individual2, individual2, individual2, individual3]);
            assert.equal(3, individuals.length);
            assert.equal(individual1.uuid, individuals[0].uuid);
            assert.equal(individual2.uuid, individuals[1].uuid);
            assert.equal(individual3.uuid, individuals[2].uuid);
        });
    });

});