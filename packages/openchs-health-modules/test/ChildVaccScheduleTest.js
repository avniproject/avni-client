var expect = require('chai').expect;
var assert = require('chai').assert;
import getVaccSchedule from '../health_modules/child/childVaccSchedule';

describe('Create Child Vaccincation Schedule', function () {
    var progEnrolment;
    var date = new Date(2017, 3, 10);
    progEnrolment = {
        individual: {
            dateOfBirth: date
        }
    };

    it('Get Vacc Schedule for a new born', function () {
        var vaccSchedules = getVaccSchedule.getVaccSchedule(progEnrolment).items;
        var vaccNames = vaccSchedules.map(function (vaccSchedule) {
            return vaccSchedule.name;
        });
        expect(vaccNames.indexOf("BCG")).is.not.equal(-1);
        expect(vaccNames.indexOf("OPV 0")).is.not.equal(-1);
        expect(vaccNames.indexOf("OPV 1")).is.not.equal(-1);
    });

    it('Check vacc date for OPV3 vaccination', function () {
        var vaccSchedules = getVaccSchedule.getVaccSchedule(progEnrolment).items;
        var OPV3 = vaccSchedules[7];
        assert.equal(true, matchDate(OPV3.dueDate, new Date(2017, 6, 17)), OPV3.dueDate);
    });

    var matchDate = function (date1, date2) {
        return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate();
    }
});