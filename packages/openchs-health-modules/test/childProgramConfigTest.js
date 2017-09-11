const expect = require('chai').expect;
const childProgramConfig = require('../health_modules/child/childProgramConfig');
const moment = require('moment');

describe('Child Program Config', function () {
    it("describes dashboard configuration for the child program", function () {
        expect(childProgramConfig).to.be.ok;
    });

    describe("adds a button to the program dashboard", function () {
        var weightAndHeight = function (weight, height) {
                return function (conceptName) {
                    var result = null;
                    switch (conceptName) {
                        case "Weight":
                            result = weight;
                            break;
                        case "Height":
                            result = height;
                    }
                    return result;
                }
            },
            enrolmentStub = {
                individual: {
                    getAgeInMonths: function () {
                        return moment().subtract(3, 'years');
                    },
                    getAgeInWeeks: function () {
                        return moment().subtract(156, 'weeks');
                    },
                    gender: {name: "Female"}
                },
                encounters: {
                    '0': {
                        encounterDatetime: moment().subtract(35, 'months'),
                        getObservationValue: weightAndHeight(12, 88)
                    }
                    ,
                    '1': {
                        encounterDatetime: moment().subtract(24, 'months'),
                        getObservationValue: weightAndHeight(11.7, 87)
                    }
                    ,
                    '2': {
                        encounterDatetime: moment().subtract(18, 'months'),
                        getObservationValue: weightAndHeight(10.2, 80)
                    }
                    ,
                    '3': {
                        encounterDatetime: moment().subtract(2, 'months'),
                        getObservationValue: weightAndHeight(5.1, 57)
                    }
                }
            };


        // it("called Growth Chart", function () {
        //     expect(childProgramConfig.programDashboardButtons[0].label).to.equal('Growth Chart');
        // });
        //
        it("that is mapped to a line chart for weight for Age", function () {
            var weightForAgeWidget = childProgramConfig.programDashboardButtons[0].openOnClick.data.graphsBelow13Weeks[0];
            var weightForAgeData = weightForAgeWidget.data(enrolmentStub);
            expect(weightForAgeData.length).to.equal(6);
            console.log(weightForAgeData[0]);
        });
        //
        // it("that is mapped to a line chart for height for Age", function () {
        //     var heightForAgeWidget = childProgramConfig.programDashboardButtons[0].openOnClick.data.graphsBelow5Years[1];
        //     var heightForAgeData = heightForAgeWidget.data(enrolmentStub);
        //     expect(heightForAgeData.length).to.equal(6);
        // });

        // it("that is mapped to a line chart for weight for height", function () {
        //     var weightForHeightWidget = childProgramConfig.programDashboardButtons[0].openOnClick.data.graphsBelow5Years[2];
        //     var weightForHeightData = weightForHeightWidget.data(enrolmentStub);
        //     expect(weightForHeightData.length).to.equal(6);
        //     console.log(weightForHeightData[5]);
        // });
    });
});


