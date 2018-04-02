import config from "../../health_modules/child/newChildProgramConfig";
const expect = require('chai').expect;
import _ from "lodash";
import {ProgramEnrolment, Gender, Individual} from "openchs-models";
import wfa_boys from "../../health_modules/child/anthropometry/wfa_boys";


describe("Child Program Config", () => {
    let programEnrolment;
    beforeEach(() => {
        programEnrolment = ProgramEnrolment.createEmptyInstance();
        let male = new Gender();
        male.name = "Male";
        let individual = Individual.newInstance("f585d2f0-c148-460c-b7ac-d1d3923cf14c", "Ramesh", "Nair", new Date(2010, 1, 1), true, male, 1);
        programEnrolment.individual = individual;
        programEnrolment.enrolmentDateTime = new Date(2017, 0, 0, 5);
    });

    it("Should return a config object with program dashboard buttons", () => {
        expect(config.programDashboardButtons).to.be.an('array').with.lengthOf(1);
        const growthChart = config.programDashboardButtons[0];
        expect(growthChart).to.be.ok;
        expect(growthChart.label).to.equal('Growth Chart');
        expect(growthChart.openOnClick.type).to.equal('growthChart');
        console.log(programEnrolment)
        expect(growthChart.openOnClick.data(programEnrolment)).to.have.keys('weightForAge', 'heightForAge');
    });

    it("Should return reference lines for weightForAge", () => {
        const data = config.programDashboardButtons[0].openOnClick.data(programEnrolment);
        _.each(wfa_boys, (item) => expect(_.find(data.weightForAge, (weightForAge) => weightForAge.Month === item.Month)).to.deep.equal(item));
    });
});