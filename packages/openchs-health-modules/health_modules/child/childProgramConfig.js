import _ from "lodash";

import weightForAgeGirlsBelow13Weeks from './anthropometricReference/wfa_girls_p_0_13';
import weightForAgeGirlsBelow2Years from './anthropometricReference/wfa_girls_p_0_2';
import weightForAgeGirlsBelow5Years from './anthropometricReference/wfa_girls_p_2_5';
import weightForAgeBoysBelow13Weeks from './anthropometricReference/wfa_boys_p_0_13';
import weightForAgeBoysBelow2Years from './anthropometricReference/wfa_boys_p_0_2';
import weightForAgeBoysBelow5Years from './anthropometricReference/wfa_boys_p_2_5';


import weightForHeightGirlsBelow2Years from './anthropometricReference/wfh_girls_p_0_2';
import weightForHeightGirlsBelow5Years from './anthropometricReference/wfh_girls_p_2_5';
import weightForHeightBoysBelow2Years from './anthropometricReference/wfh_boys_p_0_2';
import weightForHeightBoysBelow5Years from './anthropometricReference/wfh_boys_p_2_5';

function obsFor(concept) {
    return function (encounter) {
        return encounter.getObservationValue(concept);
    }
}

function ageInMonths(encounter, individual) {
    return individual.getAgeInMonths(encounter.encounterDateTime);
}

function ageInWeeks(encounter, individual) {
    return individual.getAgeInWeeks(encounter.encounterDateTime);
}

const types = {
    WEIGHT_FOR_AGE: "weightForAge",
    HEIGHT_FOR_AGE: "heightForAge",
};

const ageGroups = {
    LESS_THAN_5_YEARS: "<5years",
    LESS_THAN_2_YEARS: "<2years",
    LESS_THAN_13_WEEKS: "<12weeks"
};

const configs = [
    {
        gender: "Female",
        age: ageGroups.LESS_THAN_5_YEARS,
        referenceKey: "Month",
        xAxis: ageInMonths,
        type: types.WEIGHT_FOR_AGE,
        file: weightForAgeGirlsBelow5Years,
        yAxis: obsFor("Weight")
    },
    {
        gender: "Female",
        age: ageGroups.LESS_THAN_2_YEARS,
        referenceKey: "Month",
        xAxis: ageInMonths,
        type: types.WEIGHT_FOR_AGE,
        file: weightForAgeGirlsBelow2Years,
        yAxis: obsFor("Weight")
    },
    {
        gender: "Female",
        age: ageGroups.LESS_THAN_13_WEEKS,
        referenceKey: "Week",
        xAxis: ageInWeeks,
        type: types.WEIGHT_FOR_AGE,
        file: weightForAgeGirlsBelow13Weeks,
        yAxis: obsFor("Weight")
    },
    {
        gender: "Male",
        age: ageGroups.LESS_THAN_5_YEARS,
        referenceKey: "Month",
        xAxis: ageInMonths,
        type: types.WEIGHT_FOR_AGE,
        file: weightForAgeBoysBelow5Years,
        yAxis: obsFor("Weight")
    },
    {
        gender: "Male",
        age: ageGroups.LESS_THAN_2_YEARS,
        referenceKey: "Month",
        xAxis: ageInMonths,
        type: types.WEIGHT_FOR_AGE,
        file: weightForAgeBoysBelow2Years,
        yAxis: obsFor("Weight")
    },
    {
        gender: "Male",
        age: ageGroups.LESS_THAN_13_WEEKS,
        referenceKey: "Week",
        xAxis: ageInWeeks,
        type: types.WEIGHT_FOR_AGE,
        file: weightForAgeBoysBelow13Weeks,
        yAxis: obsFor("Weight")
    },

    {
        gender: "Female",
        age: ageGroups.LESS_THAN_5_YEARS,
        referenceKey: "Month",
        xAxis: ageInMonths,
        type: types.HEIGHT_FOR_AGE,
        file: heightForAgeGirlsBelow5Years,
        yAxis: obsFor("Height")
    },
    {
        gender: "Female",
        age: ageGroups.LESS_THAN_2_YEARS,
        referenceKey: "Month",
        xAxis: ageInMonths,
        type: types.HEIGHT_FOR_AGE,
        file: heightForAgeGirlsBelow2Years,
        yAxis: obsFor("Height")
    },
    {
        gender: "Female",
        age: ageGroups.LESS_THAN_13_WEEKS,
        referenceKey: "Week",
        xAxis: ageInWeeks,
        type: types.HEIGHT_FOR_AGE,
        file: heightForAgeGirlsBelow13Weeks,
        yAxis: obsFor("Height")
    },
    {
        gender: "Male",
        age: ageGroups.LESS_THAN_5_YEARS,
        referenceKey: "Month",
        xAxis: ageInMonths,
        type: types.HEIGHT_FOR_AGE,
        file: heightForAgeBoysBelow5Years,
        yAxis: obsFor("Height")
    },
    {
        gender: "Male",
        age: ageGroups.LESS_THAN_2_YEARS,
        referenceKey: "Month",
        xAxis: ageInMonths,
        type: types.HEIGHT_FOR_AGE,
        file: heightForAgeBoysBelow2Years,
        yAxis: obsFor("Height")
    },
    {
        gender: "Male",
        age: ageGroups.LESS_THAN_13_WEEKS,
        referenceKey: "Week",
        xAxis: ageInWeeks,
        type: types.HEIGHT_FOR_AGE,
        file: heightForAgeBoysBelow13Weeks,
        yAxis: obsFor("Height")
    },

    {
        gender: "Female",
        age: ageGroups.LESS_THAN_5_YEARS,
        referenceKey: "Height",
        xAxis: obsFor("Weight"),
        type: types.WEIGHT_FOR_HEIGHT,
        file: weightForHeightGirlsBelow5Years,
        yAxis: obsFor("Height")
    },
    {
        gender: "Female",
        age: ageGroups.LESS_THAN_2_YEARS,
        referenceKey: "Length",
        xAxis: obsFor("Height"),
        type: types.WEIGHT_FOR_HEIGHT,
        file: weightForHeightGirlsBelow2Years,
        yAxis: obsFor("Weight")
    },
    {
        gender: "Male",
        age: ageGroups.LESS_THAN_5_YEARS,
        referenceKey: "Height",
        xAxis: obsFor("Height"),
        type: types.WEIGHT_FOR_HEIGHT,
        file: weightForHeightBoysBelow5Years,
        yAxis: obsFor("Weight")
    },
    {
        gender: "Male",
        age: ageGroups.LESS_THAN_2_YEARS,
        referenceKey: "Length",
        xAxis: obsFor("Height"),
        type: types.WEIGHT_FOR_HEIGHT,
        file: weightForHeightBoysBelow2Years,
        yAxis: obsFor("Weight")
    }
];

