import {expect} from 'chai';
import _ from "lodash";
import Encounter from "../../js/models/Encounter";
import Observation from "../../js/models/Observation";
import Concept from "../../js/models/Concept";
import EncounterType from "../../js/models/EncounterType";
import Individual from "../../js/models/Individual";
import PrimitiveValue from "../../js/models/observation/PrimitiveValue";
import SingleCodedValue from "../../js/models/observation/SingleCodedValue";
import EntityFactory from "../models/EntityFactory";

describe('EncounterTest', () => {
    it('toResource with valuePrimitive', () => {
        const encounter = Encounter.create();
        encounter.observations.push(Observation.create(EntityFactory.createConcept('foo', Concept.dataType.Numeric), JSON.stringify(new PrimitiveValue('10', Concept.dataType.Numeric))));
        encounter.encounterType = new EncounterType();
        encounter.individual = new Individual();
        // expect(encounter.observations[0].getValue()).is.equal(10, JSON.stringify(encounter.observations));
        const resource = encounter.toResource;
        expect(resource.observations.length).is.equal(1);
        expect(resource.observations[0].valuePrimitive).is.equal(10);

    });

    it('toResource with valueCoded', () => {
        const encounter = Encounter.create();
        encounter.observations.push(Observation.create(EntityFactory.createConcept('foo', Concept.dataType.Coded), new SingleCodedValue('f945fade-a1f5-4091-92ca-8b7feea02672')));
        encounter.encounterType = new EncounterType();
        encounter.individual = new Individual();
        expect(encounter.observations[0].getValueWrapper().getConceptUUID()).is.equal('f945fade-a1f5-4091-92ca-8b7feea02672', JSON.stringify(encounter.observations));
        const resource = encounter.toResource;
        expect(resource.observations.length).is.equal(1);
        expect(resource.observations[0].valueCoded[0]).is.equal('f945fade-a1f5-4091-92ca-8b7feea02672');
    });
});