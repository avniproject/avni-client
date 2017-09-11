var expect = require('chai').expect;

describe('ProgramEncounterDecisionTest', function() {
    it('wiring', function() {
        var exports = require('../health_modules/programEncounterDecision');
        expect(exports.getNextScheduledVisits).is.not.undefined;
    });
});