import {expect} from "chai";
import { Encounter, Observation, Concept, PrimitiveValue, SingleCodedValue } from "openchs-models";
import Models from "openchs-models";
import {getObservationValue} from "../../../../src/service/decisionSupport/AdditionalFunctions";
import EntityFactory from "openchs-models/test/EntityFactory";

describe('AdditionalFunctionsTest', () => {
    beforeEach(function () {
        Encounter.prototype.getObservationValue = getObservationValue;
        Encounter.prototype.dynamicDataResolver = {
            getConceptByUUID: function (uuid) {
                return {name: 'bar'};
            }
        };
    });

    it('getObservationValue', () => {
        const encounter = new Encounter();
        encounter.observations = [Observation.create(EntityFactory.createConcept('foo', Concept.dataType.Numeric), new PrimitiveValue(2))];
        expect(encounter.getObservationValue('foo')).is.equal(2);
    });

    it('getObservationValue when coded', () => {
        const encounter = new Encounter();
        encounter.observations = [Observation.create(EntityFactory.createConcept('foo', Concept.dataType.Coded), new SingleCodedValue('c474d528-0fe3-4b2a-a875-8dba657a62b5'))];
        expect(encounter.getObservationValue('foo')).is.equal('bar');
    });
});