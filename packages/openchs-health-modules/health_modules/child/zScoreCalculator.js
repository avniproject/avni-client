import _ from "lodash";
import wfa_boys from "./anthropometry/wfa_boys";
import wfa_girls from "./anthropometry/wfa_girls";
import hfa_boys from "./anthropometry/lhfa_boys";
import hfa_girls from "./anthropometry/lhfa_girls";
import wfh_boys from "./anthropometry/wflh_boys";
import wfh_girls from "./anthropometry/wflh_girls";

const roundedHeight = (num) =>{
    return Math.round(num*2)/2;
};

const getWfaReference = (anthropometricReference, gender, ageInMonths) => {
    let wfaReference = _.get(anthropometricReference, ["wfa", gender]);
    return _.find(wfaReference, (item) => item.Month === ageInMonths);
}

const getWfhReference = (anthropometricReference, gender, height) => {
    let wfhReference = _.get(anthropometricReference, ["wfh", gender]);
    return _.find(wfhReference,(item) => item.x === roundedHeight(height));
}

const getHfaReference = (anthropometricReference, gender, ageInMonths) => {
    let heightForAgeReference = _.get(anthropometricReference, ["hfa", gender]);
    return _.find(heightForAgeReference, (item) => item.Month === ageInMonths);
}

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
    const anthropometricReference = {
        wfa: {Male: wfa_boys, Female: wfa_girls},
        hfa: {Male: hfa_boys, Female: hfa_girls},
        wfh: {Male: wfh_boys, Female: wfh_girls}
    };

    let wfaReference = getWfaReference(anthropometricReference, gender, ageInMonths);
    let hfaReference = getHfaReference(anthropometricReference, gender, ageInMonths);
    let wfhReference = getWfhReference(anthropometricReference, gender, height);
    
    return {
        wfa: calculate(weight, wfaReference),
        hfa: calculate(height, hfaReference),
        wfh: calculate(weight, wfhReference)
    }
};

const zScore = (individual, asOnDate, weight, height) => {
    let ageInMonths = individual.getAgeInMonths(asOnDate);
    let gender = _.get(individual, "gender.name");

    return calculateZScore(gender, ageInMonths, weight, height);
};

export default zScore;