function createChart(individual, xAxis, yAxis) {
    return function (encounter) {
        const x = xAxis(encounter, individual),
            y = yAxis(encounter, individual);
        return x ? {x: x, y: y} : null;
    }
}

function createReferenceLines(config) {
    return _.unzip(_.map(config.file,
        function (item) {
            return _.map(['P10', 'P25', 'P50', 'P75', 'P90'],
                function (key) {
                    return {x: item[config.referenceKey], y: item[key]}
                })
        })
    );
}

function findConfig(type, gender, age) {
    return _.find(configs, function (config) {
        var genderOfChild = gender.name === 'Male'? 'Male': 'Female';
        return config.type === type && config.gender === genderOfChild && config.age === age
    });
}

function createChartFor(config, enrolment, minX, maxX) {
    return _.chain(enrolment.getEncounters(true))
        .values()
        .map(createChart(enrolment.individual, config.xAxis, config.yAxis))
        .compact()
        .sortBy('x')
        .filter(function (item) {
            return item.x >= minX && item.x <= maxX;
        })
        .value();
}

function createConfigWithData(type, age, enrolment) {
    var config = findConfig(type, enrolment.individual.gender, age),
        data = createReferenceLines(config),
        allX = _.chain(data)
            .flatten()
            .map('x')
            .sortBy()
            .value(),
        minX = _.first(allX),
        maxX = _.last(allX),
        obsData = createChartFor(config, enrolment, minX, maxX);
    data = createReferenceLines(config);
    data.push(obsData);
    return data;
}

const config = {
    programDashboardButtons: [{
        label: "Growth Chart",
        openOnClick: {
            type: "growthChart",
            data: {
                graphsBelow2Years: [
                    {
                        title: "Weight (kg) for Age (months)",
                        xAxisLabel: "Age (months)",
                        data: function (enrolment) {
                            return createConfigWithData(types.WEIGHT_FOR_AGE, ageGroups.LESS_THAN_2_YEARS, enrolment);
                        }
                    },
                    {
                        title: "Height (cm) for Age (months)",
                        xAxisLabel: "Age (months)",
                        data: function (enrolment) {
                            return createConfigWithData(types.HEIGHT_FOR_AGE, ageGroups.LESS_THAN_2_YEARS, enrolment);
                        }
                    },
                    {
                        title: "Weight (kg) for Height (cm)",
                        xAxisLabel: "Height (cm)",
                        data: function (enrolment) {
                            return createConfigWithData(types.WEIGHT_FOR_HEIGHT, ageGroups.LESS_THAN_2_YEARS, enrolment);
                        }
                    }
                ]
            }
        }
    }]
};

export default config;