import {expect} from "chai";
import Encounter from "../../../js/models/Encounter";
import {getObservationValue} from "../../../js/service/decisionSupport/AdditionalFunctions";
import Observation from "../../../js/models/Observation";
import Concept from "../../../js/models/Concept";
import PrimitiveValue from "../../../js/models/observation/PrimitiveValue";
import EntityFactory from "../../models/EntityFactory";
import CodedAnswers from "../../../js/models/observation/CodedAnswers";

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
        encounter.observations = [Observation.create(EntityFactory.createConcept('foo', Concept.dataType.Coded), new CodedAnswers('c474d528-0fe3-4b2a-a875-8dba657a62b5'))];
        expect(encounter.getObservationValue('foo')).is.equal('bar');
    });
});