import {expect} from 'chai';
import _ from "lodash";
import Encounter from "../../js/models/Encounter";
import Observation from "../../js/models/Observation";
import Concept from "../../js/models/Concept";
import EncounterType from "../../js/models/EncounterType";
import Individual from "../../js/models/Individual";
import PrimitiveValue from "../../js/models/observation/PrimitiveValue";

describe('EncounterTest', () => {
    it('toResource', () => {
        const encounter = Encounter.create();
        encounter.observations.push(Observation.create(Concept.create('foo', Concept.dataType.Numeric), JSON.stringify(new PrimitiveValue(10))));
        encounter.encounterType = new EncounterType();
        encounter.individual = new Individual();
        expect(encounter.observations[0].getValue()).is.equal(10, JSON.stringify(encounter.observations));
        const resource = encounter.toResource;
        expect(resource.observations.length).is.equal(1);
        expect(resource.observations[0].value).is.equal(10);
    });
});