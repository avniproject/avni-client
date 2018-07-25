import _ from "lodash";
import wfa_boys from "./anthropometry/wfa_boys";
import wfa_girls from "./anthropometry/wfa_girls";
import hfa_boys from "./anthropometry/lhfa_boys";
import hfa_girls from "./anthropometry/lhfa_girls";
import wfh_boys from "./anthropometry/wflh_boys";
import wfh_girls from "./anthropometry/wflh_girls";


const anthropometricReference = {
    wfa: {Male: wfa_boys, Female: wfa_girls},
    hfa: {Male: hfa_boys, Female: hfa_girls},
    wfh: {Male: wfh_boys, Female: wfh_girls}
};

const roundedHeight = (num) =>{
    return Math.round(num*2)/2;
};

const getReference = (gender, ageInMonths, height) => {
    let wfhReference = _.get(anthropometricReference, ["wfh", gender]);
    let wfaReference = _.get(anthropometricReference, ["wfa", gender]);
    let heightForAgeReference = _.get(anthropometricReference, ["hfa", gender]);
    return {
        wfa: _.find(wfaReference, (item) => item.Month === ageInMonths),
        hfa: _.find(heightForAgeReference, (item) => item.Month === ageInMonths),
        wfh: _.find(wfhReference,(item) => item.x === roundedHeight(height))
    }
};

/**
 * Uses the LMS formula to calculate zScore.
 *
 * Note: Weight/height measurements are available only for the nearest single digit, so
 * the final figure can only have one degree of accuracy.
 * @param value
 * @param reference
 * @returns {*}
 */
const calculate = (value, reference) => {
    if (!value || value === 0 || !reference) return undefined;

   return Math.round(10 * (Math.pow(value / reference.M, reference.L) - 1) / (reference.S * reference.L)) / 10;
};

const calculateZScore = (gender, ageInMonths, weight, height) => {
    let reference = getReference(gender, ageInMonths, height);
    return {
        wfa: calculate(weight, reference.wfa),
        hfa: calculate(height, reference.hfa),
        wfh: calculate(weight, reference.wfh)
    }
};

const zScore = (individual, asOnDate, weight, height) => {
    let ageInMonths = individual.getAgeInMonths(asOnDate);
    let gender = _.get(individual, "gender.name");

    return calculateZScore(gender, ageInMonths, weight, height);
};

export default zScore;