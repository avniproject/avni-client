import {assert} from "chai";
import Encounter from "../src/Encounter";
import Observation from "../src/Observation";
import Concept from "../src/Concept";
import EncounterType from "../src/EncounterType";
import Individual from "../src/Individual";
import PrimitiveValue from "../src/observation/PrimitiveValue";
import SingleCodedValue from "../src/observation/SingleCodedValue";
import EntityFactory from "./EntityFactory";

describe('EncounterTest', () => {
    it('toResource with valuePrimitive', () => {
        const encounter = Encounter.create();
        encounter.observations.push(Observation.create(EntityFactory.createConcept('foo', Concept.dataType.Numeric), JSON.stringify(new PrimitiveValue('10', Concept.dataType.Numeric))));
        encounter.encounterType = new EncounterType();
        encounter.individual = new Individual();
        // assert.equal(encounter.observations[0].getValue(), 10, JSON.stringify(encounter.observations));
        const resource = encounter.toResource;
        assert.equal(resource.observations.length, 1);
        assert.equal(resource.observations[0].value, 10);

    });

    it('toResource with valueCoded', () => {
        const encounter = Encounter.create();
        encounter.observations.push(Observation.create(EntityFactory.createConcept('foo', Concept.dataType.Coded), new SingleCodedValue('f945fade-a1f5-4091-92ca-8b7feea02672')));
        encounter.encounterType = new EncounterType();
        encounter.individual = new Individual();
        assert.equal(encounter.observations[0].getValueWrapper().getConceptUUID(), 'f945fade-a1f5-4091-92ca-8b7feea02672', JSON.stringify(encounter.observations));
        const resource = encounter.toResource;
        assert.equal(resource.observations.length, 1);
        assert.equal(resource.observations[0].value, 'f945fade-a1f5-4091-92ca-8b7feea02672');
    });
});