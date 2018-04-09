const expect = require('chai').expect;
const motherVisitSchedule = require('../health_modules/mother/motherVisitSchedule');
const ProgramEnrolment = require("./Entities").ProgramEnrolment;
const ProgramEncounter = require("./Entities").ProgramEncounter;

describe('Create ANC/PNC Visit Schedule', function () {
    const matchDate = function (date1, date2) {
        return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate();
    };

    var enrolment;

    //[new ProgramEncounter('ANC', new Date(2017, 1, 3), 'ANC 1')]
    beforeEach(function() {
        enrolment = new ProgramEnrolment('Mother', []);
        enrolment.setObservation('Last menstrual period', new Date(2017, 0, 3));
    });

    it ("Creates all ANC visits for a fresh enrolment", function() {
        var scheduledVisits = motherVisitSchedule.getNextScheduledVisits(enrolment);
        expect(scheduledVisits).to.be.an('array');
        expect(scheduledVisits).to.have.lengthOf(5);
    });

    it ("Does not recreate visits if they are already present", function() {
        enrolment.encounters.push({ name: 'ANC 1', encounterType: {name: 'ANC'}, earliestDate: new Date(), maxDate: new Date()});
        var scheduledVisits = motherVisitSchedule.getNextScheduledVisits(enrolment);
        expect(scheduledVisits).to.have.lengthOf(4);
    });

    it ("Does not recreate visits if they are already present", function() {
        enrolment.encounters.push({ name: 'Delivery', encounterType: {name: 'Delivery'}, earliestDate: new Date(), maxDate: new Date(), encounterDateTime: new Date()});
        var scheduledVisits = motherVisitSchedule.getNextScheduledVisits(enrolment);
        expect(scheduledVisits).to.have.lengthOf(8);
    });
});


