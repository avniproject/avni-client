import {expect} from 'chai';
import Individual from "../../js/models/Individual";

describe('IndividualTest', () => {
    it('getAge', () => {
        expect(Individual.getAge({dateOfBirth: '1981-01-01'})).contains("years");
        console.log(Individual.getAge({dateOfBirth: '2016-08-01'}));
    });
});