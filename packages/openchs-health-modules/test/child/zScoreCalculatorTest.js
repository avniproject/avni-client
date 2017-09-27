import {expect, assert} from "chai";
import zScore from "../../health_modules/child/zScoreCalculator";
import {Gender, Individual} from "openchs-models";
import moment from "moment";

describe("zScoreCalculator", () => {
    describe("zScore()", () => {
        var individual, male, female;

        beforeEach(() => {
            male = new Gender();
            male.name = 'Male';

            female = new Gender();
            female.name = 'Female';

            individual = Individual.newInstance("2425e7ce-5872-42c0-b3f2-95a134830478", "Raman Singh", moment().toDate(), true, male, 1);
        });

        it("calculates z-scores for an individual", () => {
            let today = new Date();
            individual.dateOfBirth = moment(today).subtract(1, 'month');
            let zScores = zScore(individual, today, 4.5, 54.7);
            expect(zScores).to.have.all.keys('wfa', 'hfa', 'wfh');
        });

        it("calculates weight for age z-scores for boys and girls between 0 and 5", () => {
            let zScores, today = new Date();
            individual.dateOfBirth = moment(today).subtract(1, 'month');

            zScores = zScore(individual, today, 4.5, 54.7);
            expect(zScores.wfa).to.equal(0);

            zScores = zScore(individual, today, 5.1, 54.7);
            expect(zScores.wfa).to.equal(1);

            individual.gender = female;

            //Notice this calculation may not exactly match the zscores as provided in the reference
            zScores = zScore(individual, today, 2.7, 54.7);
            expect(zScores.wfa).to.equal(-3.1);

            //Notice this calculation may not exactly match the zscores as provided in the reference
            zScores = zScore(individual, today, 3.2, 54.7);
            expect(zScores.wfa).to.equal(-1.9);

            zScores = zScore(individual, today, 4.2, 54.7);
            expect(zScores.wfa).to.equal(0);

            zScores = zScore(individual, today, 4.8, 54.7);
            expect(zScores.wfa).to.equal(1);

            zScores = zScore(individual, today, 5.5, 54.7);
            expect(zScores.wfa).to.equal(2);

            zScores = zScore(individual, today, 6.2, 54.7);
            expect(zScores.wfa).to.equal(3);
        });

        it("calculates height for age z-scores for boys and girls between 0 and 5", () => {
            let today = new Date();
            individual.dateOfBirth = moment(today).subtract(26, 'months').toDate();
            individual.gender = female;

            expect(zScore(individual, today, 0, 77.5).hfa).to.equal(-3);
            expect(zScore(individual, today, 0, 80.8).hfa).to.equal(-2);
            expect(zScore(individual, today, 0, 84.1).hfa).to.equal(-1);
            expect(zScore(individual, today, 0, 87.4).hfa).to.equal(0);
            expect(zScore(individual, today, 0, 90.8).hfa).to.equal(1);
            expect(zScore(individual, today, 0, 94.1).hfa).to.equal(2);
            expect(zScore(individual, today, 0, 97.4).hfa).to.equal(3);

            individual.gender = male;
            individual.dateOfBirth = moment(today).subtract(13, 'months').toDate();

            expect(zScore(individual, today, 0, 69.6).hfa).to.equal(-3);
            expect(zScore(individual, today, 0, 72.1).hfa).to.equal(-2);
            expect(zScore(individual, today, 0, 74.5).hfa).to.equal(-1);
            expect(zScore(individual, today, 0, 76.9).hfa).to.equal(0);
            expect(zScore(individual, today, 0, 79.3).hfa).to.equal(1);
            expect(zScore(individual, today, 0, 81.2).hfa).to.equal(1.8);
            expect(zScore(individual, today, 0, 81.8).hfa).to.equal(2);
            expect(zScore(individual, today, 0, 84.2).hfa).to.equal(3);
        });

        it("calculates weight for height z-scores for boys and girls between 0 and 5", () => {
            let today = new Date();
            individual.dateOfBirth = moment(today).subtract(23, 'months').toDate();
            individual.gender = male;


            expect(zScore(individual, today, 6.4, 68.5).wfh).to.equal(-3);
            expect(zScore(individual, today, 6.9, 68.5).wfh).to.equal(-2);
            expect(zScore(individual, today, 7.5, 68.5).wfh).to.equal(-0.9);
            expect(zScore(individual, today, 8.1, 68.5).wfh).to.equal(0);
            expect(zScore(individual, today, 8.8, 68.5).wfh).to.equal(1);
            expect(zScore(individual, today, 9.6, 68.5).wfh).to.equal(2);
            expect(zScore(individual, today, 10.5, 68.5).wfh).to.equal(3);

            individual.gender = female;
            individual.dateOfBirth = moment(today).subtract(35, 'months').toDate();
            expect(zScore(individual, today, 6.2, 68.5).wfh).to.equal(-2.9);
            expect(zScore(individual, today, 6.7, 68.5).wfh).to.equal(-2);
            expect(zScore(individual, today, 7.3, 68.5).wfh).to.equal(-1);
            expect(zScore(individual, today, 8, 68.5).wfh).to.equal(0);
            expect(zScore(individual, today, 8.8, 68.5).wfh).to.equal(1);
            expect(zScore(individual, today, 9.7, 68.5).wfh).to.equal(2);
            expect(zScore(individual, today, 10.7, 68.5).wfh).to.equal(3);
        });

        it("does not calculate weight for age or weight for height if weight does not exist or is 0", () => {
            let today = new Date();
            individual.dateOfBirth = moment(today).subtract(23, 'months').toDate();
            individual.gender = male;
            expect(zScore(individual, today, 0, 68.5).wfh).to.be.undefined;
            expect(zScore(individual, today, 0, 68.5).wfa).to.be.undefined;
            expect(zScore(individual, today, 0, 68.5).hfa).to.be.defined;

            expect(zScore(individual, today, undefined, 68.5).wfh).to.be.undefined;
            expect(zScore(individual, today, undefined, 68.5).wfa).to.be.undefined;
            expect(zScore(individual, today, undefined, 68.5).hfa).to.be.defined;

            expect(zScore(individual, today, null, 68.5).wfh).to.be.undefined;
            expect(zScore(individual, today, null, 68.5).wfa).to.be.undefined;
            expect(zScore(individual, today, null, 68.5).hfa).to.be.defined;
        });

        it("does not calculate height for age if height does not exist or is 0", () => {
            let today = new Date();
            individual.dateOfBirth = moment(today).subtract(23, 'months').toDate();
            individual.gender = male;

            expect(zScore(individual, today, 8, 0).wfa).to.be.defined;
            expect(zScore(individual, today, 8, 0).hfa).to.be.undefined;
            expect(zScore(individual, today, 8, 0).wfh).to.be.undefined;

            expect(zScore(individual, today, 8, undefined).wfa).to.be.defined;
            expect(zScore(individual, today, 8, undefined).hfa).to.be.undefined;
            expect(zScore(individual, today, 8, undefined).wfh).to.be.undefined;

            expect(zScore(individual, today, 8, null).wfa).to.be.defined;
            expect(zScore(individual, today, 8, null).hfa).to.be.undefined;
            expect(zScore(individual, today, 8, null).wfh).to.be.undefined;
        });
    });
});