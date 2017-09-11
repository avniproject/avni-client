var expect = require('chai').expect;
const assert = require('chai').assert;
var riskPredictor = require('../health_modules/ncd/cvdRiskPredictor');
const ProgramEncounter = require("./Entities").ProgramEncounter;
const Individual = require("./Entities").Individual;
const C = require('../health_modules/common');

describe('Make Decision', function () {
    var programEncounter;
    var referenceDate;

    beforeEach(function () {
        programEncounter = new ProgramEncounter();
        programEncounter.individual = new Individual();
        programEncounter.individual.setAge(55);
        programEncounter.setObservation("Smoking (Current or in last one year)", "Yes");
        programEncounter.setObservation("Systolic", 150);
    });

    it('Check for diabetes case and female', function () {
        programEncounter.setObservation("Suffering from diabetes", "Yes");
        programEncounter.individual.setGender("Female");
        var decision = riskPredictor.getCvdRisk(programEncounter);
        assert.equal('Moderate',decision.riskClassification);
        assert.equal('10 to <20%',decision.riskPercentage);
        assert.equal(2, decision.risklevel);
        assert.equal(50, decision.ageGroup);
    });

    it('Check for diabetes case and male', function () {
        programEncounter.setObservation("Suffering from diabetes", "Yes");
        programEncounter.individual.setGender("Male");
        var decision = riskPredictor.getCvdRisk(programEncounter);
        assert.equal(2, decision.risklevel);
        assert.equal(50, decision.ageGroup);
    });

    it('Check for non-diabetes and female', function () {
        programEncounter.setObservation("Suffering from diabetes", "No");
        programEncounter.individual.setGender("Female");
        var decision = riskPredictor.getCvdRisk(programEncounter);
        assert.equal(2, decision.risklevel);
        assert.equal(50, decision.ageGroup);
    });

});

