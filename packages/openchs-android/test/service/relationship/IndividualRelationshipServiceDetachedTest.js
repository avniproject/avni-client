import {assert} from "chai";
import {Encounter, Individual, IndividualRelation, IndividualRelationshipType, IndividualRelative} from "openchs-models";
import IndividualRelationshipService from "../../../src/service/relationship/IndividualRelationshipService";
import IndividualRelationshipTypeService from "../../../src/service/relationship/IndividualRelationshipTypeService";
import EntityService from "../../../src/service/EntityService";

const relation = (uuid, name) => {
    const r = new IndividualRelation();
    r.uuid = uuid;
    r.name = name;
    return r;
};
const DAUGHTER = relation("daughter", "Daughter");
const FATHER = relation("father", "Father");

const relationshipType = () => {
    const t = IndividualRelationshipType.createEmptyInstance();
    t.uuid = "father-daughter";
    t.individualAIsToBRelation = FATHER;
    t.individualBIsToARelation = DAUGHTER;
    return t;
};

const person = (uuid, encounterCount) => {
    const individual = Individual.createEmptyInstance();
    individual.uuid = uuid;
    individual.firstName = uuid;
    for (let i = 0; i < encounterCount; i++) {
        const encounter = Encounter.createEmptyInstance();
        encounter.uuid = `${uuid}-visit-${i}`;
        individual.encounters.push(encounter);
    }
    return individual;
};

// The database member has the 4 visits just scheduled; the form's copy of the member has none.
const setUp = () => {
    const db = {head: person("head", 2), member: person("member", 4)};
    const created = {};
    const repositoryFor = (schema) => ({
        create: (entity) => {
            (created[schema] = created[schema] || []).push(entity);
            return entity;
        },
        findAll: () => ({filtered: () => ({forEach: () => {}})}),
    });
    const services = new Map([
        [EntityService, {findByUUID: (uuid) => db[uuid]}],
        [IndividualRelationshipTypeService, {getRelationshipType: () => relationshipType()}],
    ]);
    const context = {
        getService: (key) => services.get(key),
        getRepositoryFactory: () => ({getRepository: repositoryFor, transactionManager: {write: (fn) => fn()}}),
    };
    const service = new IndividualRelationshipService(null, context);
    return {db, created, service};
};

const relativeFromForm = (db) => new IndividualRelative(db.head, person("member", 0), DAUGHTER);

describe("IndividualRelationshipService writes the individuals as they are in the database", () => {
    it("on Add Member, the relationship carries the member with the visits scheduled at registration", () => {
        const {db, created, service} = setUp();

        service.addOrUpdateRelative(relativeFromForm(db));

        const written = created["IndividualRelationship"][0];
        assert.strictEqual(written.that.individualB, db.member.that, "the member written must be the database one, not the form copy");
        assert.strictEqual(written.that.individualA, db.head.that);
        assert.lengthOf(written.individualB.encounters, 4);
    });

    it("on Add Relative, both people are written as they are in the database", () => {
        const {db, created, service} = setUp();
        const individualRelative = new IndividualRelative(person("head", 0), person("member", 0), DAUGHTER);

        service.addRelative(individualRelative);

        const written = created["IndividualRelationship"][0];
        assert.strictEqual(written.that.individualA, db.head.that);
        assert.strictEqual(written.that.individualB, db.member.that);
        assert.lengthOf(written.individualA.encounters, 2);
    });

    it("saves a person not yet in the database as passed, as before, instead of failing", () => {
        const {created, service} = setUp();
        const newcomer = person("newcomer", 0);

        service.addRelative(new IndividualRelative(person("head", 0), newcomer, DAUGHTER));

        assert.strictEqual(created["IndividualRelationship"][0].that.individualB, newcomer.that);
        assert.lengthOf(created["EntityQueue"], 1);
    });

    it("still links the saved relationship to both people and queues it for upload", () => {
        const {db, created, service} = setUp();

        service.addOrUpdateRelative(relativeFromForm(db));

        assert.lengthOf(db.head.relationships, 1);
        assert.lengthOf(db.member.relationships, 1);
        assert.lengthOf(created["EntityQueue"], 1);
    });
});
