import {expect} from 'chai';
import Individual from "../../js/models/Individual";

describe('IndividualTest', () => {
    it('getDisplayAge', () => {
        var individual = new Individual();
        individual.dateOfBirth = '1981-01-01';
        expect(individual.getAge().toString()).contains("Years");
    });
});