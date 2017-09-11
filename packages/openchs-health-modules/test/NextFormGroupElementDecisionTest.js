var expect = require('chai').expect;
var assert = require('chai').assert;
var getNextFormGroupElement = require('../health_modules/formElementGroupDecision');
var C = require('../health_modules/common');

describe('Get next form group element for stroke', function () {

    xit('Find next form to display incase stroke exists', function(){
        var formElementGroup = {name: 'Screening'};
        var encounter = {
            observations: [{concept: {name: 'Weakness of one side of body'}, valueJSON: {answer: true}}, {concept: {name: 'Unsteadiness of walking'}, valueJSON: {answer: true}},{concept: {name: 'last48hrs'}, valueJSON: {answer: true}}]
        };
        var nextForm = getNextFormGroupElement.getNextGroup(encounter,formElementGroup);
        assert.equal('CT Scan',nextForm);
    });

    xit('Find next form to display incase high BP and stroke ', function(){
        var formElementGroup = {name: 'Take BP'};
        var encounter = {
            observations: [{concept: {name: 'systolic'}, valueJSON: {answer: 190}}, {concept: {name: 'diastolic'}, valueJSON: {answer: 120}},{concept: {name: 'last48hrs'}, valueJSON: {answer: true}}]
        };
        var nextForm = getNextFormGroupElement.getNextGroup(encounter,formElementGroup);
        assert.equal('Advice for BP Control',nextForm);
    });
});
