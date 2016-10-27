import {expect} from 'chai';
import Individual from "../../js/models/Individual";

describe('IndividualTest', () => {
    it('getDisplayAge', () => {
        expect(Individual.getDisplayAge({dateOfBirth: '1981-01-01'})).contains("years");
        console.log(Individual.getDisplayAge({dateOfBirth: '2016-08-01'}));
    });
});