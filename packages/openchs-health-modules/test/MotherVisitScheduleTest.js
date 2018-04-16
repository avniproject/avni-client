const expect = require('chai').expect;
const motherVisitSchedule = require('../health_modules/mother/motherVisitSchedule');
const ProgramEnrolment = require("./Entities").ProgramEnrolment;
const ProgramEncounter = require("./Entities").ProgramEncounter;

describe('Create ANC/PNC Visit Schedule', function () {
    var enrolment;

    beforeEach(function() {
        enrolment = new ProgramEnrolment('Mother', []);
        enrolment.setObservation('Last menstrual period', new Date(2017, 0, 3));
    });

    it ("No ANC Visits are scheduled", function() {
        var scheduledVisits = motherVisitSchedule.getNextScheduledVisits(enrolment);
        expect(scheduledVisits).to.be.an('array').with.lengthOf(0);
        expect(scheduledVisits).to.have.lengthOf(0);
    });
});


