import {assert} from "chai";
import zScore, {projectedSD2NegForWeight} from "../../health_modules/child/zScoreCalculator";
import {Gender, Individual} from 'openchs-models';
import moment from "moment";

describe("zScoreCalculator", () => {
    describe("zScore()", () => {
        var individual, male, female;

        beforeEach(() => {
            male = new Gender();
            male.name = 'Male';

            female = new Gender();
            female.name = 'Female';

            individual = Individual.newInstance("2425e7ce-5872-42c0-b3f2-95a134830478", "Raman", "Singh", moment().toDate(), true, male, 1);
        });

        it("calculates z-scores for an individual", () => {
            let today = new Date();
            individual.dateOfBirth = moment(today).subtract(1, 'month');
            let zScores = zScore(individual, today, 4.5, 54.7);
            assert.hasAllKeys(zScores, ['wfa', 'hfa', 'wfh']);
        });

        it("calculates weight for age z-scores for boys and girls between 0 and 5", () => {
            let zScores, today = new Date();
            individual.dateOfBirth = moment(today).subtract(1, 'month');

            zScores = zScore(individual, today, 4.5, 54.7);
            assert.equal(zScores.wfa, 0);

            zScores = zScore(individual, today, 5.1, 54.7);
            assert.equal(zScores.wfa, 1);

            individual.gender = female;

            //Notice this calculation may not exactly match the zscores as provided in the reference
            zScores = zScore(individual, today, 2.7, 54.7);
            assert.equal(zScores.wfa, -3.1);

            //Notice this calculation may not exactly match the zscores as provided in the reference
            zScores = zScore(individual, today, 3.2, 54.7);
            assert.equal(zScores.wfa, -1.9);

            zScores = zScore(individual, today, 4.2, 54.7);
            assert.equal(zScores.wfa, 0);

            zScores = zScore(individual, today, 4.8, 54.7);
            assert.equal(zScores.wfa, 1);

            zScores = zScore(individual, today, 5.5, 54.7);
            assert.equal(zScores.wfa, 2);

            zScores = zScore(individual, today, 6.2, 54.7);
            assert.equal(zScores.wfa, 3);
        });

        it("calculates height for age z-scores for boys and girls between 0 and 5", () => {
            let today = new Date();
            individual.dateOfBirth = moment(today).subtract(26, 'months').toDate();
            individual.gender = female;

            assert.equal(zScore(individual, today, 0, 77.5).hfa, -3);
            assert.equal(zScore(individual, today, 0, 80.8).hfa, -2);
            assert.equal(zScore(individual, today, 0, 84.1).hfa, -1);
            assert.equal(zScore(individual, today, 0, 87.4).hfa, 0);
            assert.equal(zScore(individual, today, 0, 90.8).hfa, 1);
            assert.equal(zScore(individual, today, 0, 94.1).hfa, 2);
            assert.equal(zScore(individual, today, 0, 97.4).hfa, 3);

            individual.gender = male;
            individual.dateOfBirth = moment(today).subtract(13, 'months').toDate();

            assert.equal(zScore(individual, today, 0, 69.6).hfa, -3);
            assert.equal(zScore(individual, today, 0, 72.1).hfa, -2);
            assert.equal(zScore(individual, today, 0, 74.5).hfa, -1);
            assert.equal(zScore(individual, today, 0, 76.9).hfa, 0);
            assert.equal(zScore(individual, today, 0, 79.3).hfa, 1);
            assert.equal(zScore(individual, today, 0, 81.2).hfa, 1.8);
            assert.equal(zScore(individual, today, 0, 81.8).hfa, 2);
            assert.equal(zScore(individual, today, 0, 84.2).hfa, 3);
        });

        it("calculates weight for height z-scores for boys and girls between 0 and 5", () => {
            let today = new Date();
            individual.dateOfBirth = moment(today).subtract(23, 'months').toDate();
            individual.gender = male;


            assert.equal(zScore(individual, today, 6.4, 68.5).wfh, -3);
            assert.equal(zScore(individual, today, 6.9, 68.5).wfh, -2);
            assert.equal(zScore(individual, today, 7.5, 68.5).wfh, -0.9);
            assert.equal(zScore(individual, today, 8.1, 68.5).wfh, 0);
            assert.equal(zScore(individual, today, 8.8, 68.5).wfh, 1);
            assert.equal(zScore(individual, today, 9.6, 68.5).wfh, 2);
            assert.equal(zScore(individual, today, 10.5, 68.5).wfh, 3);

            individual.gender = female;
            individual.dateOfBirth = moment(today).subtract(35, 'months').toDate();
            assert.equal(zScore(individual, today, 6.2, 68.5).wfh, -2.7);
            assert.equal(zScore(individual, today, 6.7, 68.5).wfh, -1.8);
            assert.equal(zScore(individual, today, 7.3, 68.5).wfh, -0.8);
            assert.equal(zScore(individual, today, 8, 68.5).wfh, 0.2);
            assert.equal(zScore(individual, today, 8.8, 68.5).wfh, 1.2);
            assert.equal(zScore(individual, today, 9.7, 68.5).wfh, 2.2);
            assert.equal(zScore(individual, today, 10.7, 68.5).wfh, 3.2);
        });

        it("does not calculate weight for age or weight for height if weight does not exist or is 0", () => {
            let today = new Date();
            individual.dateOfBirth = moment(today).subtract(23, 'months').toDate();
            individual.gender = male;
            assert.isUndefined(zScore(individual, today, 0, 68.5).wfh);
            assert.isUndefined(zScore(individual, today, 0, 68.5).wfa);
            assert.isDefined(zScore(individual, today, 0, 68.5).hfa);

            assert.isUndefined(zScore(individual, today, undefined, 68.5).wfh);
            assert.isUndefined(zScore(individual, today, undefined, 68.5).wfa);
            assert.isDefined(zScore(individual, today, undefined, 68.5).hfa);

            assert.isUndefined(zScore(individual, today, null, 68.5).wfh);
            assert.isUndefined(zScore(individual, today, null, 68.5).wfa);
            assert.isDefined(zScore(individual, today, null, 68.5).hfa);
        });

        it("does not calculate height for age if height does not exist or is 0", () => {
            let today = new Date();
            individual.dateOfBirth = moment(today).subtract(23, 'months').toDate();
            individual.gender = male;

            assert.isDefined(zScore(individual, today, 8, 0).wfa);
            assert.isUndefined(zScore(individual, today, 8, 0).hfa);
            assert.isUndefined(zScore(individual, today, 8, 0).wfh);

            assert.isDefined(zScore(individual, today, 8, undefined).wfa);
            assert.isUndefined(zScore(individual, today, 8, undefined).hfa);
            assert.isUndefined(zScore(individual, today, 8, undefined).wfh);

            assert.isDefined(zScore(individual, today, 8, null).wfa);
            assert.isUndefined(zScore(individual, today, 8, null).hfa);
            assert.isUndefined(zScore(individual, today, 8, null).wfh);
        });

        it("calculates projected SD2Neg for weight", () => {
            let encounterDate = new Date(2018, 9, 10);
            individual.dateOfBirth = moment(encounterDate).subtract(6, "months").subtract(8, "days").toDate();
            let actual = projectedSD2NegForWeight(individual, encounterDate);
            assert.approximately(actual, 6.47, 0.01);
        });
    });
});