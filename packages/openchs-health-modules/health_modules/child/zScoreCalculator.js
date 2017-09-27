import _ from "lodash";
import wfa_boys from "./anthropometricReference/wfa_boys_0_5_zscores.json";
import wfa_girls from "./anthropometricReference/wfa_girls_0_5_zscores.json";
import hfa_boys from "./anthropometricReference/lhfa_boys_0_5_zscores.json";
import hfa_girls from "./anthropometricReference/lhfa_girls_0_5_zscores.json";
import wfh_boys_0_2 from "./anthropometricReference/wfl_boys_0_2_zscores.json";
import wfh_boys_2_5 from "./anthropometricReference/wfh_boys_2_5_zscores.json";
import wfh_girls_0_2 from "./anthropometricReference/wfl_girls_0_2_zscores.json";
import wfh_girls_2_5 from "./anthropometricReference/wfh_girls_2_5_zscores.json";

const anthropometricReference = {
    wfa: {Male: wfa_boys, Female: wfa_girls},
    hfa: {Male: hfa_boys, Female: hfa_girls},
    wfh: {Male: {below2Years: wfh_boys_0_2, above2Years: wfh_boys_2_5},
    Female: {below2Years: wfh_girls_0_2, above2Years: wfh_girls_2_5}}
};

const roundedHeight = (num) =>{
    return Math.round(num*2)/2;
};

const getReference = (gender, ageInMonths, height) => {
    const wfhReference = ageInMonths < 24? _.get(anthropometricReference, ["wfh", gender]).below2Years: _.get(anthropometricReference, ["wfh", gender]).above2Years;
    return {
        wfa: _.find(_.get(anthropometricReference, ["wfa", gender]), (item) => item.x === ageInMonths),
        hfa: _.find(_.get(anthropometricReference, ["hfa", gender]), (item) => item.x === ageInMonths),
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