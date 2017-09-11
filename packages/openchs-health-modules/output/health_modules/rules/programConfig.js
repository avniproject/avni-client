/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 19);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

/* WEBPACK VAR INJECTION */(function(__webpack_amd_options__) {/* globals __webpack_amd_options__ */
module.exports = __webpack_amd_options__;

/* WEBPACK VAR INJECTION */}.call(exports, {}))

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _ = __webpack_require__(20);

var heightForAgeGirlsBelow13Weeks = __webpack_require__(6);
var heightForAgeGirlsBelow2Years = __webpack_require__(7);
var heightForAgeGirlsBelow5Years = __webpack_require__(8);
var heightForAgeBoysBelow13Weeks = __webpack_require__(3);
var heightForAgeBoysBelow2Years = __webpack_require__(4);
var heightForAgeBoysBelow5Years = __webpack_require__(5);

var weightForAgeGirlsBelow13Weeks = __webpack_require__(12);
var weightForAgeGirlsBelow2Years = __webpack_require__(13);
var weightForAgeGirlsBelow5Years = __webpack_require__(14);
var weightForAgeBoysBelow13Weeks = __webpack_require__(9);
var weightForAgeBoysBelow2Years = __webpack_require__(10);
var weightForAgeBoysBelow5Years = __webpack_require__(11);

var weightForHeightGirlsBelow2Years = __webpack_require__(17);
var weightForHeightGirlsBelow5Years = __webpack_require__(18);
var weightForHeightBoysBelow2Years = __webpack_require__(15);
var weightForHeightBoysBelow5Years = __webpack_require__(16);

function obsFor(concept) {
    return function (encounter) {
        return encounter.getObservationValue(concept);
    };
}

function ageInMonths(encounter, individual) {
    return individual.getAgeInMonths(encounter.encounterDateTime);
}

function ageInWeeks(encounter, individual) {
    return individual.getAgeInWeeks(encounter.encounterDateTime);
}

var types = {
    WEIGHT_FOR_AGE: "weightForAge",
    HEIGHT_FOR_AGE: "heightForAge",
    WEIGHT_FOR_HEIGHT: "weightForHeight"
};

var ageGroups = {
    LESS_THAN_5_YEARS: "<5years",
    LESS_THAN_2_YEARS: "<2years",
    LESS_THAN_13_WEEKS: "<12weeks"
};

var configs = [{
    gender: "Female",
    age: ageGroups.LESS_THAN_5_YEARS,
    referenceKey: "Month",
    xAxis: ageInMonths,
    type: types.WEIGHT_FOR_AGE,
    file: weightForAgeGirlsBelow5Years,
    yAxis: obsFor("Weight")
}, {
    gender: "Female",
    age: ageGroups.LESS_THAN_2_YEARS,
    referenceKey: "Month",
    xAxis: ageInMonths,
    type: types.WEIGHT_FOR_AGE,
    file: weightForAgeGirlsBelow2Years,
    yAxis: obsFor("Weight")
}, {
    gender: "Female",
    age: ageGroups.LESS_THAN_13_WEEKS,
    referenceKey: "Week",
    xAxis: ageInWeeks,
    type: types.WEIGHT_FOR_AGE,
    file: weightForAgeGirlsBelow13Weeks,
    yAxis: obsFor("Weight")
}, {
    gender: "Male",
    age: ageGroups.LESS_THAN_5_YEARS,
    referenceKey: "Month",
    xAxis: ageInMonths,
    type: types.WEIGHT_FOR_AGE,
    file: weightForAgeBoysBelow5Years,
    yAxis: obsFor("Weight")
}, {
    gender: "Male",
    age: ageGroups.LESS_THAN_2_YEARS,
    referenceKey: "Month",
    xAxis: ageInMonths,
    type: types.WEIGHT_FOR_AGE,
    file: weightForAgeBoysBelow2Years,
    yAxis: obsFor("Weight")
}, {
    gender: "Male",
    age: ageGroups.LESS_THAN_13_WEEKS,
    referenceKey: "Week",
    xAxis: ageInWeeks,
    type: types.WEIGHT_FOR_AGE,
    file: weightForAgeBoysBelow13Weeks,
    yAxis: obsFor("Weight")
}, {
    gender: "Female",
    age: ageGroups.LESS_THAN_5_YEARS,
    referenceKey: "Month",
    xAxis: ageInMonths,
    type: types.HEIGHT_FOR_AGE,
    file: heightForAgeGirlsBelow5Years,
    yAxis: obsFor("Height")
}, {
    gender: "Female",
    age: ageGroups.LESS_THAN_2_YEARS,
    referenceKey: "Month",
    xAxis: ageInMonths,
    type: types.HEIGHT_FOR_AGE,
    file: heightForAgeGirlsBelow2Years,
    yAxis: obsFor("Height")
}, {
    gender: "Female",
    age: ageGroups.LESS_THAN_13_WEEKS,
    referenceKey: "Week",
    xAxis: ageInWeeks,
    type: types.HEIGHT_FOR_AGE,
    file: heightForAgeGirlsBelow13Weeks,
    yAxis: obsFor("Height")
}, {
    gender: "Male",
    age: ageGroups.LESS_THAN_5_YEARS,
    referenceKey: "Month",
    xAxis: ageInMonths,
    type: types.HEIGHT_FOR_AGE,
    file: heightForAgeBoysBelow5Years,
    yAxis: obsFor("Height")
}, {
    gender: "Male",
    age: ageGroups.LESS_THAN_2_YEARS,
    referenceKey: "Month",
    xAxis: ageInMonths,
    type: types.HEIGHT_FOR_AGE,
    file: heightForAgeBoysBelow2Years,
    yAxis: obsFor("Height")
}, {
    gender: "Male",
    age: ageGroups.LESS_THAN_13_WEEKS,
    referenceKey: "Week",
    xAxis: ageInWeeks,
    type: types.HEIGHT_FOR_AGE,
    file: heightForAgeBoysBelow13Weeks,
    yAxis: obsFor("Height")
}, {
    gender: "Female",
    age: ageGroups.LESS_THAN_5_YEARS,
    referenceKey: "Height",
    xAxis: obsFor("Weight"),
    type: types.WEIGHT_FOR_HEIGHT,
    file: weightForHeightGirlsBelow5Years,
    yAxis: obsFor("Height")
}, {
    gender: "Female",
    age: ageGroups.LESS_THAN_2_YEARS,
    referenceKey: "Length",
    xAxis: obsFor("Height"),
    type: types.WEIGHT_FOR_HEIGHT,
    file: weightForHeightGirlsBelow2Years,
    yAxis: obsFor("Weight")
}, {
    gender: "Male",
    age: ageGroups.LESS_THAN_5_YEARS,
    referenceKey: "Height",
    xAxis: obsFor("Height"),
    type: types.WEIGHT_FOR_HEIGHT,
    file: weightForHeightBoysBelow5Years,
    yAxis: obsFor("Weight")
}, {
    gender: "Male",
    age: ageGroups.LESS_THAN_2_YEARS,
    referenceKey: "Length",
    xAxis: obsFor("Height"),
    type: types.WEIGHT_FOR_HEIGHT,
    file: weightForHeightBoysBelow2Years,
    yAxis: obsFor("Weight")
}];

function createChart(individual, xAxis, yAxis) {
    return function (encounter) {
        var x = xAxis(encounter, individual),
            y = yAxis(encounter, individual);
        return x ? { x: x, y: y } : null;
    };
}

function createReferenceLines(config) {
    return _.unzip(_.map(config.file, function (item) {
        return _.map(['P10', 'P25', 'P50', 'P75', 'P90'], function (key) {
            return { x: item[config.referenceKey], y: item[key] };
        });
    }));
}

function findConfig(type, gender, age) {
    return _.find(configs, function (config) {
        var genderOfChild = gender.name === 'Male' ? 'Male' : 'Female';
        return config.type === type && config.gender === genderOfChild && config.age === age;
    });
}

function createChartFor(config, enrolment, minX, maxX) {
    return _.chain(enrolment.encounters).values().map(createChart(enrolment.individual, config.xAxis, config.yAxis)).compact().sortBy('x').filter(function (item) {
        return item.x >= minX && item.x <= maxX;
    }).value();
}

function createConfigWithData(type, age, enrolment) {
    var config = findConfig(type, enrolment.individual.gender, age),
        data = createReferenceLines(config),
        allX = _.chain(data).flatten().map('x').sortBy().value(),
        minX = _.first(allX),
        maxX = _.last(allX),
        obsData = createChartFor(config, enrolment, minX, maxX);
    data = createReferenceLines(config);
    data.push(obsData);
    return data;
}

var config = {
    programDashboardButtons: [{
        label: "Growth Chart",
        openOnClick: {
            type: "growthChart",
            data: {
                graphsBelow5Years: [{
                    title: "Weight (kg) for Age (months)",
                    xAxisLabel: "Age (months)",
                    data: function data(enrolment) {
                        return createConfigWithData(types.WEIGHT_FOR_AGE, ageGroups.LESS_THAN_5_YEARS, enrolment);
                    }
                }, {
                    title: "Height (cm) for Age (months)",
                    xAxisLabel: "Age (months)",
                    data: function data(enrolment) {
                        return createConfigWithData(types.HEIGHT_FOR_AGE, ageGroups.LESS_THAN_5_YEARS, enrolment);
                    }
                }, {
                    title: "Weight (kg) for Height (cm)",
                    xAxisLabel: "Height (cm)",
                    data: function data(enrolment) {
                        return createConfigWithData(types.WEIGHT_FOR_HEIGHT, ageGroups.LESS_THAN_5_YEARS, enrolment);
                    }
                }],
                graphsBelow2Years: [{
                    title: "Weight (kg) for Age (months)",
                    xAxisLabel: "Age (months)",
                    data: function data(enrolment) {
                        return createConfigWithData(types.WEIGHT_FOR_AGE, ageGroups.LESS_THAN_2_YEARS, enrolment);
                    }
                }, {
                    title: "Height (cm) for Age (months)",
                    xAxisLabel: "Age (months)",
                    data: function data(enrolment) {
                        return createConfigWithData(types.HEIGHT_FOR_AGE, ageGroups.LESS_THAN_2_YEARS, enrolment);
                    }
                }, {
                    title: "Weight (kg) for Height (cm)",
                    xAxisLabel: "Height (cm)",
                    data: function data(enrolment) {
                        return createConfigWithData(types.WEIGHT_FOR_HEIGHT, ageGroups.LESS_THAN_2_YEARS, enrolment);
                    }
                }],
                graphsBelow13Weeks: [{
                    title: "Weight (kg) for Age (weeks)",
                    xAxisLabel: "Age (weeks)",
                    data: function data(enrolment) {
                        return createConfigWithData(types.WEIGHT_FOR_AGE, ageGroups.LESS_THAN_13_WEEKS, enrolment);
                    }
                }, {
                    title: "Height (cm) for Age (weeks)",
                    xAxisLabel: "Age (weeks)",
                    data: function data(enrolment) {
                        return createConfigWithData(types.HEIGHT_FOR_AGE, ageGroups.LESS_THAN_13_WEEKS, enrolment);
                    }
                }, {
                    title: "Weight (kg) for Height (cm)",
                    xAxisLabel: "Height (cm)",
                    data: function data(enrolment) {
                        return createConfigWithData(types.WEIGHT_FOR_HEIGHT, ageGroups.LESS_THAN_2_YEARS, enrolment);
                    }
                }]
            }
        }
    }]
};

module.exports = config;

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


function ObservationRule(conceptName, _ref) {
    var _ref$allowedOccurrenc = _ref.allowedOccurrences,
        allowedOccurrences = _ref$allowedOccurrenc === undefined ? -1 : _ref$allowedOccurrenc,
        _ref$validFrom = _ref.validFrom,
        validFrom = _ref$validFrom === undefined ? 0 : _ref$validFrom,
        _ref$validTill = _ref.validTill,
        validTill = _ref$validTill === undefined ? Number.MAX_SAFE_INTEGER : _ref$validTill,
        _ref$validityBasedOn = _ref.validityBasedOn,
        validityBasedOn = _ref$validityBasedOn === undefined ? 'enrolmentDate' : _ref$validityBasedOn;

    this.conceptName = conceptName;
    this.allowedOccurrences = allowedOccurrences;
    this.validityBasedOn = validityBasedOn;
    this.validFrom = validFrom;
    this.validTill = validTill;
}

var observationRules = [];
addANCRule(new ObservationRule("Breast Examination - Nipple", { allowedOccurrences: 1, validTill: 13 }));
addANCRule(new ObservationRule("Fundal Height", { validFrom: 13 }));
addANCRule(new ObservationRule("Fundal height from pubic symphysis", {}));
addANCRule(new ObservationRule("Fetal movements", { validFrom: 21 }));
addANCRule(new ObservationRule("Foetal presentation", { validFrom: 29 }));
addANCRule(new ObservationRule("Fetal Heart Sound", { validFrom: 29 }));
addANCRule(new ObservationRule("Hb", { allowedOccurrences: 1 }));
addANCRule(new ObservationRule("Blood Sugar", { allowedOccurrences: 1 }));
addANCRule(new ObservationRule("VDRL", { allowedOccurrences: 1 }));
addANCRule(new ObservationRule("HIV/AIDS", { allowedOccurrences: 1 }));
addANCRule(new ObservationRule("HbsAg", { allowedOccurrences: 1 }));
addANCRule(new ObservationRule("Bile Salts", { allowedOccurrences: 1 }));
addANCRule(new ObservationRule("Bile Pigments", { allowedOccurrences: 1 }));
addANCRule(new ObservationRule("Sickling Test", { allowedOccurrences: 1 }));
addANCRule(new ObservationRule("Hb Electrophoresis", { allowedOccurrences: 1 }));

function addANCRule(observationRule) {
    observationRule.validityBasedOn = "Last Menstrual Period";
    observationRules.push(observationRule);
}

module.exports = observationRules;

/***/ }),
/* 3 */
/***/ (function(module, exports) {

module.exports = [
	{
		"Week": 0,
		"L": 1,
		"M": 49.8842,
		"S": 0.03795,
		"SD": 1.8931,
		"P01": 44,
		"P1": 45.5,
		"P3": 46.3,
		"P5": 46.8,
		"P10": 47.5,
		"P15": 47.9,
		"P25": 48.6,
		"P50": 49.9,
		"P75": 51.2,
		"P85": 51.8,
		"P90": 52.3,
		"P95": 53,
		"P97": 53.4,
		"P99": 54.3,
		"P999": 55.7
	},
	{
		"Week": 1,
		"L": 1,
		"M": 51.1152,
		"S": 0.03723,
		"SD": 1.903,
		"P01": 45.2,
		"P1": 46.7,
		"P3": 47.5,
		"P5": 48,
		"P10": 48.7,
		"P15": 49.1,
		"P25": 49.8,
		"P50": 51.1,
		"P75": 52.4,
		"P85": 53.1,
		"P90": 53.6,
		"P95": 54.2,
		"P97": 54.7,
		"P99": 55.5,
		"P999": 57
	},
	{
		"Week": 2,
		"L": 1,
		"M": 52.3461,
		"S": 0.03652,
		"SD": 1.9117,
		"P01": 46.4,
		"P1": 47.9,
		"P3": 48.8,
		"P5": 49.2,
		"P10": 49.9,
		"P15": 50.4,
		"P25": 51.1,
		"P50": 52.3,
		"P75": 53.6,
		"P85": 54.3,
		"P90": 54.8,
		"P95": 55.5,
		"P97": 55.9,
		"P99": 56.8,
		"P999": 58.3
	},
	{
		"Week": 3,
		"L": 1,
		"M": 53.3905,
		"S": 0.03609,
		"SD": 1.9269,
		"P01": 47.4,
		"P1": 48.9,
		"P3": 49.8,
		"P5": 50.2,
		"P10": 50.9,
		"P15": 51.4,
		"P25": 52.1,
		"P50": 53.4,
		"P75": 54.7,
		"P85": 55.4,
		"P90": 55.9,
		"P95": 56.6,
		"P97": 57,
		"P99": 57.9,
		"P999": 59.3
	},
	{
		"Week": 4,
		"L": 1,
		"M": 54.3881,
		"S": 0.0357,
		"SD": 1.9417,
		"P01": 48.4,
		"P1": 49.9,
		"P3": 50.7,
		"P5": 51.2,
		"P10": 51.9,
		"P15": 52.4,
		"P25": 53.1,
		"P50": 54.4,
		"P75": 55.7,
		"P85": 56.4,
		"P90": 56.9,
		"P95": 57.6,
		"P97": 58,
		"P99": 58.9,
		"P999": 60.4
	},
	{
		"Week": 5,
		"L": 1,
		"M": 55.3374,
		"S": 0.03534,
		"SD": 1.9556,
		"P01": 49.3,
		"P1": 50.8,
		"P3": 51.7,
		"P5": 52.1,
		"P10": 52.8,
		"P15": 53.3,
		"P25": 54,
		"P50": 55.3,
		"P75": 56.7,
		"P85": 57.4,
		"P90": 57.8,
		"P95": 58.6,
		"P97": 59,
		"P99": 59.9,
		"P999": 61.4
	},
	{
		"Week": 6,
		"L": 1,
		"M": 56.2357,
		"S": 0.03501,
		"SD": 1.9688,
		"P01": 50.2,
		"P1": 51.7,
		"P3": 52.5,
		"P5": 53,
		"P10": 53.7,
		"P15": 54.2,
		"P25": 54.9,
		"P50": 56.2,
		"P75": 57.6,
		"P85": 58.3,
		"P90": 58.8,
		"P95": 59.5,
		"P97": 59.9,
		"P99": 60.8,
		"P999": 62.3
	},
	{
		"Week": 7,
		"L": 1,
		"M": 57.0851,
		"S": 0.0347,
		"SD": 1.9809,
		"P01": 51,
		"P1": 52.5,
		"P3": 53.4,
		"P5": 53.8,
		"P10": 54.5,
		"P15": 55,
		"P25": 55.7,
		"P50": 57.1,
		"P75": 58.4,
		"P85": 59.1,
		"P90": 59.6,
		"P95": 60.3,
		"P97": 60.8,
		"P99": 61.7,
		"P999": 63.2
	},
	{
		"Week": 8,
		"L": 1,
		"M": 57.8889,
		"S": 0.03442,
		"SD": 1.9925,
		"P01": 51.7,
		"P1": 53.3,
		"P3": 54.1,
		"P5": 54.6,
		"P10": 55.3,
		"P15": 55.8,
		"P25": 56.5,
		"P50": 57.9,
		"P75": 59.2,
		"P85": 60,
		"P90": 60.4,
		"P95": 61.2,
		"P97": 61.6,
		"P99": 62.5,
		"P999": 64
	},
	{
		"Week": 9,
		"L": 1,
		"M": 58.6536,
		"S": 0.03416,
		"SD": 2.0036,
		"P01": 52.5,
		"P1": 54,
		"P3": 54.9,
		"P5": 55.4,
		"P10": 56.1,
		"P15": 56.6,
		"P25": 57.3,
		"P50": 58.7,
		"P75": 60,
		"P85": 60.7,
		"P90": 61.2,
		"P95": 61.9,
		"P97": 62.4,
		"P99": 63.3,
		"P999": 64.8
	},
	{
		"Week": 10,
		"L": 1,
		"M": 59.3872,
		"S": 0.03392,
		"SD": 2.0144,
		"P01": 53.2,
		"P1": 54.7,
		"P3": 55.6,
		"P5": 56.1,
		"P10": 56.8,
		"P15": 57.3,
		"P25": 58,
		"P50": 59.4,
		"P75": 60.7,
		"P85": 61.5,
		"P90": 62,
		"P95": 62.7,
		"P97": 63.2,
		"P99": 64.1,
		"P999": 65.6
	},
	{
		"Week": 11,
		"L": 1,
		"M": 60.0894,
		"S": 0.03369,
		"SD": 2.0244,
		"P01": 53.8,
		"P1": 55.4,
		"P3": 56.3,
		"P5": 56.8,
		"P10": 57.5,
		"P15": 58,
		"P25": 58.7,
		"P50": 60.1,
		"P75": 61.5,
		"P85": 62.2,
		"P90": 62.7,
		"P95": 63.4,
		"P97": 63.9,
		"P99": 64.8,
		"P999": 66.3
	},
	{
		"Week": 12,
		"L": 1,
		"M": 60.7605,
		"S": 0.03348,
		"SD": 2.0343,
		"P01": 54.5,
		"P1": 56,
		"P3": 56.9,
		"P5": 57.4,
		"P10": 58.2,
		"P15": 58.7,
		"P25": 59.4,
		"P50": 60.8,
		"P75": 62.1,
		"P85": 62.9,
		"P90": 63.4,
		"P95": 64.1,
		"P97": 64.6,
		"P99": 65.5,
		"P999": 67
	},
	{
		"Week": 13,
		"L": 1,
		"M": 61.4013,
		"S": 0.03329,
		"SD": 2.044,
		"P01": 55.1,
		"P1": 56.6,
		"P3": 57.6,
		"P5": 58,
		"P10": 58.8,
		"P15": 59.3,
		"P25": 60,
		"P50": 61.4,
		"P75": 62.8,
		"P85": 63.5,
		"P90": 64,
		"P95": 64.8,
		"P97": 65.2,
		"P99": 66.2,
		"P999": 67.7
	}
];

/***/ }),
/* 4 */
/***/ (function(module, exports) {

module.exports = [
	{
		"Month": 0,
		"L": 1,
		"M": 49.8842,
		"S": 0.03795,
		"SD": 1.8931,
		"P01": 44,
		"P1": 45.5,
		"P3": 46.3,
		"P5": 46.8,
		"P10": 47.5,
		"P15": 47.9,
		"P25": 48.6,
		"P50": 49.9,
		"P75": 51.2,
		"P85": 51.8,
		"P90": 52.3,
		"P95": 53,
		"P97": 53.4,
		"P99": 54.3,
		"P999": 55.7
	},
	{
		"Month": 1,
		"L": 1,
		"M": 54.7244,
		"S": 0.03557,
		"SD": 1.9465,
		"P01": 48.7,
		"P1": 50.2,
		"P3": 51.1,
		"P5": 51.5,
		"P10": 52.2,
		"P15": 52.7,
		"P25": 53.4,
		"P50": 54.7,
		"P75": 56,
		"P85": 56.7,
		"P90": 57.2,
		"P95": 57.9,
		"P97": 58.4,
		"P99": 59.3,
		"P999": 60.7
	},
	{
		"Month": 2,
		"L": 1,
		"M": 58.4249,
		"S": 0.03424,
		"SD": 2.0005,
		"P01": 52.2,
		"P1": 53.8,
		"P3": 54.7,
		"P5": 55.1,
		"P10": 55.9,
		"P15": 56.4,
		"P25": 57.1,
		"P50": 58.4,
		"P75": 59.8,
		"P85": 60.5,
		"P90": 61,
		"P95": 61.7,
		"P97": 62.2,
		"P99": 63.1,
		"P999": 64.6
	},
	{
		"Month": 3,
		"L": 1,
		"M": 61.4292,
		"S": 0.03328,
		"SD": 2.0444,
		"P01": 55.1,
		"P1": 56.7,
		"P3": 57.6,
		"P5": 58.1,
		"P10": 58.8,
		"P15": 59.3,
		"P25": 60.1,
		"P50": 61.4,
		"P75": 62.8,
		"P85": 63.5,
		"P90": 64,
		"P95": 64.8,
		"P97": 65.3,
		"P99": 66.2,
		"P999": 67.7
	},
	{
		"Month": 4,
		"L": 1,
		"M": 63.886,
		"S": 0.03257,
		"SD": 2.0808,
		"P01": 57.5,
		"P1": 59,
		"P3": 60,
		"P5": 60.5,
		"P10": 61.2,
		"P15": 61.7,
		"P25": 62.5,
		"P50": 63.9,
		"P75": 65.3,
		"P85": 66,
		"P90": 66.6,
		"P95": 67.3,
		"P97": 67.8,
		"P99": 68.7,
		"P999": 70.3
	},
	{
		"Month": 5,
		"L": 1,
		"M": 65.9026,
		"S": 0.03204,
		"SD": 2.1115,
		"P01": 59.4,
		"P1": 61,
		"P3": 61.9,
		"P5": 62.4,
		"P10": 63.2,
		"P15": 63.7,
		"P25": 64.5,
		"P50": 65.9,
		"P75": 67.3,
		"P85": 68.1,
		"P90": 68.6,
		"P95": 69.4,
		"P97": 69.9,
		"P99": 70.8,
		"P999": 72.4
	},
	{
		"Month": 6,
		"L": 1,
		"M": 67.6236,
		"S": 0.03165,
		"SD": 2.1403,
		"P01": 61,
		"P1": 62.6,
		"P3": 63.6,
		"P5": 64.1,
		"P10": 64.9,
		"P15": 65.4,
		"P25": 66.2,
		"P50": 67.6,
		"P75": 69.1,
		"P85": 69.8,
		"P90": 70.4,
		"P95": 71.1,
		"P97": 71.6,
		"P99": 72.6,
		"P999": 74.2
	},
	{
		"Month": 7,
		"L": 1,
		"M": 69.1645,
		"S": 0.03139,
		"SD": 2.1711,
		"P01": 62.5,
		"P1": 64.1,
		"P3": 65.1,
		"P5": 65.6,
		"P10": 66.4,
		"P15": 66.9,
		"P25": 67.7,
		"P50": 69.2,
		"P75": 70.6,
		"P85": 71.4,
		"P90": 71.9,
		"P95": 72.7,
		"P97": 73.2,
		"P99": 74.2,
		"P999": 75.9
	},
	{
		"Month": 8,
		"L": 1,
		"M": 70.5994,
		"S": 0.03124,
		"SD": 2.2055,
		"P01": 63.8,
		"P1": 65.5,
		"P3": 66.5,
		"P5": 67,
		"P10": 67.8,
		"P15": 68.3,
		"P25": 69.1,
		"P50": 70.6,
		"P75": 72.1,
		"P85": 72.9,
		"P90": 73.4,
		"P95": 74.2,
		"P97": 74.7,
		"P99": 75.7,
		"P999": 77.4
	},
	{
		"Month": 9,
		"L": 1,
		"M": 71.9687,
		"S": 0.03117,
		"SD": 2.2433,
		"P01": 65,
		"P1": 66.8,
		"P3": 67.7,
		"P5": 68.3,
		"P10": 69.1,
		"P15": 69.6,
		"P25": 70.5,
		"P50": 72,
		"P75": 73.5,
		"P85": 74.3,
		"P90": 74.8,
		"P95": 75.7,
		"P97": 76.2,
		"P99": 77.2,
		"P999": 78.9
	},
	{
		"Month": 10,
		"L": 1,
		"M": 73.2812,
		"S": 0.03118,
		"SD": 2.2849,
		"P01": 66.2,
		"P1": 68,
		"P3": 69,
		"P5": 69.5,
		"P10": 70.4,
		"P15": 70.9,
		"P25": 71.7,
		"P50": 73.3,
		"P75": 74.8,
		"P85": 75.6,
		"P90": 76.2,
		"P95": 77,
		"P97": 77.6,
		"P99": 78.6,
		"P999": 80.3
	},
	{
		"Month": 11,
		"L": 1,
		"M": 74.5388,
		"S": 0.03125,
		"SD": 2.3293,
		"P01": 67.3,
		"P1": 69.1,
		"P3": 70.2,
		"P5": 70.7,
		"P10": 71.6,
		"P15": 72.1,
		"P25": 73,
		"P50": 74.5,
		"P75": 76.1,
		"P85": 77,
		"P90": 77.5,
		"P95": 78.4,
		"P97": 78.9,
		"P99": 80,
		"P999": 81.7
	},
	{
		"Month": 12,
		"L": 1,
		"M": 75.7488,
		"S": 0.03137,
		"SD": 2.3762,
		"P01": 68.4,
		"P1": 70.2,
		"P3": 71.3,
		"P5": 71.8,
		"P10": 72.7,
		"P15": 73.3,
		"P25": 74.1,
		"P50": 75.7,
		"P75": 77.4,
		"P85": 78.2,
		"P90": 78.8,
		"P95": 79.7,
		"P97": 80.2,
		"P99": 81.3,
		"P999": 83.1
	},
	{
		"Month": 13,
		"L": 1,
		"M": 76.9186,
		"S": 0.03154,
		"SD": 2.426,
		"P01": 69.4,
		"P1": 71.3,
		"P3": 72.4,
		"P5": 72.9,
		"P10": 73.8,
		"P15": 74.4,
		"P25": 75.3,
		"P50": 76.9,
		"P75": 78.6,
		"P85": 79.4,
		"P90": 80,
		"P95": 80.9,
		"P97": 81.5,
		"P99": 82.6,
		"P999": 84.4
	},
	{
		"Month": 14,
		"L": 1,
		"M": 78.0497,
		"S": 0.03174,
		"SD": 2.4773,
		"P01": 70.4,
		"P1": 72.3,
		"P3": 73.4,
		"P5": 74,
		"P10": 74.9,
		"P15": 75.5,
		"P25": 76.4,
		"P50": 78,
		"P75": 79.7,
		"P85": 80.6,
		"P90": 81.2,
		"P95": 82.1,
		"P97": 82.7,
		"P99": 83.8,
		"P999": 85.7
	},
	{
		"Month": 15,
		"L": 1,
		"M": 79.1458,
		"S": 0.03197,
		"SD": 2.5303,
		"P01": 71.3,
		"P1": 73.3,
		"P3": 74.4,
		"P5": 75,
		"P10": 75.9,
		"P15": 76.5,
		"P25": 77.4,
		"P50": 79.1,
		"P75": 80.9,
		"P85": 81.8,
		"P90": 82.4,
		"P95": 83.3,
		"P97": 83.9,
		"P99": 85,
		"P999": 87
	},
	{
		"Month": 16,
		"L": 1,
		"M": 80.2113,
		"S": 0.03222,
		"SD": 2.5844,
		"P01": 72.2,
		"P1": 74.2,
		"P3": 75.4,
		"P5": 76,
		"P10": 76.9,
		"P15": 77.5,
		"P25": 78.5,
		"P50": 80.2,
		"P75": 82,
		"P85": 82.9,
		"P90": 83.5,
		"P95": 84.5,
		"P97": 85.1,
		"P99": 86.2,
		"P999": 88.2
	},
	{
		"Month": 17,
		"L": 1,
		"M": 81.2487,
		"S": 0.0325,
		"SD": 2.6406,
		"P01": 73.1,
		"P1": 75.1,
		"P3": 76.3,
		"P5": 76.9,
		"P10": 77.9,
		"P15": 78.5,
		"P25": 79.5,
		"P50": 81.2,
		"P75": 83,
		"P85": 84,
		"P90": 84.6,
		"P95": 85.6,
		"P97": 86.2,
		"P99": 87.4,
		"P999": 89.4
	},
	{
		"Month": 18,
		"L": 1,
		"M": 82.2587,
		"S": 0.03279,
		"SD": 2.6973,
		"P01": 73.9,
		"P1": 76,
		"P3": 77.2,
		"P5": 77.8,
		"P10": 78.8,
		"P15": 79.5,
		"P25": 80.4,
		"P50": 82.3,
		"P75": 84.1,
		"P85": 85.1,
		"P90": 85.7,
		"P95": 86.7,
		"P97": 87.3,
		"P99": 88.5,
		"P999": 90.6
	},
	{
		"Month": 19,
		"L": 1,
		"M": 83.2418,
		"S": 0.0331,
		"SD": 2.7553,
		"P01": 74.7,
		"P1": 76.8,
		"P3": 78.1,
		"P5": 78.7,
		"P10": 79.7,
		"P15": 80.4,
		"P25": 81.4,
		"P50": 83.2,
		"P75": 85.1,
		"P85": 86.1,
		"P90": 86.8,
		"P95": 87.8,
		"P97": 88.4,
		"P99": 89.7,
		"P999": 91.8
	},
	{
		"Month": 20,
		"L": 1,
		"M": 84.1996,
		"S": 0.03342,
		"SD": 2.814,
		"P01": 75.5,
		"P1": 77.7,
		"P3": 78.9,
		"P5": 79.6,
		"P10": 80.6,
		"P15": 81.3,
		"P25": 82.3,
		"P50": 84.2,
		"P75": 86.1,
		"P85": 87.1,
		"P90": 87.8,
		"P95": 88.8,
		"P97": 89.5,
		"P99": 90.7,
		"P999": 92.9
	},
	{
		"Month": 21,
		"L": 1,
		"M": 85.1348,
		"S": 0.03376,
		"SD": 2.8742,
		"P01": 76.3,
		"P1": 78.4,
		"P3": 79.7,
		"P5": 80.4,
		"P10": 81.5,
		"P15": 82.2,
		"P25": 83.2,
		"P50": 85.1,
		"P75": 87.1,
		"P85": 88.1,
		"P90": 88.8,
		"P95": 89.9,
		"P97": 90.5,
		"P99": 91.8,
		"P999": 94
	},
	{
		"Month": 22,
		"L": 1,
		"M": 86.0477,
		"S": 0.0341,
		"SD": 2.9342,
		"P01": 77,
		"P1": 79.2,
		"P3": 80.5,
		"P5": 81.2,
		"P10": 82.3,
		"P15": 83,
		"P25": 84.1,
		"P50": 86,
		"P75": 88,
		"P85": 89.1,
		"P90": 89.8,
		"P95": 90.9,
		"P97": 91.6,
		"P99": 92.9,
		"P999": 95.1
	},
	{
		"Month": 23,
		"L": 1,
		"M": 86.941,
		"S": 0.03445,
		"SD": 2.9951,
		"P01": 77.7,
		"P1": 80,
		"P3": 81.3,
		"P5": 82,
		"P10": 83.1,
		"P15": 83.8,
		"P25": 84.9,
		"P50": 86.9,
		"P75": 89,
		"P85": 90,
		"P90": 90.8,
		"P95": 91.9,
		"P97": 92.6,
		"P99": 93.9,
		"P999": 96.2
	},
	{
		"Month": 24,
		"L": 1,
		"M": 87.8161,
		"S": 0.03479,
		"SD": 3.0551,
		"P01": 78.4,
		"P1": 80.7,
		"P3": 82.1,
		"P5": 82.8,
		"P10": 83.9,
		"P15": 84.6,
		"P25": 85.8,
		"P50": 87.8,
		"P75": 89.9,
		"P85": 91,
		"P90": 91.7,
		"P95": 92.8,
		"P97": 93.6,
		"P99": 94.9,
		"P999": 97.3
	}
];

/***/ }),
/* 5 */
/***/ (function(module, exports) {

module.exports = [
	{
		"Month": 24,
		"L": 1,
		"M": 87.1161,
		"S": 0.03507,
		"SD": 3.0551,
		"P01": 77.7,
		"P1": 80,
		"P3": 81.4,
		"P5": 82.1,
		"P10": 83.2,
		"P15": 83.9,
		"P25": 85.1,
		"P50": 87.1,
		"P75": 89.2,
		"P85": 90.3,
		"P90": 91,
		"P95": 92.1,
		"P97": 92.9,
		"P99": 94.2,
		"P999": 96.6
	},
	{
		"Month": 25,
		"L": 1,
		"M": 87.972,
		"S": 0.03542,
		"SD": 3.116,
		"P01": 78.3,
		"P1": 80.7,
		"P3": 82.1,
		"P5": 82.8,
		"P10": 84,
		"P15": 84.7,
		"P25": 85.9,
		"P50": 88,
		"P75": 90.1,
		"P85": 91.2,
		"P90": 92,
		"P95": 93.1,
		"P97": 93.8,
		"P99": 95.2,
		"P999": 97.6
	},
	{
		"Month": 26,
		"L": 1,
		"M": 88.8065,
		"S": 0.03576,
		"SD": 3.1757,
		"P01": 79,
		"P1": 81.4,
		"P3": 82.8,
		"P5": 83.6,
		"P10": 84.7,
		"P15": 85.5,
		"P25": 86.7,
		"P50": 88.8,
		"P75": 90.9,
		"P85": 92.1,
		"P90": 92.9,
		"P95": 94,
		"P97": 94.8,
		"P99": 96.2,
		"P999": 98.6
	},
	{
		"Month": 27,
		"L": 1,
		"M": 89.6197,
		"S": 0.0361,
		"SD": 3.2353,
		"P01": 79.6,
		"P1": 82.1,
		"P3": 83.5,
		"P5": 84.3,
		"P10": 85.5,
		"P15": 86.3,
		"P25": 87.4,
		"P50": 89.6,
		"P75": 91.8,
		"P85": 93,
		"P90": 93.8,
		"P95": 94.9,
		"P97": 95.7,
		"P99": 97.1,
		"P999": 99.6
	},
	{
		"Month": 28,
		"L": 1,
		"M": 90.412,
		"S": 0.03642,
		"SD": 3.2928,
		"P01": 80.2,
		"P1": 82.8,
		"P3": 84.2,
		"P5": 85,
		"P10": 86.2,
		"P15": 87,
		"P25": 88.2,
		"P50": 90.4,
		"P75": 92.6,
		"P85": 93.8,
		"P90": 94.6,
		"P95": 95.8,
		"P97": 96.6,
		"P99": 98.1,
		"P999": 100.6
	},
	{
		"Month": 29,
		"L": 1,
		"M": 91.1828,
		"S": 0.03674,
		"SD": 3.3501,
		"P01": 80.8,
		"P1": 83.4,
		"P3": 84.9,
		"P5": 85.7,
		"P10": 86.9,
		"P15": 87.7,
		"P25": 88.9,
		"P50": 91.2,
		"P75": 93.4,
		"P85": 94.7,
		"P90": 95.5,
		"P95": 96.7,
		"P97": 97.5,
		"P99": 99,
		"P999": 101.5
	},
	{
		"Month": 30,
		"L": 1,
		"M": 91.9327,
		"S": 0.03704,
		"SD": 3.4052,
		"P01": 81.4,
		"P1": 84,
		"P3": 85.5,
		"P5": 86.3,
		"P10": 87.6,
		"P15": 88.4,
		"P25": 89.6,
		"P50": 91.9,
		"P75": 94.2,
		"P85": 95.5,
		"P90": 96.3,
		"P95": 97.5,
		"P97": 98.3,
		"P99": 99.9,
		"P999": 102.5
	},
	{
		"Month": 31,
		"L": 1,
		"M": 92.6631,
		"S": 0.03733,
		"SD": 3.4591,
		"P01": 82,
		"P1": 84.6,
		"P3": 86.2,
		"P5": 87,
		"P10": 88.2,
		"P15": 89.1,
		"P25": 90.3,
		"P50": 92.7,
		"P75": 95,
		"P85": 96.2,
		"P90": 97.1,
		"P95": 98.4,
		"P97": 99.2,
		"P99": 100.7,
		"P999": 103.4
	},
	{
		"Month": 32,
		"L": 1,
		"M": 93.3753,
		"S": 0.03761,
		"SD": 3.5118,
		"P01": 82.5,
		"P1": 85.2,
		"P3": 86.8,
		"P5": 87.6,
		"P10": 88.9,
		"P15": 89.7,
		"P25": 91,
		"P50": 93.4,
		"P75": 95.7,
		"P85": 97,
		"P90": 97.9,
		"P95": 99.2,
		"P97": 100,
		"P99": 101.5,
		"P999": 104.2
	},
	{
		"Month": 33,
		"L": 1,
		"M": 94.0711,
		"S": 0.03787,
		"SD": 3.5625,
		"P01": 83.1,
		"P1": 85.8,
		"P3": 87.4,
		"P5": 88.2,
		"P10": 89.5,
		"P15": 90.4,
		"P25": 91.7,
		"P50": 94.1,
		"P75": 96.5,
		"P85": 97.8,
		"P90": 98.6,
		"P95": 99.9,
		"P97": 100.8,
		"P99": 102.4,
		"P999": 105.1
	},
	{
		"Month": 34,
		"L": 1,
		"M": 94.7532,
		"S": 0.03812,
		"SD": 3.612,
		"P01": 83.6,
		"P1": 86.4,
		"P3": 88,
		"P5": 88.8,
		"P10": 90.1,
		"P15": 91,
		"P25": 92.3,
		"P50": 94.8,
		"P75": 97.2,
		"P85": 98.5,
		"P90": 99.4,
		"P95": 100.7,
		"P97": 101.5,
		"P99": 103.2,
		"P999": 105.9
	},
	{
		"Month": 35,
		"L": 1,
		"M": 95.4236,
		"S": 0.03836,
		"SD": 3.6604,
		"P01": 84.1,
		"P1": 86.9,
		"P3": 88.5,
		"P5": 89.4,
		"P10": 90.7,
		"P15": 91.6,
		"P25": 93,
		"P50": 95.4,
		"P75": 97.9,
		"P85": 99.2,
		"P90": 100.1,
		"P95": 101.4,
		"P97": 102.3,
		"P99": 103.9,
		"P999": 106.7
	},
	{
		"Month": 36,
		"L": 1,
		"M": 96.0835,
		"S": 0.03858,
		"SD": 3.7069,
		"P01": 84.6,
		"P1": 87.5,
		"P3": 89.1,
		"P5": 90,
		"P10": 91.3,
		"P15": 92.2,
		"P25": 93.6,
		"P50": 96.1,
		"P75": 98.6,
		"P85": 99.9,
		"P90": 100.8,
		"P95": 102.2,
		"P97": 103.1,
		"P99": 104.7,
		"P999": 107.5
	},
	{
		"Month": 37,
		"L": 1,
		"M": 96.7337,
		"S": 0.03879,
		"SD": 3.7523,
		"P01": 85.1,
		"P1": 88,
		"P3": 89.7,
		"P5": 90.6,
		"P10": 91.9,
		"P15": 92.8,
		"P25": 94.2,
		"P50": 96.7,
		"P75": 99.3,
		"P85": 100.6,
		"P90": 101.5,
		"P95": 102.9,
		"P97": 103.8,
		"P99": 105.5,
		"P999": 108.3
	},
	{
		"Month": 38,
		"L": 1,
		"M": 97.3749,
		"S": 0.039,
		"SD": 3.7976,
		"P01": 85.6,
		"P1": 88.5,
		"P3": 90.2,
		"P5": 91.1,
		"P10": 92.5,
		"P15": 93.4,
		"P25": 94.8,
		"P50": 97.4,
		"P75": 99.9,
		"P85": 101.3,
		"P90": 102.2,
		"P95": 103.6,
		"P97": 104.5,
		"P99": 106.2,
		"P999": 109.1
	},
	{
		"Month": 39,
		"L": 1,
		"M": 98.0073,
		"S": 0.03919,
		"SD": 3.8409,
		"P01": 86.1,
		"P1": 89.1,
		"P3": 90.8,
		"P5": 91.7,
		"P10": 93.1,
		"P15": 94,
		"P25": 95.4,
		"P50": 98,
		"P75": 100.6,
		"P85": 102,
		"P90": 102.9,
		"P95": 104.3,
		"P97": 105.2,
		"P99": 106.9,
		"P999": 109.9
	},
	{
		"Month": 40,
		"L": 1,
		"M": 98.631,
		"S": 0.03937,
		"SD": 3.8831,
		"P01": 86.6,
		"P1": 89.6,
		"P3": 91.3,
		"P5": 92.2,
		"P10": 93.7,
		"P15": 94.6,
		"P25": 96,
		"P50": 98.6,
		"P75": 101.3,
		"P85": 102.7,
		"P90": 103.6,
		"P95": 105,
		"P97": 105.9,
		"P99": 107.7,
		"P999": 110.6
	},
	{
		"Month": 41,
		"L": 1,
		"M": 99.2459,
		"S": 0.03954,
		"SD": 3.9242,
		"P01": 87.1,
		"P1": 90.1,
		"P3": 91.9,
		"P5": 92.8,
		"P10": 94.2,
		"P15": 95.2,
		"P25": 96.6,
		"P50": 99.2,
		"P75": 101.9,
		"P85": 103.3,
		"P90": 104.3,
		"P95": 105.7,
		"P97": 106.6,
		"P99": 108.4,
		"P999": 111.4
	},
	{
		"Month": 42,
		"L": 1,
		"M": 99.8515,
		"S": 0.03971,
		"SD": 3.9651,
		"P01": 87.6,
		"P1": 90.6,
		"P3": 92.4,
		"P5": 93.3,
		"P10": 94.8,
		"P15": 95.7,
		"P25": 97.2,
		"P50": 99.9,
		"P75": 102.5,
		"P85": 104,
		"P90": 104.9,
		"P95": 106.4,
		"P97": 107.3,
		"P99": 109.1,
		"P999": 112.1
	},
	{
		"Month": 43,
		"L": 1,
		"M": 100.4485,
		"S": 0.03986,
		"SD": 4.0039,
		"P01": 88.1,
		"P1": 91.1,
		"P3": 92.9,
		"P5": 93.9,
		"P10": 95.3,
		"P15": 96.3,
		"P25": 97.7,
		"P50": 100.4,
		"P75": 103.1,
		"P85": 104.6,
		"P90": 105.6,
		"P95": 107,
		"P97": 108,
		"P99": 109.8,
		"P999": 112.8
	},
	{
		"Month": 44,
		"L": 1,
		"M": 101.0374,
		"S": 0.04002,
		"SD": 4.0435,
		"P01": 88.5,
		"P1": 91.6,
		"P3": 93.4,
		"P5": 94.4,
		"P10": 95.9,
		"P15": 96.8,
		"P25": 98.3,
		"P50": 101,
		"P75": 103.8,
		"P85": 105.2,
		"P90": 106.2,
		"P95": 107.7,
		"P97": 108.6,
		"P99": 110.4,
		"P999": 113.5
	},
	{
		"Month": 45,
		"L": 1,
		"M": 101.6186,
		"S": 0.04016,
		"SD": 4.081,
		"P01": 89,
		"P1": 92.1,
		"P3": 93.9,
		"P5": 94.9,
		"P10": 96.4,
		"P15": 97.4,
		"P25": 98.9,
		"P50": 101.6,
		"P75": 104.4,
		"P85": 105.8,
		"P90": 106.8,
		"P95": 108.3,
		"P97": 109.3,
		"P99": 111.1,
		"P999": 114.2
	},
	{
		"Month": 46,
		"L": 1,
		"M": 102.1933,
		"S": 0.04031,
		"SD": 4.1194,
		"P01": 89.5,
		"P1": 92.6,
		"P3": 94.4,
		"P5": 95.4,
		"P10": 96.9,
		"P15": 97.9,
		"P25": 99.4,
		"P50": 102.2,
		"P75": 105,
		"P85": 106.5,
		"P90": 107.5,
		"P95": 109,
		"P97": 109.9,
		"P99": 111.8,
		"P999": 114.9
	},
	{
		"Month": 47,
		"L": 1,
		"M": 102.7625,
		"S": 0.04045,
		"SD": 4.1567,
		"P01": 89.9,
		"P1": 93.1,
		"P3": 94.9,
		"P5": 95.9,
		"P10": 97.4,
		"P15": 98.5,
		"P25": 100,
		"P50": 102.8,
		"P75": 105.6,
		"P85": 107.1,
		"P90": 108.1,
		"P95": 109.6,
		"P97": 110.6,
		"P99": 112.4,
		"P999": 115.6
	},
	{
		"Month": 48,
		"L": 1,
		"M": 103.3273,
		"S": 0.04059,
		"SD": 4.1941,
		"P01": 90.4,
		"P1": 93.6,
		"P3": 95.4,
		"P5": 96.4,
		"P10": 98,
		"P15": 99,
		"P25": 100.5,
		"P50": 103.3,
		"P75": 106.2,
		"P85": 107.7,
		"P90": 108.7,
		"P95": 110.2,
		"P97": 111.2,
		"P99": 113.1,
		"P999": 116.3
	},
	{
		"Month": 49,
		"L": 1,
		"M": 103.8886,
		"S": 0.04073,
		"SD": 4.2314,
		"P01": 90.8,
		"P1": 94,
		"P3": 95.9,
		"P5": 96.9,
		"P10": 98.5,
		"P15": 99.5,
		"P25": 101,
		"P50": 103.9,
		"P75": 106.7,
		"P85": 108.3,
		"P90": 109.3,
		"P95": 110.8,
		"P97": 111.8,
		"P99": 113.7,
		"P999": 117
	},
	{
		"Month": 50,
		"L": 1,
		"M": 104.4473,
		"S": 0.04086,
		"SD": 4.2677,
		"P01": 91.3,
		"P1": 94.5,
		"P3": 96.4,
		"P5": 97.4,
		"P10": 99,
		"P15": 100,
		"P25": 101.6,
		"P50": 104.4,
		"P75": 107.3,
		"P85": 108.9,
		"P90": 109.9,
		"P95": 111.5,
		"P97": 112.5,
		"P99": 114.4,
		"P999": 117.6
	},
	{
		"Month": 51,
		"L": 1,
		"M": 105.0041,
		"S": 0.041,
		"SD": 4.3052,
		"P01": 91.7,
		"P1": 95,
		"P3": 96.9,
		"P5": 97.9,
		"P10": 99.5,
		"P15": 100.5,
		"P25": 102.1,
		"P50": 105,
		"P75": 107.9,
		"P85": 109.5,
		"P90": 110.5,
		"P95": 112.1,
		"P97": 113.1,
		"P99": 115,
		"P999": 118.3
	},
	{
		"Month": 52,
		"L": 1,
		"M": 105.5596,
		"S": 0.04113,
		"SD": 4.3417,
		"P01": 92.1,
		"P1": 95.5,
		"P3": 97.4,
		"P5": 98.4,
		"P10": 100,
		"P15": 101.1,
		"P25": 102.6,
		"P50": 105.6,
		"P75": 108.5,
		"P85": 110.1,
		"P90": 111.1,
		"P95": 112.7,
		"P97": 113.7,
		"P99": 115.7,
		"P999": 119
	},
	{
		"Month": 53,
		"L": 1,
		"M": 106.1138,
		"S": 0.04126,
		"SD": 4.3783,
		"P01": 92.6,
		"P1": 95.9,
		"P3": 97.9,
		"P5": 98.9,
		"P10": 100.5,
		"P15": 101.6,
		"P25": 103.2,
		"P50": 106.1,
		"P75": 109.1,
		"P85": 110.7,
		"P90": 111.7,
		"P95": 113.3,
		"P97": 114.3,
		"P99": 116.3,
		"P999": 119.6
	},
	{
		"Month": 54,
		"L": 1,
		"M": 106.6668,
		"S": 0.04139,
		"SD": 4.4149,
		"P01": 93,
		"P1": 96.4,
		"P3": 98.4,
		"P5": 99.4,
		"P10": 101,
		"P15": 102.1,
		"P25": 103.7,
		"P50": 106.7,
		"P75": 109.6,
		"P85": 111.2,
		"P90": 112.3,
		"P95": 113.9,
		"P97": 115,
		"P99": 116.9,
		"P999": 120.3
	},
	{
		"Month": 55,
		"L": 1,
		"M": 107.2188,
		"S": 0.04152,
		"SD": 4.4517,
		"P01": 93.5,
		"P1": 96.9,
		"P3": 98.8,
		"P5": 99.9,
		"P10": 101.5,
		"P15": 102.6,
		"P25": 104.2,
		"P50": 107.2,
		"P75": 110.2,
		"P85": 111.8,
		"P90": 112.9,
		"P95": 114.5,
		"P97": 115.6,
		"P99": 117.6,
		"P999": 121
	},
	{
		"Month": 56,
		"L": 1,
		"M": 107.7697,
		"S": 0.04165,
		"SD": 4.4886,
		"P01": 93.9,
		"P1": 97.3,
		"P3": 99.3,
		"P5": 100.4,
		"P10": 102,
		"P15": 103.1,
		"P25": 104.7,
		"P50": 107.8,
		"P75": 110.8,
		"P85": 112.4,
		"P90": 113.5,
		"P95": 115.2,
		"P97": 116.2,
		"P99": 118.2,
		"P999": 121.6
	},
	{
		"Month": 57,
		"L": 1,
		"M": 108.3198,
		"S": 0.04177,
		"SD": 4.5245,
		"P01": 94.3,
		"P1": 97.8,
		"P3": 99.8,
		"P5": 100.9,
		"P10": 102.5,
		"P15": 103.6,
		"P25": 105.3,
		"P50": 108.3,
		"P75": 111.4,
		"P85": 113,
		"P90": 114.1,
		"P95": 115.8,
		"P97": 116.8,
		"P99": 118.8,
		"P999": 122.3
	},
	{
		"Month": 58,
		"L": 1,
		"M": 108.8689,
		"S": 0.0419,
		"SD": 4.5616,
		"P01": 94.8,
		"P1": 98.3,
		"P3": 100.3,
		"P5": 101.4,
		"P10": 103,
		"P15": 104.1,
		"P25": 105.8,
		"P50": 108.9,
		"P75": 111.9,
		"P85": 113.6,
		"P90": 114.7,
		"P95": 116.4,
		"P97": 117.4,
		"P99": 119.5,
		"P999": 123
	},
	{
		"Month": 59,
		"L": 1,
		"M": 109.417,
		"S": 0.04202,
		"SD": 4.5977,
		"P01": 95.2,
		"P1": 98.7,
		"P3": 100.8,
		"P5": 101.9,
		"P10": 103.5,
		"P15": 104.7,
		"P25": 106.3,
		"P50": 109.4,
		"P75": 112.5,
		"P85": 114.2,
		"P90": 115.3,
		"P95": 117,
		"P97": 118.1,
		"P99": 120.1,
		"P999": 123.6
	},
	{
		"Month": 60,
		"L": 1,
		"M": 109.9638,
		"S": 0.04214,
		"SD": 4.6339,
		"P01": 95.6,
		"P1": 99.2,
		"P3": 101.2,
		"P5": 102.3,
		"P10": 104,
		"P15": 105.2,
		"P25": 106.8,
		"P50": 110,
		"P75": 113.1,
		"P85": 114.8,
		"P90": 115.9,
		"P95": 117.6,
		"P97": 118.7,
		"P99": 120.7,
		"P999": 124.3
	}
];

/***/ }),
/* 6 */
/***/ (function(module, exports) {

module.exports = [
	{
		"Week": 0,
		"L": 1,
		"M": 49.1477,
		"S": 0.0379,
		"SD": 1.8627,
		"P01": 43.4,
		"P1": 44.8,
		"P3": 45.6,
		"P5": 46.1,
		"P10": 46.8,
		"P15": 47.2,
		"P25": 47.9,
		"P50": 49.1,
		"P75": 50.4,
		"P85": 51.1,
		"P90": 51.5,
		"P95": 52.2,
		"P97": 52.7,
		"P99": 53.5,
		"P999": 54.9
	},
	{
		"Week": 1,
		"L": 1,
		"M": 50.3298,
		"S": 0.03742,
		"SD": 1.8833,
		"P01": 44.5,
		"P1": 45.9,
		"P3": 46.8,
		"P5": 47.2,
		"P10": 47.9,
		"P15": 48.4,
		"P25": 49.1,
		"P50": 50.3,
		"P75": 51.6,
		"P85": 52.3,
		"P90": 52.7,
		"P95": 53.4,
		"P97": 53.9,
		"P99": 54.7,
		"P999": 56.1
	},
	{
		"Week": 2,
		"L": 1,
		"M": 51.512,
		"S": 0.03694,
		"SD": 1.9029,
		"P01": 45.6,
		"P1": 47.1,
		"P3": 47.9,
		"P5": 48.4,
		"P10": 49.1,
		"P15": 49.5,
		"P25": 50.2,
		"P50": 51.5,
		"P75": 52.8,
		"P85": 53.5,
		"P90": 54,
		"P95": 54.6,
		"P97": 55.1,
		"P99": 55.9,
		"P999": 57.4
	},
	{
		"Week": 3,
		"L": 1,
		"M": 52.4695,
		"S": 0.03669,
		"SD": 1.9251,
		"P01": 46.5,
		"P1": 48,
		"P3": 48.8,
		"P5": 49.3,
		"P10": 50,
		"P15": 50.5,
		"P25": 51.2,
		"P50": 52.5,
		"P75": 53.8,
		"P85": 54.5,
		"P90": 54.9,
		"P95": 55.6,
		"P97": 56.1,
		"P99": 56.9,
		"P999": 58.4
	},
	{
		"Week": 4,
		"L": 1,
		"M": 53.3809,
		"S": 0.03647,
		"SD": 1.9468,
		"P01": 47.4,
		"P1": 48.9,
		"P3": 49.7,
		"P5": 50.2,
		"P10": 50.9,
		"P15": 51.4,
		"P25": 52.1,
		"P50": 53.4,
		"P75": 54.7,
		"P85": 55.4,
		"P90": 55.9,
		"P95": 56.6,
		"P97": 57,
		"P99": 57.9,
		"P999": 59.4
	},
	{
		"Week": 5,
		"L": 1,
		"M": 54.2454,
		"S": 0.03627,
		"SD": 1.9675,
		"P01": 48.2,
		"P1": 49.7,
		"P3": 50.5,
		"P5": 51,
		"P10": 51.7,
		"P15": 52.2,
		"P25": 52.9,
		"P50": 54.2,
		"P75": 55.6,
		"P85": 56.3,
		"P90": 56.8,
		"P95": 57.5,
		"P97": 57.9,
		"P99": 58.8,
		"P999": 60.3
	},
	{
		"Week": 6,
		"L": 1,
		"M": 55.0642,
		"S": 0.03609,
		"SD": 1.9873,
		"P01": 48.9,
		"P1": 50.4,
		"P3": 51.3,
		"P5": 51.8,
		"P10": 52.5,
		"P15": 53,
		"P25": 53.7,
		"P50": 55.1,
		"P75": 56.4,
		"P85": 57.1,
		"P90": 57.6,
		"P95": 58.3,
		"P97": 58.8,
		"P99": 59.7,
		"P999": 61.2
	},
	{
		"Week": 7,
		"L": 1,
		"M": 55.8406,
		"S": 0.03593,
		"SD": 2.0064,
		"P01": 49.6,
		"P1": 51.2,
		"P3": 52.1,
		"P5": 52.5,
		"P10": 53.3,
		"P15": 53.8,
		"P25": 54.5,
		"P50": 55.8,
		"P75": 57.2,
		"P85": 57.9,
		"P90": 58.4,
		"P95": 59.1,
		"P97": 59.6,
		"P99": 60.5,
		"P999": 62
	},
	{
		"Week": 8,
		"L": 1,
		"M": 56.5767,
		"S": 0.03578,
		"SD": 2.0243,
		"P01": 50.3,
		"P1": 51.9,
		"P3": 52.8,
		"P5": 53.2,
		"P10": 54,
		"P15": 54.5,
		"P25": 55.2,
		"P50": 56.6,
		"P75": 57.9,
		"P85": 58.7,
		"P90": 59.2,
		"P95": 59.9,
		"P97": 60.4,
		"P99": 61.3,
		"P999": 62.8
	},
	{
		"Week": 9,
		"L": 1,
		"M": 57.2761,
		"S": 0.03564,
		"SD": 2.0413,
		"P01": 51,
		"P1": 52.5,
		"P3": 53.4,
		"P5": 53.9,
		"P10": 54.7,
		"P15": 55.2,
		"P25": 55.9,
		"P50": 57.3,
		"P75": 58.7,
		"P85": 59.4,
		"P90": 59.9,
		"P95": 60.6,
		"P97": 61.1,
		"P99": 62,
		"P999": 63.6
	},
	{
		"Week": 10,
		"L": 1,
		"M": 57.9436,
		"S": 0.03552,
		"SD": 2.0582,
		"P01": 51.6,
		"P1": 53.2,
		"P3": 54.1,
		"P5": 54.6,
		"P10": 55.3,
		"P15": 55.8,
		"P25": 56.6,
		"P50": 57.9,
		"P75": 59.3,
		"P85": 60.1,
		"P90": 60.6,
		"P95": 61.3,
		"P97": 61.8,
		"P99": 62.7,
		"P999": 64.3
	},
	{
		"Week": 11,
		"L": 1,
		"M": 58.5816,
		"S": 0.0354,
		"SD": 2.0738,
		"P01": 52.2,
		"P1": 53.8,
		"P3": 54.7,
		"P5": 55.2,
		"P10": 55.9,
		"P15": 56.4,
		"P25": 57.2,
		"P50": 58.6,
		"P75": 60,
		"P85": 60.7,
		"P90": 61.2,
		"P95": 62,
		"P97": 62.5,
		"P99": 63.4,
		"P999": 65
	},
	{
		"Week": 12,
		"L": 1,
		"M": 59.1922,
		"S": 0.0353,
		"SD": 2.0895,
		"P01": 52.7,
		"P1": 54.3,
		"P3": 55.3,
		"P5": 55.8,
		"P10": 56.5,
		"P15": 57,
		"P25": 57.8,
		"P50": 59.2,
		"P75": 60.6,
		"P85": 61.4,
		"P90": 61.9,
		"P95": 62.6,
		"P97": 63.1,
		"P99": 64.1,
		"P999": 65.6
	},
	{
		"Week": 13,
		"L": 1,
		"M": 59.7773,
		"S": 0.0352,
		"SD": 2.1042,
		"P01": 53.3,
		"P1": 54.9,
		"P3": 55.8,
		"P5": 56.3,
		"P10": 57.1,
		"P15": 57.6,
		"P25": 58.4,
		"P50": 59.8,
		"P75": 61.2,
		"P85": 62,
		"P90": 62.5,
		"P95": 63.2,
		"P97": 63.7,
		"P99": 64.7,
		"P999": 66.3
	}
];

/***/ }),
/* 7 */
/***/ (function(module, exports) {

module.exports = [
	{
		"Month": 0,
		"L": 1,
		"M": 49.1477,
		"S": 0.0379,
		"SD": 1.8627,
		"P01": 43.4,
		"P1": 44.8,
		"P3": 45.6,
		"P5": 46.1,
		"P10": 46.8,
		"P15": 47.2,
		"P25": 47.9,
		"P50": 49.1,
		"P75": 50.4,
		"P85": 51.1,
		"P90": 51.5,
		"P95": 52.2,
		"P97": 52.7,
		"P99": 53.5,
		"P999": 54.9
	},
	{
		"Month": 1,
		"L": 1,
		"M": 53.6872,
		"S": 0.0364,
		"SD": 1.9542,
		"P01": 47.6,
		"P1": 49.1,
		"P3": 50,
		"P5": 50.5,
		"P10": 51.2,
		"P15": 51.7,
		"P25": 52.4,
		"P50": 53.7,
		"P75": 55,
		"P85": 55.7,
		"P90": 56.2,
		"P95": 56.9,
		"P97": 57.4,
		"P99": 58.2,
		"P999": 59.7
	},
	{
		"Month": 2,
		"L": 1,
		"M": 57.0673,
		"S": 0.03568,
		"SD": 2.0362,
		"P01": 50.8,
		"P1": 52.3,
		"P3": 53.2,
		"P5": 53.7,
		"P10": 54.5,
		"P15": 55,
		"P25": 55.7,
		"P50": 57.1,
		"P75": 58.4,
		"P85": 59.2,
		"P90": 59.7,
		"P95": 60.4,
		"P97": 60.9,
		"P99": 61.8,
		"P999": 63.4
	},
	{
		"Month": 3,
		"L": 1,
		"M": 59.8029,
		"S": 0.0352,
		"SD": 2.1051,
		"P01": 53.3,
		"P1": 54.9,
		"P3": 55.8,
		"P5": 56.3,
		"P10": 57.1,
		"P15": 57.6,
		"P25": 58.4,
		"P50": 59.8,
		"P75": 61.2,
		"P85": 62,
		"P90": 62.5,
		"P95": 63.3,
		"P97": 63.8,
		"P99": 64.7,
		"P999": 66.3
	},
	{
		"Month": 4,
		"L": 1,
		"M": 62.0899,
		"S": 0.03486,
		"SD": 2.1645,
		"P01": 55.4,
		"P1": 57.1,
		"P3": 58,
		"P5": 58.5,
		"P10": 59.3,
		"P15": 59.8,
		"P25": 60.6,
		"P50": 62.1,
		"P75": 63.5,
		"P85": 64.3,
		"P90": 64.9,
		"P95": 65.7,
		"P97": 66.2,
		"P99": 67.1,
		"P999": 68.8
	},
	{
		"Month": 5,
		"L": 1,
		"M": 64.0301,
		"S": 0.03463,
		"SD": 2.2174,
		"P01": 57.2,
		"P1": 58.9,
		"P3": 59.9,
		"P5": 60.4,
		"P10": 61.2,
		"P15": 61.7,
		"P25": 62.5,
		"P50": 64,
		"P75": 65.5,
		"P85": 66.3,
		"P90": 66.9,
		"P95": 67.7,
		"P97": 68.2,
		"P99": 69.2,
		"P999": 70.9
	},
	{
		"Month": 6,
		"L": 1,
		"M": 65.7311,
		"S": 0.03448,
		"SD": 2.2664,
		"P01": 58.7,
		"P1": 60.5,
		"P3": 61.5,
		"P5": 62,
		"P10": 62.8,
		"P15": 63.4,
		"P25": 64.2,
		"P50": 65.7,
		"P75": 67.3,
		"P85": 68.1,
		"P90": 68.6,
		"P95": 69.5,
		"P97": 70,
		"P99": 71,
		"P999": 72.7
	},
	{
		"Month": 7,
		"L": 1,
		"M": 67.2873,
		"S": 0.03441,
		"SD": 2.3154,
		"P01": 60.1,
		"P1": 61.9,
		"P3": 62.9,
		"P5": 63.5,
		"P10": 64.3,
		"P15": 64.9,
		"P25": 65.7,
		"P50": 67.3,
		"P75": 68.8,
		"P85": 69.7,
		"P90": 70.3,
		"P95": 71.1,
		"P97": 71.6,
		"P99": 72.7,
		"P999": 74.4
	},
	{
		"Month": 8,
		"L": 1,
		"M": 68.7498,
		"S": 0.0344,
		"SD": 2.365,
		"P01": 61.4,
		"P1": 63.2,
		"P3": 64.3,
		"P5": 64.9,
		"P10": 65.7,
		"P15": 66.3,
		"P25": 67.2,
		"P50": 68.7,
		"P75": 70.3,
		"P85": 71.2,
		"P90": 71.8,
		"P95": 72.6,
		"P97": 73.2,
		"P99": 74.3,
		"P999": 76.1
	},
	{
		"Month": 9,
		"L": 1,
		"M": 70.1435,
		"S": 0.03444,
		"SD": 2.4157,
		"P01": 62.7,
		"P1": 64.5,
		"P3": 65.6,
		"P5": 66.2,
		"P10": 67,
		"P15": 67.6,
		"P25": 68.5,
		"P50": 70.1,
		"P75": 71.8,
		"P85": 72.6,
		"P90": 73.2,
		"P95": 74.1,
		"P97": 74.7,
		"P99": 75.8,
		"P999": 77.6
	},
	{
		"Month": 10,
		"L": 1,
		"M": 71.4818,
		"S": 0.03452,
		"SD": 2.4676,
		"P01": 63.9,
		"P1": 65.7,
		"P3": 66.8,
		"P5": 67.4,
		"P10": 68.3,
		"P15": 68.9,
		"P25": 69.8,
		"P50": 71.5,
		"P75": 73.1,
		"P85": 74,
		"P90": 74.6,
		"P95": 75.5,
		"P97": 76.1,
		"P99": 77.2,
		"P999": 79.1
	},
	{
		"Month": 11,
		"L": 1,
		"M": 72.771,
		"S": 0.03464,
		"SD": 2.5208,
		"P01": 65,
		"P1": 66.9,
		"P3": 68,
		"P5": 68.6,
		"P10": 69.5,
		"P15": 70.2,
		"P25": 71.1,
		"P50": 72.8,
		"P75": 74.5,
		"P85": 75.4,
		"P90": 76,
		"P95": 76.9,
		"P97": 77.5,
		"P99": 78.6,
		"P999": 80.6
	},
	{
		"Month": 12,
		"L": 1,
		"M": 74.015,
		"S": 0.03479,
		"SD": 2.575,
		"P01": 66.1,
		"P1": 68,
		"P3": 69.2,
		"P5": 69.8,
		"P10": 70.7,
		"P15": 71.3,
		"P25": 72.3,
		"P50": 74,
		"P75": 75.8,
		"P85": 76.7,
		"P90": 77.3,
		"P95": 78.3,
		"P97": 78.9,
		"P99": 80,
		"P999": 82
	},
	{
		"Month": 13,
		"L": 1,
		"M": 75.2176,
		"S": 0.03496,
		"SD": 2.6296,
		"P01": 67.1,
		"P1": 69.1,
		"P3": 70.3,
		"P5": 70.9,
		"P10": 71.8,
		"P15": 72.5,
		"P25": 73.4,
		"P50": 75.2,
		"P75": 77,
		"P85": 77.9,
		"P90": 78.6,
		"P95": 79.5,
		"P97": 80.2,
		"P99": 81.3,
		"P999": 83.3
	},
	{
		"Month": 14,
		"L": 1,
		"M": 76.3817,
		"S": 0.03514,
		"SD": 2.6841,
		"P01": 68.1,
		"P1": 70.1,
		"P3": 71.3,
		"P5": 72,
		"P10": 72.9,
		"P15": 73.6,
		"P25": 74.6,
		"P50": 76.4,
		"P75": 78.2,
		"P85": 79.2,
		"P90": 79.8,
		"P95": 80.8,
		"P97": 81.4,
		"P99": 82.6,
		"P999": 84.7
	},
	{
		"Month": 15,
		"L": 1,
		"M": 77.5099,
		"S": 0.03534,
		"SD": 2.7392,
		"P01": 69,
		"P1": 71.1,
		"P3": 72.4,
		"P5": 73,
		"P10": 74,
		"P15": 74.7,
		"P25": 75.7,
		"P50": 77.5,
		"P75": 79.4,
		"P85": 80.3,
		"P90": 81,
		"P95": 82,
		"P97": 82.7,
		"P99": 83.9,
		"P999": 86
	},
	{
		"Month": 16,
		"L": 1,
		"M": 78.6055,
		"S": 0.03555,
		"SD": 2.7944,
		"P01": 70,
		"P1": 72.1,
		"P3": 73.3,
		"P5": 74,
		"P10": 75,
		"P15": 75.7,
		"P25": 76.7,
		"P50": 78.6,
		"P75": 80.5,
		"P85": 81.5,
		"P90": 82.2,
		"P95": 83.2,
		"P97": 83.9,
		"P99": 85.1,
		"P999": 87.2
	},
	{
		"Month": 17,
		"L": 1,
		"M": 79.671,
		"S": 0.03576,
		"SD": 2.849,
		"P01": 70.9,
		"P1": 73,
		"P3": 74.3,
		"P5": 75,
		"P10": 76,
		"P15": 76.7,
		"P25": 77.7,
		"P50": 79.7,
		"P75": 81.6,
		"P85": 82.6,
		"P90": 83.3,
		"P95": 84.4,
		"P97": 85,
		"P99": 86.3,
		"P999": 88.5
	},
	{
		"Month": 18,
		"L": 1,
		"M": 80.7079,
		"S": 0.03598,
		"SD": 2.9039,
		"P01": 71.7,
		"P1": 74,
		"P3": 75.2,
		"P5": 75.9,
		"P10": 77,
		"P15": 77.7,
		"P25": 78.7,
		"P50": 80.7,
		"P75": 82.7,
		"P85": 83.7,
		"P90": 84.4,
		"P95": 85.5,
		"P97": 86.2,
		"P99": 87.5,
		"P999": 89.7
	},
	{
		"Month": 19,
		"L": 1,
		"M": 81.7182,
		"S": 0.0362,
		"SD": 2.9582,
		"P01": 72.6,
		"P1": 74.8,
		"P3": 76.2,
		"P5": 76.9,
		"P10": 77.9,
		"P15": 78.7,
		"P25": 79.7,
		"P50": 81.7,
		"P75": 83.7,
		"P85": 84.8,
		"P90": 85.5,
		"P95": 86.6,
		"P97": 87.3,
		"P99": 88.6,
		"P999": 90.9
	},
	{
		"Month": 20,
		"L": 1,
		"M": 82.7036,
		"S": 0.03643,
		"SD": 3.0129,
		"P01": 73.4,
		"P1": 75.7,
		"P3": 77,
		"P5": 77.7,
		"P10": 78.8,
		"P15": 79.6,
		"P25": 80.7,
		"P50": 82.7,
		"P75": 84.7,
		"P85": 85.8,
		"P90": 86.6,
		"P95": 87.7,
		"P97": 88.4,
		"P99": 89.7,
		"P999": 92
	},
	{
		"Month": 21,
		"L": 1,
		"M": 83.6654,
		"S": 0.03666,
		"SD": 3.0672,
		"P01": 74.2,
		"P1": 76.5,
		"P3": 77.9,
		"P5": 78.6,
		"P10": 79.7,
		"P15": 80.5,
		"P25": 81.6,
		"P50": 83.7,
		"P75": 85.7,
		"P85": 86.8,
		"P90": 87.6,
		"P95": 88.7,
		"P97": 89.4,
		"P99": 90.8,
		"P999": 93.1
	},
	{
		"Month": 22,
		"L": 1,
		"M": 84.604,
		"S": 0.03688,
		"SD": 3.1202,
		"P01": 75,
		"P1": 77.3,
		"P3": 78.7,
		"P5": 79.5,
		"P10": 80.6,
		"P15": 81.4,
		"P25": 82.5,
		"P50": 84.6,
		"P75": 86.7,
		"P85": 87.8,
		"P90": 88.6,
		"P95": 89.7,
		"P97": 90.5,
		"P99": 91.9,
		"P999": 94.2
	},
	{
		"Month": 23,
		"L": 1,
		"M": 85.5202,
		"S": 0.03711,
		"SD": 3.1737,
		"P01": 75.7,
		"P1": 78.1,
		"P3": 79.6,
		"P5": 80.3,
		"P10": 81.5,
		"P15": 82.2,
		"P25": 83.4,
		"P50": 85.5,
		"P75": 87.7,
		"P85": 88.8,
		"P90": 89.6,
		"P95": 90.7,
		"P97": 91.5,
		"P99": 92.9,
		"P999": 95.3
	},
	{
		"Month": 24,
		"L": 1,
		"M": 86.4153,
		"S": 0.03734,
		"SD": 3.2267,
		"P01": 76.4,
		"P1": 78.9,
		"P3": 80.3,
		"P5": 81.1,
		"P10": 82.3,
		"P15": 83.1,
		"P25": 84.2,
		"P50": 86.4,
		"P75": 88.6,
		"P85": 89.8,
		"P90": 90.6,
		"P95": 91.7,
		"P97": 92.5,
		"P99": 93.9,
		"P999": 96.4
	}
];

/***/ }),
/* 8 */
/***/ (function(module, exports) {

module.exports = [
	{
		"Month": 24,
		"L": 1,
		"M": 85.7153,
		"S": 0.03764,
		"SD": 3.2267,
		"P01": 75.7,
		"P1": 78.2,
		"P3": 79.6,
		"P5": 80.4,
		"P10": 81.6,
		"P15": 82.4,
		"P25": 83.5,
		"P50": 85.7,
		"P75": 87.9,
		"P85": 89.1,
		"P90": 89.9,
		"P95": 91,
		"P97": 91.8,
		"P99": 93.2,
		"P999": 95.7
	},
	{
		"Month": 25,
		"L": 1,
		"M": 86.5904,
		"S": 0.03786,
		"SD": 3.2783,
		"P01": 76.5,
		"P1": 79,
		"P3": 80.4,
		"P5": 81.2,
		"P10": 82.4,
		"P15": 83.2,
		"P25": 84.4,
		"P50": 86.6,
		"P75": 88.8,
		"P85": 90,
		"P90": 90.8,
		"P95": 92,
		"P97": 92.8,
		"P99": 94.2,
		"P999": 96.7
	},
	{
		"Month": 26,
		"L": 1,
		"M": 87.4462,
		"S": 0.03808,
		"SD": 3.33,
		"P01": 77.2,
		"P1": 79.7,
		"P3": 81.2,
		"P5": 82,
		"P10": 83.2,
		"P15": 84,
		"P25": 85.2,
		"P50": 87.4,
		"P75": 89.7,
		"P85": 90.9,
		"P90": 91.7,
		"P95": 92.9,
		"P97": 93.7,
		"P99": 95.2,
		"P999": 97.7
	},
	{
		"Month": 27,
		"L": 1,
		"M": 88.283,
		"S": 0.0383,
		"SD": 3.3812,
		"P01": 77.8,
		"P1": 80.4,
		"P3": 81.9,
		"P5": 82.7,
		"P10": 83.9,
		"P15": 84.8,
		"P25": 86,
		"P50": 88.3,
		"P75": 90.6,
		"P85": 91.8,
		"P90": 92.6,
		"P95": 93.8,
		"P97": 94.6,
		"P99": 96.1,
		"P999": 98.7
	},
	{
		"Month": 28,
		"L": 1,
		"M": 89.1004,
		"S": 0.03851,
		"SD": 3.4313,
		"P01": 78.5,
		"P1": 81.1,
		"P3": 82.6,
		"P5": 83.5,
		"P10": 84.7,
		"P15": 85.5,
		"P25": 86.8,
		"P50": 89.1,
		"P75": 91.4,
		"P85": 92.7,
		"P90": 93.5,
		"P95": 94.7,
		"P97": 95.6,
		"P99": 97.1,
		"P999": 99.7
	},
	{
		"Month": 29,
		"L": 1,
		"M": 89.8991,
		"S": 0.03872,
		"SD": 3.4809,
		"P01": 79.1,
		"P1": 81.8,
		"P3": 83.4,
		"P5": 84.2,
		"P10": 85.4,
		"P15": 86.3,
		"P25": 87.6,
		"P50": 89.9,
		"P75": 92.2,
		"P85": 93.5,
		"P90": 94.4,
		"P95": 95.6,
		"P97": 96.4,
		"P99": 98,
		"P999": 100.7
	},
	{
		"Month": 30,
		"L": 1,
		"M": 90.6797,
		"S": 0.03893,
		"SD": 3.5302,
		"P01": 79.8,
		"P1": 82.5,
		"P3": 84,
		"P5": 84.9,
		"P10": 86.2,
		"P15": 87,
		"P25": 88.3,
		"P50": 90.7,
		"P75": 93.1,
		"P85": 94.3,
		"P90": 95.2,
		"P95": 96.5,
		"P97": 97.3,
		"P99": 98.9,
		"P999": 101.6
	},
	{
		"Month": 31,
		"L": 1,
		"M": 91.443,
		"S": 0.03913,
		"SD": 3.5782,
		"P01": 80.4,
		"P1": 83.1,
		"P3": 84.7,
		"P5": 85.6,
		"P10": 86.9,
		"P15": 87.7,
		"P25": 89,
		"P50": 91.4,
		"P75": 93.9,
		"P85": 95.2,
		"P90": 96,
		"P95": 97.3,
		"P97": 98.2,
		"P99": 99.8,
		"P999": 102.5
	},
	{
		"Month": 32,
		"L": 1,
		"M": 92.1906,
		"S": 0.03933,
		"SD": 3.6259,
		"P01": 81,
		"P1": 83.8,
		"P3": 85.4,
		"P5": 86.2,
		"P10": 87.5,
		"P15": 88.4,
		"P25": 89.7,
		"P50": 92.2,
		"P75": 94.6,
		"P85": 95.9,
		"P90": 96.8,
		"P95": 98.2,
		"P97": 99,
		"P99": 100.6,
		"P999": 103.4
	},
	{
		"Month": 33,
		"L": 1,
		"M": 92.9239,
		"S": 0.03952,
		"SD": 3.6724,
		"P01": 81.6,
		"P1": 84.4,
		"P3": 86,
		"P5": 86.9,
		"P10": 88.2,
		"P15": 89.1,
		"P25": 90.4,
		"P50": 92.9,
		"P75": 95.4,
		"P85": 96.7,
		"P90": 97.6,
		"P95": 99,
		"P97": 99.8,
		"P99": 101.5,
		"P999": 104.3
	},
	{
		"Month": 34,
		"L": 1,
		"M": 93.6444,
		"S": 0.03971,
		"SD": 3.7186,
		"P01": 82.2,
		"P1": 85,
		"P3": 86.7,
		"P5": 87.5,
		"P10": 88.9,
		"P15": 89.8,
		"P25": 91.1,
		"P50": 93.6,
		"P75": 96.2,
		"P85": 97.5,
		"P90": 98.4,
		"P95": 99.8,
		"P97": 100.6,
		"P99": 102.3,
		"P999": 105.1
	},
	{
		"Month": 35,
		"L": 1,
		"M": 94.3533,
		"S": 0.03989,
		"SD": 3.7638,
		"P01": 82.7,
		"P1": 85.6,
		"P3": 87.3,
		"P5": 88.2,
		"P10": 89.5,
		"P15": 90.5,
		"P25": 91.8,
		"P50": 94.4,
		"P75": 96.9,
		"P85": 98.3,
		"P90": 99.2,
		"P95": 100.5,
		"P97": 101.4,
		"P99": 103.1,
		"P999": 106
	},
	{
		"Month": 36,
		"L": 1,
		"M": 95.0515,
		"S": 0.04006,
		"SD": 3.8078,
		"P01": 83.3,
		"P1": 86.2,
		"P3": 87.9,
		"P5": 88.8,
		"P10": 90.2,
		"P15": 91.1,
		"P25": 92.5,
		"P50": 95.1,
		"P75": 97.6,
		"P85": 99,
		"P90": 99.9,
		"P95": 101.3,
		"P97": 102.2,
		"P99": 103.9,
		"P999": 106.8
	},
	{
		"Month": 37,
		"L": 1,
		"M": 95.7399,
		"S": 0.04024,
		"SD": 3.8526,
		"P01": 83.8,
		"P1": 86.8,
		"P3": 88.5,
		"P5": 89.4,
		"P10": 90.8,
		"P15": 91.7,
		"P25": 93.1,
		"P50": 95.7,
		"P75": 98.3,
		"P85": 99.7,
		"P90": 100.7,
		"P95": 102.1,
		"P97": 103,
		"P99": 104.7,
		"P999": 107.6
	},
	{
		"Month": 38,
		"L": 1,
		"M": 96.4187,
		"S": 0.04041,
		"SD": 3.8963,
		"P01": 84.4,
		"P1": 87.4,
		"P3": 89.1,
		"P5": 90,
		"P10": 91.4,
		"P15": 92.4,
		"P25": 93.8,
		"P50": 96.4,
		"P75": 99,
		"P85": 100.5,
		"P90": 101.4,
		"P95": 102.8,
		"P97": 103.7,
		"P99": 105.5,
		"P999": 108.5
	},
	{
		"Month": 39,
		"L": 1,
		"M": 97.0885,
		"S": 0.04057,
		"SD": 3.9389,
		"P01": 84.9,
		"P1": 87.9,
		"P3": 89.7,
		"P5": 90.6,
		"P10": 92,
		"P15": 93,
		"P25": 94.4,
		"P50": 97.1,
		"P75": 99.7,
		"P85": 101.2,
		"P90": 102.1,
		"P95": 103.6,
		"P97": 104.5,
		"P99": 106.3,
		"P999": 109.3
	},
	{
		"Month": 40,
		"L": 1,
		"M": 97.7493,
		"S": 0.04073,
		"SD": 3.9813,
		"P01": 85.4,
		"P1": 88.5,
		"P3": 90.3,
		"P5": 91.2,
		"P10": 92.6,
		"P15": 93.6,
		"P25": 95.1,
		"P50": 97.7,
		"P75": 100.4,
		"P85": 101.9,
		"P90": 102.9,
		"P95": 104.3,
		"P97": 105.2,
		"P99": 107,
		"P999": 110.1
	},
	{
		"Month": 41,
		"L": 1,
		"M": 98.4015,
		"S": 0.04089,
		"SD": 4.0236,
		"P01": 86,
		"P1": 89,
		"P3": 90.8,
		"P5": 91.8,
		"P10": 93.2,
		"P15": 94.2,
		"P25": 95.7,
		"P50": 98.4,
		"P75": 101.1,
		"P85": 102.6,
		"P90": 103.6,
		"P95": 105,
		"P97": 106,
		"P99": 107.8,
		"P999": 110.8
	},
	{
		"Month": 42,
		"L": 1,
		"M": 99.0448,
		"S": 0.04105,
		"SD": 4.0658,
		"P01": 86.5,
		"P1": 89.6,
		"P3": 91.4,
		"P5": 92.4,
		"P10": 93.8,
		"P15": 94.8,
		"P25": 96.3,
		"P50": 99,
		"P75": 101.8,
		"P85": 103.3,
		"P90": 104.3,
		"P95": 105.7,
		"P97": 106.7,
		"P99": 108.5,
		"P999": 111.6
	},
	{
		"Month": 43,
		"L": 1,
		"M": 99.6795,
		"S": 0.0412,
		"SD": 4.1068,
		"P01": 87,
		"P1": 90.1,
		"P3": 92,
		"P5": 92.9,
		"P10": 94.4,
		"P15": 95.4,
		"P25": 96.9,
		"P50": 99.7,
		"P75": 102.4,
		"P85": 103.9,
		"P90": 104.9,
		"P95": 106.4,
		"P97": 107.4,
		"P99": 109.2,
		"P999": 112.4
	},
	{
		"Month": 44,
		"L": 1,
		"M": 100.3058,
		"S": 0.04135,
		"SD": 4.1476,
		"P01": 87.5,
		"P1": 90.7,
		"P3": 92.5,
		"P5": 93.5,
		"P10": 95,
		"P15": 96,
		"P25": 97.5,
		"P50": 100.3,
		"P75": 103.1,
		"P85": 104.6,
		"P90": 105.6,
		"P95": 107.1,
		"P97": 108.1,
		"P99": 110,
		"P999": 113.1
	},
	{
		"Month": 45,
		"L": 1,
		"M": 100.9238,
		"S": 0.0415,
		"SD": 4.1883,
		"P01": 88,
		"P1": 91.2,
		"P3": 93,
		"P5": 94,
		"P10": 95.6,
		"P15": 96.6,
		"P25": 98.1,
		"P50": 100.9,
		"P75": 103.7,
		"P85": 105.3,
		"P90": 106.3,
		"P95": 107.8,
		"P97": 108.8,
		"P99": 110.7,
		"P999": 113.9
	},
	{
		"Month": 46,
		"L": 1,
		"M": 101.5337,
		"S": 0.04164,
		"SD": 4.2279,
		"P01": 88.5,
		"P1": 91.7,
		"P3": 93.6,
		"P5": 94.6,
		"P10": 96.1,
		"P15": 97.2,
		"P25": 98.7,
		"P50": 101.5,
		"P75": 104.4,
		"P85": 105.9,
		"P90": 107,
		"P95": 108.5,
		"P97": 109.5,
		"P99": 111.4,
		"P999": 114.6
	},
	{
		"Month": 47,
		"L": 1,
		"M": 102.136,
		"S": 0.04179,
		"SD": 4.2683,
		"P01": 88.9,
		"P1": 92.2,
		"P3": 94.1,
		"P5": 95.1,
		"P10": 96.7,
		"P15": 97.7,
		"P25": 99.3,
		"P50": 102.1,
		"P75": 105,
		"P85": 106.6,
		"P90": 107.6,
		"P95": 109.2,
		"P97": 110.2,
		"P99": 112.1,
		"P999": 115.3
	},
	{
		"Month": 48,
		"L": 1,
		"M": 102.7312,
		"S": 0.04193,
		"SD": 4.3075,
		"P01": 89.4,
		"P1": 92.7,
		"P3": 94.6,
		"P5": 95.6,
		"P10": 97.2,
		"P15": 98.3,
		"P25": 99.8,
		"P50": 102.7,
		"P75": 105.6,
		"P85": 107.2,
		"P90": 108.3,
		"P95": 109.8,
		"P97": 110.8,
		"P99": 112.8,
		"P999": 116
	},
	{
		"Month": 49,
		"L": 1,
		"M": 103.3197,
		"S": 0.04206,
		"SD": 4.3456,
		"P01": 89.9,
		"P1": 93.2,
		"P3": 95.1,
		"P5": 96.2,
		"P10": 97.8,
		"P15": 98.8,
		"P25": 100.4,
		"P50": 103.3,
		"P75": 106.3,
		"P85": 107.8,
		"P90": 108.9,
		"P95": 110.5,
		"P97": 111.5,
		"P99": 113.4,
		"P999": 116.7
	},
	{
		"Month": 50,
		"L": 1,
		"M": 103.9021,
		"S": 0.0422,
		"SD": 4.3847,
		"P01": 90.4,
		"P1": 93.7,
		"P3": 95.7,
		"P5": 96.7,
		"P10": 98.3,
		"P15": 99.4,
		"P25": 100.9,
		"P50": 103.9,
		"P75": 106.9,
		"P85": 108.4,
		"P90": 109.5,
		"P95": 111.1,
		"P97": 112.1,
		"P99": 114.1,
		"P999": 117.5
	},
	{
		"Month": 51,
		"L": 1,
		"M": 104.4786,
		"S": 0.04233,
		"SD": 4.4226,
		"P01": 90.8,
		"P1": 94.2,
		"P3": 96.2,
		"P5": 97.2,
		"P10": 98.8,
		"P15": 99.9,
		"P25": 101.5,
		"P50": 104.5,
		"P75": 107.5,
		"P85": 109.1,
		"P90": 110.1,
		"P95": 111.8,
		"P97": 112.8,
		"P99": 114.8,
		"P999": 118.1
	},
	{
		"Month": 52,
		"L": 1,
		"M": 105.0494,
		"S": 0.04246,
		"SD": 4.4604,
		"P01": 91.3,
		"P1": 94.7,
		"P3": 96.7,
		"P5": 97.7,
		"P10": 99.3,
		"P15": 100.4,
		"P25": 102,
		"P50": 105,
		"P75": 108.1,
		"P85": 109.7,
		"P90": 110.8,
		"P95": 112.4,
		"P97": 113.4,
		"P99": 115.4,
		"P999": 118.8
	},
	{
		"Month": 53,
		"L": 1,
		"M": 105.6148,
		"S": 0.04259,
		"SD": 4.4981,
		"P01": 91.7,
		"P1": 95.2,
		"P3": 97.2,
		"P5": 98.2,
		"P10": 99.9,
		"P15": 101,
		"P25": 102.6,
		"P50": 105.6,
		"P75": 108.6,
		"P85": 110.3,
		"P90": 111.4,
		"P95": 113,
		"P97": 114.1,
		"P99": 116.1,
		"P999": 119.5
	},
	{
		"Month": 54,
		"L": 1,
		"M": 106.1748,
		"S": 0.04272,
		"SD": 4.5358,
		"P01": 92.2,
		"P1": 95.6,
		"P3": 97.6,
		"P5": 98.7,
		"P10": 100.4,
		"P15": 101.5,
		"P25": 103.1,
		"P50": 106.2,
		"P75": 109.2,
		"P85": 110.9,
		"P90": 112,
		"P95": 113.6,
		"P97": 114.7,
		"P99": 116.7,
		"P999": 120.2
	},
	{
		"Month": 55,
		"L": 1,
		"M": 106.7295,
		"S": 0.04285,
		"SD": 4.5734,
		"P01": 92.6,
		"P1": 96.1,
		"P3": 98.1,
		"P5": 99.2,
		"P10": 100.9,
		"P15": 102,
		"P25": 103.6,
		"P50": 106.7,
		"P75": 109.8,
		"P85": 111.5,
		"P90": 112.6,
		"P95": 114.3,
		"P97": 115.3,
		"P99": 117.4,
		"P999": 120.9
	},
	{
		"Month": 56,
		"L": 1,
		"M": 107.2788,
		"S": 0.04298,
		"SD": 4.6108,
		"P01": 93,
		"P1": 96.6,
		"P3": 98.6,
		"P5": 99.7,
		"P10": 101.4,
		"P15": 102.5,
		"P25": 104.2,
		"P50": 107.3,
		"P75": 110.4,
		"P85": 112.1,
		"P90": 113.2,
		"P95": 114.9,
		"P97": 116,
		"P99": 118,
		"P999": 121.5
	},
	{
		"Month": 57,
		"L": 1,
		"M": 107.8227,
		"S": 0.0431,
		"SD": 4.6472,
		"P01": 93.5,
		"P1": 97,
		"P3": 99.1,
		"P5": 100.2,
		"P10": 101.9,
		"P15": 103,
		"P25": 104.7,
		"P50": 107.8,
		"P75": 111,
		"P85": 112.6,
		"P90": 113.8,
		"P95": 115.5,
		"P97": 116.6,
		"P99": 118.6,
		"P999": 122.2
	},
	{
		"Month": 58,
		"L": 1,
		"M": 108.3613,
		"S": 0.04322,
		"SD": 4.6834,
		"P01": 93.9,
		"P1": 97.5,
		"P3": 99.6,
		"P5": 100.7,
		"P10": 102.4,
		"P15": 103.5,
		"P25": 105.2,
		"P50": 108.4,
		"P75": 111.5,
		"P85": 113.2,
		"P90": 114.4,
		"P95": 116.1,
		"P97": 117.2,
		"P99": 119.3,
		"P999": 122.8
	},
	{
		"Month": 59,
		"L": 1,
		"M": 108.8948,
		"S": 0.04334,
		"SD": 4.7195,
		"P01": 94.3,
		"P1": 97.9,
		"P3": 100,
		"P5": 101.1,
		"P10": 102.8,
		"P15": 104,
		"P25": 105.7,
		"P50": 108.9,
		"P75": 112.1,
		"P85": 113.8,
		"P90": 114.9,
		"P95": 116.7,
		"P97": 117.8,
		"P99": 119.9,
		"P999": 123.5
	},
	{
		"Month": 60,
		"L": 1,
		"M": 109.4233,
		"S": 0.04347,
		"SD": 4.7566,
		"P01": 94.7,
		"P1": 98.4,
		"P3": 100.5,
		"P5": 101.6,
		"P10": 103.3,
		"P15": 104.5,
		"P25": 106.2,
		"P50": 109.4,
		"P75": 112.6,
		"P85": 114.4,
		"P90": 115.5,
		"P95": 117.2,
		"P97": 118.4,
		"P99": 120.5,
		"P999": 124.1
	}
];

/***/ }),
/* 9 */
/***/ (function(module, exports) {

module.exports = [
	{
		"Week": 0,
		"L": 0.3487,
		"M": 3.3464,
		"S": 0.14602,
		"P01": 2,
		"P1": 2.3,
		"P3": 2.5,
		"P5": 2.6,
		"P10": 2.8,
		"P15": 2.9,
		"P25": 3,
		"P50": 3.3,
		"P75": 3.7,
		"P85": 3.9,
		"P90": 4,
		"P95": 4.2,
		"P97": 4.3,
		"P99": 4.6,
		"P999": 5.1
	},
	{
		"Week": 1,
		"L": 0.2776,
		"M": 3.4879,
		"S": 0.14483,
		"P01": 2.2,
		"P1": 2.4,
		"P3": 2.6,
		"P5": 2.7,
		"P10": 2.9,
		"P15": 3,
		"P25": 3.2,
		"P50": 3.5,
		"P75": 3.8,
		"P85": 4,
		"P90": 4.2,
		"P95": 4.4,
		"P97": 4.5,
		"P99": 4.8,
		"P999": 5.3
	},
	{
		"Week": 2,
		"L": 0.2581,
		"M": 3.7529,
		"S": 0.14142,
		"P01": 2.4,
		"P1": 2.7,
		"P3": 2.8,
		"P5": 3,
		"P10": 3.1,
		"P15": 3.2,
		"P25": 3.4,
		"P50": 3.8,
		"P75": 4.1,
		"P85": 4.3,
		"P90": 4.5,
		"P95": 4.7,
		"P97": 4.9,
		"P99": 5.1,
		"P999": 5.7
	},
	{
		"Week": 3,
		"L": 0.2442,
		"M": 4.0603,
		"S": 0.13807,
		"P01": 2.6,
		"P1": 2.9,
		"P3": 3.1,
		"P5": 3.2,
		"P10": 3.4,
		"P15": 3.5,
		"P25": 3.7,
		"P50": 4.1,
		"P75": 4.5,
		"P85": 4.7,
		"P90": 4.8,
		"P95": 5.1,
		"P97": 5.2,
		"P99": 5.5,
		"P999": 6.1
	},
	{
		"Week": 4,
		"L": 0.2331,
		"M": 4.3671,
		"S": 0.13497,
		"P01": 2.8,
		"P1": 3.2,
		"P3": 3.4,
		"P5": 3.5,
		"P10": 3.7,
		"P15": 3.8,
		"P25": 4,
		"P50": 4.4,
		"P75": 4.8,
		"P85": 5,
		"P90": 5.2,
		"P95": 5.4,
		"P97": 5.6,
		"P99": 5.9,
		"P999": 6.5
	},
	{
		"Week": 5,
		"L": 0.2237,
		"M": 4.659,
		"S": 0.13215,
		"P01": 3,
		"P1": 3.4,
		"P3": 3.6,
		"P5": 3.7,
		"P10": 3.9,
		"P15": 4.1,
		"P25": 4.3,
		"P50": 4.7,
		"P75": 5.1,
		"P85": 5.3,
		"P90": 5.5,
		"P95": 5.8,
		"P97": 5.9,
		"P99": 6.3,
		"P999": 6.9
	},
	{
		"Week": 6,
		"L": 0.2155,
		"M": 4.9303,
		"S": 0.1296,
		"P01": 3.2,
		"P1": 3.6,
		"P3": 3.8,
		"P5": 4,
		"P10": 4.2,
		"P15": 4.3,
		"P25": 4.5,
		"P50": 4.9,
		"P75": 5.4,
		"P85": 5.6,
		"P90": 5.8,
		"P95": 6.1,
		"P97": 6.3,
		"P99": 6.6,
		"P999": 7.2
	},
	{
		"Week": 7,
		"L": 0.2081,
		"M": 5.1817,
		"S": 0.12729,
		"P01": 3.4,
		"P1": 3.8,
		"P3": 4.1,
		"P5": 4.2,
		"P10": 4.4,
		"P15": 4.5,
		"P25": 4.8,
		"P50": 5.2,
		"P75": 5.6,
		"P85": 5.9,
		"P90": 6.1,
		"P95": 6.4,
		"P97": 6.5,
		"P99": 6.9,
		"P999": 7.6
	},
	{
		"Week": 8,
		"L": 0.2014,
		"M": 5.4149,
		"S": 0.1252,
		"P01": 3.6,
		"P1": 4,
		"P3": 4.3,
		"P5": 4.4,
		"P10": 4.6,
		"P15": 4.7,
		"P25": 5,
		"P50": 5.4,
		"P75": 5.9,
		"P85": 6.2,
		"P90": 6.3,
		"P95": 6.6,
		"P97": 6.8,
		"P99": 7.2,
		"P999": 7.9
	},
	{
		"Week": 9,
		"L": 0.1952,
		"M": 5.6319,
		"S": 0.1233,
		"P01": 3.8,
		"P1": 4.2,
		"P3": 4.4,
		"P5": 4.6,
		"P10": 4.8,
		"P15": 4.9,
		"P25": 5.2,
		"P50": 5.6,
		"P75": 6.1,
		"P85": 6.4,
		"P90": 6.6,
		"P95": 6.9,
		"P97": 7.1,
		"P99": 7.4,
		"P999": 8.1
	},
	{
		"Week": 10,
		"L": 0.1894,
		"M": 5.8346,
		"S": 0.12157,
		"P01": 4,
		"P1": 4.4,
		"P3": 4.6,
		"P5": 4.8,
		"P10": 5,
		"P15": 5.1,
		"P25": 5.4,
		"P50": 5.8,
		"P75": 6.3,
		"P85": 6.6,
		"P90": 6.8,
		"P95": 7.1,
		"P97": 7.3,
		"P99": 7.7,
		"P999": 8.4
	},
	{
		"Week": 11,
		"L": 0.184,
		"M": 6.0242,
		"S": 0.12001,
		"P01": 4.1,
		"P1": 4.5,
		"P3": 4.8,
		"P5": 4.9,
		"P10": 5.2,
		"P15": 5.3,
		"P25": 5.6,
		"P50": 6,
		"P75": 6.5,
		"P85": 6.8,
		"P90": 7,
		"P95": 7.3,
		"P97": 7.5,
		"P99": 7.9,
		"P999": 8.6
	},
	{
		"Week": 12,
		"L": 0.1789,
		"M": 6.2019,
		"S": 0.1186,
		"P01": 4.2,
		"P1": 4.7,
		"P3": 4.9,
		"P5": 5.1,
		"P10": 5.3,
		"P15": 5.5,
		"P25": 5.7,
		"P50": 6.2,
		"P75": 6.7,
		"P85": 7,
		"P90": 7.2,
		"P95": 7.5,
		"P97": 7.7,
		"P99": 8.1,
		"P999": 8.8
	},
	{
		"Week": 13,
		"L": 0.174,
		"M": 6.369,
		"S": 0.11732,
		"P01": 4.4,
		"P1": 4.8,
		"P3": 5.1,
		"P5": 5.2,
		"P10": 5.5,
		"P15": 5.6,
		"P25": 5.9,
		"P50": 6.4,
		"P75": 6.9,
		"P85": 7.2,
		"P90": 7.4,
		"P95": 7.7,
		"P97": 7.9,
		"P99": 8.3,
		"P999": 9.1
	}
];

/***/ }),
/* 10 */
/***/ (function(module, exports) {

module.exports = [
	{
		"Month": 0,
		"L": 0.3487,
		"M": 3.3464,
		"S": 0.14602,
		"P01": 2,
		"P1": 2.3,
		"P3": 2.5,
		"P5": 2.6,
		"P10": 2.8,
		"P15": 2.9,
		"P25": 3,
		"P50": 3.3,
		"P75": 3.7,
		"P85": 3.9,
		"P90": 4,
		"P95": 4.2,
		"P97": 4.3,
		"P99": 4.6,
		"P999": 5.1
	},
	{
		"Month": 1,
		"L": 0.2297,
		"M": 4.4709,
		"S": 0.13395,
		"P01": 2.9,
		"P1": 3.2,
		"P3": 3.4,
		"P5": 3.6,
		"P10": 3.8,
		"P15": 3.9,
		"P25": 4.1,
		"P50": 4.5,
		"P75": 4.9,
		"P85": 5.1,
		"P90": 5.3,
		"P95": 5.5,
		"P97": 5.7,
		"P99": 6,
		"P999": 6.6
	},
	{
		"Month": 2,
		"L": 0.197,
		"M": 5.5675,
		"S": 0.12385,
		"P01": 3.7,
		"P1": 4.1,
		"P3": 4.4,
		"P5": 4.5,
		"P10": 4.7,
		"P15": 4.9,
		"P25": 5.1,
		"P50": 5.6,
		"P75": 6,
		"P85": 6.3,
		"P90": 6.5,
		"P95": 6.8,
		"P97": 7,
		"P99": 7.4,
		"P999": 8.1
	},
	{
		"Month": 3,
		"L": 0.1738,
		"M": 6.3762,
		"S": 0.11727,
		"P01": 4.4,
		"P1": 4.8,
		"P3": 5.1,
		"P5": 5.2,
		"P10": 5.5,
		"P15": 5.6,
		"P25": 5.9,
		"P50": 6.4,
		"P75": 6.9,
		"P85": 7.2,
		"P90": 7.4,
		"P95": 7.7,
		"P97": 7.9,
		"P99": 8.3,
		"P999": 9.1
	},
	{
		"Month": 4,
		"L": 0.1553,
		"M": 7.0023,
		"S": 0.11316,
		"P01": 4.9,
		"P1": 5.4,
		"P3": 5.6,
		"P5": 5.8,
		"P10": 6,
		"P15": 6.2,
		"P25": 6.5,
		"P50": 7,
		"P75": 7.6,
		"P85": 7.9,
		"P90": 8.1,
		"P95": 8.4,
		"P97": 8.6,
		"P99": 9.1,
		"P999": 9.8
	},
	{
		"Month": 5,
		"L": 0.1395,
		"M": 7.5105,
		"S": 0.1108,
		"P01": 5.3,
		"P1": 5.8,
		"P3": 6.1,
		"P5": 6.2,
		"P10": 6.5,
		"P15": 6.7,
		"P25": 7,
		"P50": 7.5,
		"P75": 8.1,
		"P85": 8.4,
		"P90": 8.6,
		"P95": 9,
		"P97": 9.2,
		"P99": 9.7,
		"P999": 10.5
	},
	{
		"Month": 6,
		"L": 0.1257,
		"M": 7.934,
		"S": 0.10958,
		"P01": 5.6,
		"P1": 6.1,
		"P3": 6.4,
		"P5": 6.6,
		"P10": 6.9,
		"P15": 7.1,
		"P25": 7.4,
		"P50": 7.9,
		"P75": 8.5,
		"P85": 8.9,
		"P90": 9.1,
		"P95": 9.5,
		"P97": 9.7,
		"P99": 10.2,
		"P999": 11.1
	},
	{
		"Month": 7,
		"L": 0.1134,
		"M": 8.297,
		"S": 0.10902,
		"P01": 5.9,
		"P1": 6.4,
		"P3": 6.7,
		"P5": 6.9,
		"P10": 7.2,
		"P15": 7.4,
		"P25": 7.7,
		"P50": 8.3,
		"P75": 8.9,
		"P85": 9.3,
		"P90": 9.5,
		"P95": 9.9,
		"P97": 10.2,
		"P99": 10.7,
		"P999": 11.5
	},
	{
		"Month": 8,
		"L": 0.1021,
		"M": 8.6151,
		"S": 0.10882,
		"P01": 6.1,
		"P1": 6.7,
		"P3": 7,
		"P5": 7.2,
		"P10": 7.5,
		"P15": 7.7,
		"P25": 8,
		"P50": 8.6,
		"P75": 9.3,
		"P85": 9.6,
		"P90": 9.9,
		"P95": 10.3,
		"P97": 10.5,
		"P99": 11.1,
		"P999": 12
	},
	{
		"Month": 9,
		"L": 0.0917,
		"M": 8.9014,
		"S": 0.10881,
		"P01": 6.3,
		"P1": 6.9,
		"P3": 7.2,
		"P5": 7.4,
		"P10": 7.7,
		"P15": 7.9,
		"P25": 8.3,
		"P50": 8.9,
		"P75": 9.6,
		"P85": 10,
		"P90": 10.2,
		"P95": 10.6,
		"P97": 10.9,
		"P99": 11.4,
		"P999": 12.4
	},
	{
		"Month": 10,
		"L": 0.082,
		"M": 9.1649,
		"S": 0.10891,
		"P01": 6.5,
		"P1": 7.1,
		"P3": 7.5,
		"P5": 7.7,
		"P10": 8,
		"P15": 8.2,
		"P25": 8.5,
		"P50": 9.2,
		"P75": 9.9,
		"P85": 10.3,
		"P90": 10.5,
		"P95": 10.9,
		"P97": 11.2,
		"P99": 11.8,
		"P999": 12.8
	},
	{
		"Month": 11,
		"L": 0.073,
		"M": 9.4122,
		"S": 0.10906,
		"P01": 6.7,
		"P1": 7.3,
		"P3": 7.7,
		"P5": 7.9,
		"P10": 8.2,
		"P15": 8.4,
		"P25": 8.7,
		"P50": 9.4,
		"P75": 10.1,
		"P85": 10.5,
		"P90": 10.8,
		"P95": 11.2,
		"P97": 11.5,
		"P99": 12.1,
		"P999": 13.1
	},
	{
		"Month": 12,
		"L": 0.0644,
		"M": 9.6479,
		"S": 0.10925,
		"P01": 6.9,
		"P1": 7.5,
		"P3": 7.8,
		"P5": 8.1,
		"P10": 8.4,
		"P15": 8.6,
		"P25": 9,
		"P50": 9.6,
		"P75": 10.4,
		"P85": 10.8,
		"P90": 11.1,
		"P95": 11.5,
		"P97": 11.8,
		"P99": 12.4,
		"P999": 13.5
	},
	{
		"Month": 13,
		"L": 0.0563,
		"M": 9.8749,
		"S": 0.10949,
		"P01": 7,
		"P1": 7.6,
		"P3": 8,
		"P5": 8.2,
		"P10": 8.6,
		"P15": 8.8,
		"P25": 9.2,
		"P50": 9.9,
		"P75": 10.6,
		"P85": 11.1,
		"P90": 11.4,
		"P95": 11.8,
		"P97": 12.1,
		"P99": 12.7,
		"P999": 13.8
	},
	{
		"Month": 14,
		"L": 0.0487,
		"M": 10.0953,
		"S": 0.10976,
		"P01": 7.2,
		"P1": 7.8,
		"P3": 8.2,
		"P5": 8.4,
		"P10": 8.8,
		"P15": 9,
		"P25": 9.4,
		"P50": 10.1,
		"P75": 10.9,
		"P85": 11.3,
		"P90": 11.6,
		"P95": 12.1,
		"P97": 12.4,
		"P99": 13,
		"P999": 14.1
	},
	{
		"Month": 15,
		"L": 0.0413,
		"M": 10.3108,
		"S": 0.11007,
		"P01": 7.3,
		"P1": 8,
		"P3": 8.4,
		"P5": 8.6,
		"P10": 9,
		"P15": 9.2,
		"P25": 9.6,
		"P50": 10.3,
		"P75": 11.1,
		"P85": 11.6,
		"P90": 11.9,
		"P95": 12.3,
		"P97": 12.7,
		"P99": 13.3,
		"P999": 14.5
	},
	{
		"Month": 16,
		"L": 0.0343,
		"M": 10.5228,
		"S": 0.11041,
		"P01": 7.5,
		"P1": 8.1,
		"P3": 8.5,
		"P5": 8.8,
		"P10": 9.1,
		"P15": 9.4,
		"P25": 9.8,
		"P50": 10.5,
		"P75": 11.3,
		"P85": 11.8,
		"P90": 12.1,
		"P95": 12.6,
		"P97": 12.9,
		"P99": 13.6,
		"P999": 14.8
	},
	{
		"Month": 17,
		"L": 0.0275,
		"M": 10.7319,
		"S": 0.11079,
		"P01": 7.6,
		"P1": 8.3,
		"P3": 8.7,
		"P5": 8.9,
		"P10": 9.3,
		"P15": 9.6,
		"P25": 10,
		"P50": 10.7,
		"P75": 11.6,
		"P85": 12,
		"P90": 12.4,
		"P95": 12.9,
		"P97": 13.2,
		"P99": 13.9,
		"P999": 15.1
	},
	{
		"Month": 18,
		"L": 0.0211,
		"M": 10.9385,
		"S": 0.11119,
		"P01": 7.7,
		"P1": 8.4,
		"P3": 8.9,
		"P5": 9.1,
		"P10": 9.5,
		"P15": 9.7,
		"P25": 10.1,
		"P50": 10.9,
		"P75": 11.8,
		"P85": 12.3,
		"P90": 12.6,
		"P95": 13.1,
		"P97": 13.5,
		"P99": 14.2,
		"P999": 15.4
	},
	{
		"Month": 19,
		"L": 0.0148,
		"M": 11.143,
		"S": 0.11164,
		"P01": 7.9,
		"P1": 8.6,
		"P3": 9,
		"P5": 9.3,
		"P10": 9.7,
		"P15": 9.9,
		"P25": 10.3,
		"P50": 11.1,
		"P75": 12,
		"P85": 12.5,
		"P90": 12.9,
		"P95": 13.4,
		"P97": 13.7,
		"P99": 14.4,
		"P999": 15.7
	},
	{
		"Month": 20,
		"L": 0.0087,
		"M": 11.3462,
		"S": 0.11211,
		"P01": 8,
		"P1": 8.7,
		"P3": 9.2,
		"P5": 9.4,
		"P10": 9.8,
		"P15": 10.1,
		"P25": 10.5,
		"P50": 11.3,
		"P75": 12.2,
		"P85": 12.7,
		"P90": 13.1,
		"P95": 13.6,
		"P97": 14,
		"P99": 14.7,
		"P999": 16
	},
	{
		"Month": 21,
		"L": 0.0029,
		"M": 11.5486,
		"S": 0.11261,
		"P01": 8.2,
		"P1": 8.9,
		"P3": 9.3,
		"P5": 9.6,
		"P10": 10,
		"P15": 10.3,
		"P25": 10.7,
		"P50": 11.5,
		"P75": 12.5,
		"P85": 13,
		"P90": 13.3,
		"P95": 13.9,
		"P97": 14.3,
		"P99": 15,
		"P999": 16.4
	},
	{
		"Month": 22,
		"L": -0.0028,
		"M": 11.7504,
		"S": 0.11314,
		"P01": 8.3,
		"P1": 9,
		"P3": 9.5,
		"P5": 9.8,
		"P10": 10.2,
		"P15": 10.5,
		"P25": 10.9,
		"P50": 11.8,
		"P75": 12.7,
		"P85": 13.2,
		"P90": 13.6,
		"P95": 14.2,
		"P97": 14.5,
		"P99": 15.3,
		"P999": 16.7
	},
	{
		"Month": 23,
		"L": -0.0083,
		"M": 11.9514,
		"S": 0.11369,
		"P01": 8.4,
		"P1": 9.2,
		"P3": 9.7,
		"P5": 9.9,
		"P10": 10.3,
		"P15": 10.6,
		"P25": 11.1,
		"P50": 12,
		"P75": 12.9,
		"P85": 13.4,
		"P90": 13.8,
		"P95": 14.4,
		"P97": 14.8,
		"P99": 15.6,
		"P999": 17
	},
	{
		"Month": 24,
		"L": -0.0137,
		"M": 12.1515,
		"S": 0.11426,
		"P01": 8.5,
		"P1": 9.3,
		"P3": 9.8,
		"P5": 10.1,
		"P10": 10.5,
		"P15": 10.8,
		"P25": 11.3,
		"P50": 12.2,
		"P75": 13.1,
		"P85": 13.7,
		"P90": 14.1,
		"P95": 14.7,
		"P97": 15.1,
		"P99": 15.9,
		"P999": 17.3
	}
];

/***/ }),
/* 11 */
/***/ (function(module, exports) {

module.exports = [
	{
		"Month": 25,
		"L": -0.0189,
		"M": 12.3502,
		"S": 0.11485,
		"P01": 8.7,
		"P1": 9.5,
		"P3": 10,
		"P5": 10.2,
		"P10": 10.7,
		"P15": 11,
		"P25": 11.4,
		"P50": 12.4,
		"P75": 13.3,
		"P85": 13.9,
		"P90": 14.3,
		"P95": 14.9,
		"P97": 15.3,
		"P99": 16.1,
		"P999": 17.6
	},
	{
		"Month": 26,
		"L": -0.024,
		"M": 12.5466,
		"S": 0.11544,
		"P01": 8.8,
		"P1": 9.6,
		"P3": 10.1,
		"P5": 10.4,
		"P10": 10.8,
		"P15": 11.1,
		"P25": 11.6,
		"P50": 12.5,
		"P75": 13.6,
		"P85": 14.1,
		"P90": 14.6,
		"P95": 15.2,
		"P97": 15.6,
		"P99": 16.4,
		"P999": 18
	},
	{
		"Month": 27,
		"L": -0.0289,
		"M": 12.7401,
		"S": 0.11604,
		"P01": 8.9,
		"P1": 9.7,
		"P3": 10.2,
		"P5": 10.5,
		"P10": 11,
		"P15": 11.3,
		"P25": 11.8,
		"P50": 12.7,
		"P75": 13.8,
		"P85": 14.4,
		"P90": 14.8,
		"P95": 15.4,
		"P97": 15.9,
		"P99": 16.7,
		"P999": 18.3
	},
	{
		"Month": 28,
		"L": -0.0337,
		"M": 12.9303,
		"S": 0.11664,
		"P01": 9,
		"P1": 9.9,
		"P3": 10.4,
		"P5": 10.7,
		"P10": 11.1,
		"P15": 11.5,
		"P25": 12,
		"P50": 12.9,
		"P75": 14,
		"P85": 14.6,
		"P90": 15,
		"P95": 15.7,
		"P97": 16.1,
		"P99": 17,
		"P999": 18.6
	},
	{
		"Month": 29,
		"L": -0.0385,
		"M": 13.1169,
		"S": 0.11723,
		"P01": 9.2,
		"P1": 10,
		"P3": 10.5,
		"P5": 10.8,
		"P10": 11.3,
		"P15": 11.6,
		"P25": 12.1,
		"P50": 13.1,
		"P75": 14.2,
		"P85": 14.8,
		"P90": 15.2,
		"P95": 15.9,
		"P97": 16.4,
		"P99": 17.3,
		"P999": 18.9
	},
	{
		"Month": 30,
		"L": -0.0431,
		"M": 13.3,
		"S": 0.11781,
		"P01": 9.3,
		"P1": 10.1,
		"P3": 10.7,
		"P5": 11,
		"P10": 11.4,
		"P15": 11.8,
		"P25": 12.3,
		"P50": 13.3,
		"P75": 14.4,
		"P85": 15,
		"P90": 15.5,
		"P95": 16.2,
		"P97": 16.6,
		"P99": 17.5,
		"P999": 19.2
	},
	{
		"Month": 31,
		"L": -0.0476,
		"M": 13.4798,
		"S": 0.11839,
		"P01": 9.4,
		"P1": 10.3,
		"P3": 10.8,
		"P5": 11.1,
		"P10": 11.6,
		"P15": 11.9,
		"P25": 12.4,
		"P50": 13.5,
		"P75": 14.6,
		"P85": 15.2,
		"P90": 15.7,
		"P95": 16.4,
		"P97": 16.9,
		"P99": 17.8,
		"P999": 19.5
	},
	{
		"Month": 32,
		"L": -0.052,
		"M": 13.6567,
		"S": 0.11896,
		"P01": 9.5,
		"P1": 10.4,
		"P3": 10.9,
		"P5": 11.2,
		"P10": 11.7,
		"P15": 12.1,
		"P25": 12.6,
		"P50": 13.7,
		"P75": 14.8,
		"P85": 15.5,
		"P90": 15.9,
		"P95": 16.6,
		"P97": 17.1,
		"P99": 18,
		"P999": 19.8
	},
	{
		"Month": 33,
		"L": -0.0564,
		"M": 13.8309,
		"S": 0.11953,
		"P01": 9.6,
		"P1": 10.5,
		"P3": 11.1,
		"P5": 11.4,
		"P10": 11.9,
		"P15": 12.2,
		"P25": 12.8,
		"P50": 13.8,
		"P75": 15,
		"P85": 15.7,
		"P90": 16.1,
		"P95": 16.9,
		"P97": 17.3,
		"P99": 18.3,
		"P999": 20.1
	},
	{
		"Month": 34,
		"L": -0.0606,
		"M": 14.0031,
		"S": 0.12008,
		"P01": 9.7,
		"P1": 10.6,
		"P3": 11.2,
		"P5": 11.5,
		"P10": 12,
		"P15": 12.4,
		"P25": 12.9,
		"P50": 14,
		"P75": 15.2,
		"P85": 15.9,
		"P90": 16.3,
		"P95": 17.1,
		"P97": 17.6,
		"P99": 18.6,
		"P999": 20.4
	},
	{
		"Month": 35,
		"L": -0.0648,
		"M": 14.1736,
		"S": 0.12062,
		"P01": 9.8,
		"P1": 10.7,
		"P3": 11.3,
		"P5": 11.6,
		"P10": 12.2,
		"P15": 12.5,
		"P25": 13.1,
		"P50": 14.2,
		"P75": 15.4,
		"P85": 16.1,
		"P90": 16.6,
		"P95": 17.3,
		"P97": 17.8,
		"P99": 18.8,
		"P999": 20.7
	},
	{
		"Month": 36,
		"L": -0.0689,
		"M": 14.3429,
		"S": 0.12116,
		"P01": 9.9,
		"P1": 10.8,
		"P3": 11.4,
		"P5": 11.8,
		"P10": 12.3,
		"P15": 12.7,
		"P25": 13.2,
		"P50": 14.3,
		"P75": 15.6,
		"P85": 16.3,
		"P90": 16.8,
		"P95": 17.5,
		"P97": 18,
		"P99": 19.1,
		"P999": 21
	},
	{
		"Month": 37,
		"L": -0.0729,
		"M": 14.5113,
		"S": 0.12168,
		"P01": 10,
		"P1": 11,
		"P3": 11.6,
		"P5": 11.9,
		"P10": 12.4,
		"P15": 12.8,
		"P25": 13.4,
		"P50": 14.5,
		"P75": 15.8,
		"P85": 16.5,
		"P90": 17,
		"P95": 17.8,
		"P97": 18.3,
		"P99": 19.3,
		"P999": 21.2
	},
	{
		"Month": 38,
		"L": -0.0769,
		"M": 14.6791,
		"S": 0.1222,
		"P01": 10.1,
		"P1": 11.1,
		"P3": 11.7,
		"P5": 12,
		"P10": 12.6,
		"P15": 12.9,
		"P25": 13.5,
		"P50": 14.7,
		"P75": 15.9,
		"P85": 16.7,
		"P90": 17.2,
		"P95": 18,
		"P97": 18.5,
		"P99": 19.6,
		"P999": 21.5
	},
	{
		"Month": 39,
		"L": -0.0808,
		"M": 14.8466,
		"S": 0.12271,
		"P01": 10.2,
		"P1": 11.2,
		"P3": 11.8,
		"P5": 12.2,
		"P10": 12.7,
		"P15": 13.1,
		"P25": 13.7,
		"P50": 14.8,
		"P75": 16.1,
		"P85": 16.9,
		"P90": 17.4,
		"P95": 18.2,
		"P97": 18.7,
		"P99": 19.8,
		"P999": 21.8
	},
	{
		"Month": 40,
		"L": -0.0846,
		"M": 15.014,
		"S": 0.12322,
		"P01": 10.3,
		"P1": 11.3,
		"P3": 11.9,
		"P5": 12.3,
		"P10": 12.8,
		"P15": 13.2,
		"P25": 13.8,
		"P50": 15,
		"P75": 16.3,
		"P85": 17.1,
		"P90": 17.6,
		"P95": 18.4,
		"P97": 19,
		"P99": 20.1,
		"P999": 22.1
	},
	{
		"Month": 41,
		"L": -0.0883,
		"M": 15.1813,
		"S": 0.12373,
		"P01": 10.4,
		"P1": 11.4,
		"P3": 12.1,
		"P5": 12.4,
		"P10": 13,
		"P15": 13.4,
		"P25": 14,
		"P50": 15.2,
		"P75": 16.5,
		"P85": 17.3,
		"P90": 17.8,
		"P95": 18.6,
		"P97": 19.2,
		"P99": 20.3,
		"P999": 22.4
	},
	{
		"Month": 42,
		"L": -0.092,
		"M": 15.3486,
		"S": 0.12425,
		"P01": 10.5,
		"P1": 11.5,
		"P3": 12.2,
		"P5": 12.5,
		"P10": 13.1,
		"P15": 13.5,
		"P25": 14.1,
		"P50": 15.3,
		"P75": 16.7,
		"P85": 17.5,
		"P90": 18,
		"P95": 18.9,
		"P97": 19.4,
		"P99": 20.6,
		"P999": 22.7
	},
	{
		"Month": 43,
		"L": -0.0957,
		"M": 15.5158,
		"S": 0.12478,
		"P01": 10.6,
		"P1": 11.7,
		"P3": 12.3,
		"P5": 12.7,
		"P10": 13.2,
		"P15": 13.6,
		"P25": 14.3,
		"P50": 15.5,
		"P75": 16.9,
		"P85": 17.7,
		"P90": 18.2,
		"P95": 19.1,
		"P97": 19.7,
		"P99": 20.8,
		"P999": 23
	},
	{
		"Month": 44,
		"L": -0.0993,
		"M": 15.6828,
		"S": 0.12531,
		"P01": 10.7,
		"P1": 11.8,
		"P3": 12.4,
		"P5": 12.8,
		"P10": 13.4,
		"P15": 13.8,
		"P25": 14.4,
		"P50": 15.7,
		"P75": 17.1,
		"P85": 17.9,
		"P90": 18.4,
		"P95": 19.3,
		"P97": 19.9,
		"P99": 21.1,
		"P999": 23.3
	},
	{
		"Month": 45,
		"L": -0.1028,
		"M": 15.8497,
		"S": 0.12586,
		"P01": 10.8,
		"P1": 11.9,
		"P3": 12.5,
		"P5": 12.9,
		"P10": 13.5,
		"P15": 13.9,
		"P25": 14.6,
		"P50": 15.8,
		"P75": 17.3,
		"P85": 18.1,
		"P90": 18.6,
		"P95": 19.5,
		"P97": 20.1,
		"P99": 21.3,
		"P999": 23.6
	},
	{
		"Month": 46,
		"L": -0.1063,
		"M": 16.0163,
		"S": 0.12643,
		"P01": 10.9,
		"P1": 12,
		"P3": 12.7,
		"P5": 13,
		"P10": 13.6,
		"P15": 14.1,
		"P25": 14.7,
		"P50": 16,
		"P75": 17.4,
		"P85": 18.3,
		"P90": 18.9,
		"P95": 19.8,
		"P97": 20.4,
		"P99": 21.6,
		"P999": 23.9
	},
	{
		"Month": 47,
		"L": -0.1097,
		"M": 16.1827,
		"S": 0.127,
		"P01": 11,
		"P1": 12.1,
		"P3": 12.8,
		"P5": 13.2,
		"P10": 13.8,
		"P15": 14.2,
		"P25": 14.9,
		"P50": 16.2,
		"P75": 17.6,
		"P85": 18.5,
		"P90": 19.1,
		"P95": 20,
		"P97": 20.6,
		"P99": 21.9,
		"P999": 24.2
	},
	{
		"Month": 48,
		"L": -0.1131,
		"M": 16.3489,
		"S": 0.12759,
		"P01": 11.1,
		"P1": 12.2,
		"P3": 12.9,
		"P5": 13.3,
		"P10": 13.9,
		"P15": 14.3,
		"P25": 15,
		"P50": 16.3,
		"P75": 17.8,
		"P85": 18.7,
		"P90": 19.3,
		"P95": 20.2,
		"P97": 20.9,
		"P99": 22.1,
		"P999": 24.5
	},
	{
		"Month": 49,
		"L": -0.1165,
		"M": 16.515,
		"S": 0.12819,
		"P01": 11.2,
		"P1": 12.3,
		"P3": 13,
		"P5": 13.4,
		"P10": 14,
		"P15": 14.5,
		"P25": 15.2,
		"P50": 16.5,
		"P75": 18,
		"P85": 18.9,
		"P90": 19.5,
		"P95": 20.4,
		"P97": 21.1,
		"P99": 22.4,
		"P999": 24.8
	},
	{
		"Month": 50,
		"L": -0.1198,
		"M": 16.6811,
		"S": 0.1288,
		"P01": 11.3,
		"P1": 12.4,
		"P3": 13.1,
		"P5": 13.5,
		"P10": 14.2,
		"P15": 14.6,
		"P25": 15.3,
		"P50": 16.7,
		"P75": 18.2,
		"P85": 19.1,
		"P90": 19.7,
		"P95": 20.7,
		"P97": 21.3,
		"P99": 22.6,
		"P999": 25.1
	},
	{
		"Month": 51,
		"L": -0.123,
		"M": 16.8471,
		"S": 0.12943,
		"P01": 11.4,
		"P1": 12.5,
		"P3": 13.3,
		"P5": 13.7,
		"P10": 14.3,
		"P15": 14.7,
		"P25": 15.4,
		"P50": 16.8,
		"P75": 18.4,
		"P85": 19.3,
		"P90": 19.9,
		"P95": 20.9,
		"P97": 21.6,
		"P99": 22.9,
		"P999": 25.4
	},
	{
		"Month": 52,
		"L": -0.1262,
		"M": 17.0132,
		"S": 0.13005,
		"P01": 11.5,
		"P1": 12.6,
		"P3": 13.4,
		"P5": 13.8,
		"P10": 14.4,
		"P15": 14.9,
		"P25": 15.6,
		"P50": 17,
		"P75": 18.6,
		"P85": 19.5,
		"P90": 20.1,
		"P95": 21.1,
		"P97": 21.8,
		"P99": 23.2,
		"P999": 25.7
	},
	{
		"Month": 53,
		"L": -0.1294,
		"M": 17.1792,
		"S": 0.13069,
		"P01": 11.6,
		"P1": 12.7,
		"P3": 13.5,
		"P5": 13.9,
		"P10": 14.6,
		"P15": 15,
		"P25": 15.7,
		"P50": 17.2,
		"P75": 18.8,
		"P85": 19.7,
		"P90": 20.3,
		"P95": 21.4,
		"P97": 22.1,
		"P99": 23.4,
		"P999": 26
	},
	{
		"Month": 54,
		"L": -0.1325,
		"M": 17.3452,
		"S": 0.13133,
		"P01": 11.7,
		"P1": 12.9,
		"P3": 13.6,
		"P5": 14,
		"P10": 14.7,
		"P15": 15.2,
		"P25": 15.9,
		"P50": 17.3,
		"P75": 19,
		"P85": 19.9,
		"P90": 20.6,
		"P95": 21.6,
		"P97": 22.3,
		"P99": 23.7,
		"P999": 26.3
	},
	{
		"Month": 55,
		"L": -0.1356,
		"M": 17.5111,
		"S": 0.13197,
		"P01": 11.8,
		"P1": 13,
		"P3": 13.7,
		"P5": 14.1,
		"P10": 14.8,
		"P15": 15.3,
		"P25": 16,
		"P50": 17.5,
		"P75": 19.2,
		"P85": 20.1,
		"P90": 20.8,
		"P95": 21.8,
		"P97": 22.5,
		"P99": 24,
		"P999": 26.6
	},
	{
		"Month": 56,
		"L": -0.1387,
		"M": 17.6768,
		"S": 0.13261,
		"P01": 11.9,
		"P1": 13.1,
		"P3": 13.8,
		"P5": 14.3,
		"P10": 14.9,
		"P15": 15.4,
		"P25": 16.2,
		"P50": 17.7,
		"P75": 19.3,
		"P85": 20.3,
		"P90": 21,
		"P95": 22.1,
		"P97": 22.8,
		"P99": 24.2,
		"P999": 27
	},
	{
		"Month": 57,
		"L": -0.1417,
		"M": 17.8422,
		"S": 0.13325,
		"P01": 12,
		"P1": 13.2,
		"P3": 13.9,
		"P5": 14.4,
		"P10": 15.1,
		"P15": 15.6,
		"P25": 16.3,
		"P50": 17.8,
		"P75": 19.5,
		"P85": 20.5,
		"P90": 21.2,
		"P95": 22.3,
		"P97": 23,
		"P99": 24.5,
		"P999": 27.3
	},
	{
		"Month": 58,
		"L": -0.1447,
		"M": 18.0073,
		"S": 0.13389,
		"P01": 12,
		"P1": 13.3,
		"P3": 14.1,
		"P5": 14.5,
		"P10": 15.2,
		"P15": 15.7,
		"P25": 16.5,
		"P50": 18,
		"P75": 19.7,
		"P85": 20.7,
		"P90": 21.4,
		"P95": 22.5,
		"P97": 23.3,
		"P99": 24.8,
		"P999": 27.6
	},
	{
		"Month": 59,
		"L": -0.1477,
		"M": 18.1722,
		"S": 0.13453,
		"P01": 12.1,
		"P1": 13.4,
		"P3": 14.2,
		"P5": 14.6,
		"P10": 15.3,
		"P15": 15.8,
		"P25": 16.6,
		"P50": 18.2,
		"P75": 19.9,
		"P85": 20.9,
		"P90": 21.6,
		"P95": 22.8,
		"P97": 23.5,
		"P99": 25,
		"P999": 27.9
	},
	{
		"Month": 60,
		"L": -0.1506,
		"M": 18.3366,
		"S": 0.13517,
		"P01": 12.2,
		"P1": 13.5,
		"P3": 14.3,
		"P5": 14.7,
		"P10": 15.5,
		"P15": 16,
		"P25": 16.7,
		"P50": 18.3,
		"P75": 20.1,
		"P85": 21.1,
		"P90": 21.9,
		"P95": 23,
		"P97": 23.8,
		"P99": 25.3,
		"P999": 28.2
	}
];

/***/ }),
/* 12 */
/***/ (function(module, exports) {

module.exports = [
	{
		"Week": 0,
		"L": 0.3809,
		"M": 3.2322,
		"S": 0.14171,
		"P01": 2,
		"P1": 2.3,
		"P3": 2.4,
		"P5": 2.5,
		"P10": 2.7,
		"P15": 2.8,
		"P25": 2.9,
		"P50": 3.2,
		"P75": 3.6,
		"P85": 3.7,
		"P90": 3.9,
		"P95": 4,
		"P97": 4.2,
		"P99": 4.4,
		"P999": 4.8
	},
	{
		"Week": 1,
		"L": 0.2671,
		"M": 3.3388,
		"S": 0.146,
		"P01": 2.1,
		"P1": 2.3,
		"P3": 2.5,
		"P5": 2.6,
		"P10": 2.8,
		"P15": 2.9,
		"P25": 3,
		"P50": 3.3,
		"P75": 3.7,
		"P85": 3.9,
		"P90": 4,
		"P95": 4.2,
		"P97": 4.4,
		"P99": 4.6,
		"P999": 5.1
	},
	{
		"Week": 2,
		"L": 0.2304,
		"M": 3.5693,
		"S": 0.14339,
		"P01": 2.2,
		"P1": 2.5,
		"P3": 2.7,
		"P5": 2.8,
		"P10": 3,
		"P15": 3.1,
		"P25": 3.2,
		"P50": 3.6,
		"P75": 3.9,
		"P85": 4.1,
		"P90": 4.3,
		"P95": 4.5,
		"P97": 4.6,
		"P99": 4.9,
		"P999": 5.4
	},
	{
		"Week": 3,
		"L": 0.2024,
		"M": 3.8352,
		"S": 0.1406,
		"P01": 2.4,
		"P1": 2.7,
		"P3": 2.9,
		"P5": 3,
		"P10": 3.2,
		"P15": 3.3,
		"P25": 3.5,
		"P50": 3.8,
		"P75": 4.2,
		"P85": 4.4,
		"P90": 4.6,
		"P95": 4.8,
		"P97": 5,
		"P99": 5.3,
		"P999": 5.8
	},
	{
		"Week": 4,
		"L": 0.1789,
		"M": 4.0987,
		"S": 0.13805,
		"P01": 2.6,
		"P1": 2.9,
		"P3": 3.1,
		"P5": 3.3,
		"P10": 3.4,
		"P15": 3.5,
		"P25": 3.7,
		"P50": 4.1,
		"P75": 4.5,
		"P85": 4.7,
		"P90": 4.9,
		"P95": 5.1,
		"P97": 5.3,
		"P99": 5.6,
		"P999": 6.2
	},
	{
		"Week": 5,
		"L": 0.1582,
		"M": 4.3476,
		"S": 0.13583,
		"P01": 2.8,
		"P1": 3.1,
		"P3": 3.3,
		"P5": 3.5,
		"P10": 3.6,
		"P15": 3.8,
		"P25": 4,
		"P50": 4.3,
		"P75": 4.8,
		"P85": 5,
		"P90": 5.2,
		"P95": 5.4,
		"P97": 5.6,
		"P99": 5.9,
		"P999": 6.5
	},
	{
		"Week": 6,
		"L": 0.1395,
		"M": 4.5793,
		"S": 0.13392,
		"P01": 3,
		"P1": 3.3,
		"P3": 3.5,
		"P5": 3.7,
		"P10": 3.8,
		"P15": 4,
		"P25": 4.2,
		"P50": 4.6,
		"P75": 5,
		"P85": 5.3,
		"P90": 5.4,
		"P95": 5.7,
		"P97": 5.9,
		"P99": 6.2,
		"P999": 6.8
	},
	{
		"Week": 7,
		"L": 0.1224,
		"M": 4.795,
		"S": 0.13228,
		"P01": 3.2,
		"P1": 3.5,
		"P3": 3.7,
		"P5": 3.8,
		"P10": 4,
		"P15": 4.2,
		"P25": 4.4,
		"P50": 4.8,
		"P75": 5.2,
		"P85": 5.5,
		"P90": 5.7,
		"P95": 5.9,
		"P97": 6.1,
		"P99": 6.5,
		"P999": 7.1
	},
	{
		"Week": 8,
		"L": 0.1065,
		"M": 4.9959,
		"S": 0.13087,
		"P01": 3.3,
		"P1": 3.7,
		"P3": 3.9,
		"P5": 4,
		"P10": 4.2,
		"P15": 4.4,
		"P25": 4.6,
		"P50": 5,
		"P75": 5.5,
		"P85": 5.7,
		"P90": 5.9,
		"P95": 6.2,
		"P97": 6.4,
		"P99": 6.7,
		"P999": 7.4
	},
	{
		"Week": 9,
		"L": 0.0918,
		"M": 5.1842,
		"S": 0.12966,
		"P01": 3.4,
		"P1": 3.8,
		"P3": 4.1,
		"P5": 4.2,
		"P10": 4.4,
		"P15": 4.5,
		"P25": 4.7,
		"P50": 5.2,
		"P75": 5.7,
		"P85": 5.9,
		"P90": 6.1,
		"P95": 6.4,
		"P97": 6.6,
		"P99": 7,
		"P999": 7.7
	},
	{
		"Week": 10,
		"L": 0.0779,
		"M": 5.3618,
		"S": 0.12861,
		"P01": 3.6,
		"P1": 4,
		"P3": 4.2,
		"P5": 4.3,
		"P10": 4.5,
		"P15": 4.7,
		"P25": 4.9,
		"P50": 5.4,
		"P75": 5.8,
		"P85": 6.1,
		"P90": 6.3,
		"P95": 6.6,
		"P97": 6.8,
		"P99": 7.2,
		"P999": 7.9
	},
	{
		"Week": 11,
		"L": 0.0648,
		"M": 5.5295,
		"S": 0.1277,
		"P01": 3.7,
		"P1": 4.1,
		"P3": 4.3,
		"P5": 4.5,
		"P10": 4.7,
		"P15": 4.8,
		"P25": 5.1,
		"P50": 5.5,
		"P75": 6,
		"P85": 6.3,
		"P90": 6.5,
		"P95": 6.8,
		"P97": 7,
		"P99": 7.4,
		"P999": 8.2
	},
	{
		"Week": 12,
		"L": 0.0525,
		"M": 5.6883,
		"S": 0.12691,
		"P01": 3.8,
		"P1": 4.2,
		"P3": 4.5,
		"P5": 4.6,
		"P10": 4.8,
		"P15": 5,
		"P25": 5.2,
		"P50": 5.7,
		"P75": 6.2,
		"P85": 6.5,
		"P90": 6.7,
		"P95": 7,
		"P97": 7.2,
		"P99": 7.6,
		"P999": 8.4
	},
	{
		"Week": 13,
		"L": 0.0407,
		"M": 5.8393,
		"S": 0.12622,
		"P01": 3.9,
		"P1": 4.3,
		"P3": 4.6,
		"P5": 4.7,
		"P10": 5,
		"P15": 5.1,
		"P25": 5.4,
		"P50": 5.8,
		"P75": 6.4,
		"P85": 6.7,
		"P90": 6.9,
		"P95": 7.2,
		"P97": 7.4,
		"P99": 7.8,
		"P999": 8.6
	}
];

/***/ }),
/* 13 */
/***/ (function(module, exports) {

module.exports = [
	{
		"Month": 0,
		"L": 0.3809,
		"M": 3.2322,
		"S": 0.14171,
		"P01": 2,
		"P1": 2.3,
		"P3": 2.4,
		"P5": 2.5,
		"P10": 2.7,
		"P15": 2.8,
		"P25": 2.9,
		"P50": 3.2,
		"P75": 3.6,
		"P85": 3.7,
		"P90": 3.9,
		"P95": 4,
		"P97": 4.2,
		"P99": 4.4,
		"P999": 4.8
	},
	{
		"Month": 1,
		"L": 0.1714,
		"M": 4.1873,
		"S": 0.13724,
		"P01": 2.7,
		"P1": 3,
		"P3": 3.2,
		"P5": 3.3,
		"P10": 3.5,
		"P15": 3.6,
		"P25": 3.8,
		"P50": 4.2,
		"P75": 4.6,
		"P85": 4.8,
		"P90": 5,
		"P95": 5.2,
		"P97": 5.4,
		"P99": 5.7,
		"P999": 6.3
	},
	{
		"Month": 2,
		"L": 0.0962,
		"M": 5.1282,
		"S": 0.13,
		"P01": 3.4,
		"P1": 3.8,
		"P3": 4,
		"P5": 4.1,
		"P10": 4.3,
		"P15": 4.5,
		"P25": 4.7,
		"P50": 5.1,
		"P75": 5.6,
		"P85": 5.9,
		"P90": 6,
		"P95": 6.3,
		"P97": 6.5,
		"P99": 6.9,
		"P999": 7.6
	},
	{
		"Month": 3,
		"L": 0.0402,
		"M": 5.8458,
		"S": 0.12619,
		"P01": 3.9,
		"P1": 4.4,
		"P3": 4.6,
		"P5": 4.7,
		"P10": 5,
		"P15": 5.1,
		"P25": 5.4,
		"P50": 5.8,
		"P75": 6.4,
		"P85": 6.7,
		"P90": 6.9,
		"P95": 7.2,
		"P97": 7.4,
		"P99": 7.8,
		"P999": 8.6
	},
	{
		"Month": 4,
		"L": -0.005,
		"M": 6.4237,
		"S": 0.12402,
		"P01": 4.4,
		"P1": 4.8,
		"P3": 5.1,
		"P5": 5.2,
		"P10": 5.5,
		"P15": 5.6,
		"P25": 5.9,
		"P50": 6.4,
		"P75": 7,
		"P85": 7.3,
		"P90": 7.5,
		"P95": 7.9,
		"P97": 8.1,
		"P99": 8.6,
		"P999": 9.4
	},
	{
		"Month": 5,
		"L": -0.043,
		"M": 6.8985,
		"S": 0.12274,
		"P01": 4.7,
		"P1": 5.2,
		"P3": 5.5,
		"P5": 5.6,
		"P10": 5.9,
		"P15": 6.1,
		"P25": 6.4,
		"P50": 6.9,
		"P75": 7.5,
		"P85": 7.8,
		"P90": 8.1,
		"P95": 8.4,
		"P97": 8.7,
		"P99": 9.2,
		"P999": 10.1
	},
	{
		"Month": 6,
		"L": -0.0756,
		"M": 7.297,
		"S": 0.12204,
		"P01": 5,
		"P1": 5.5,
		"P3": 5.8,
		"P5": 6,
		"P10": 6.2,
		"P15": 6.4,
		"P25": 6.7,
		"P50": 7.3,
		"P75": 7.9,
		"P85": 8.3,
		"P90": 8.5,
		"P95": 8.9,
		"P97": 9.2,
		"P99": 9.7,
		"P999": 10.7
	},
	{
		"Month": 7,
		"L": -0.1039,
		"M": 7.6422,
		"S": 0.12178,
		"P01": 5.3,
		"P1": 5.8,
		"P3": 6.1,
		"P5": 6.3,
		"P10": 6.5,
		"P15": 6.7,
		"P25": 7,
		"P50": 7.6,
		"P75": 8.3,
		"P85": 8.7,
		"P90": 8.9,
		"P95": 9.4,
		"P97": 9.6,
		"P99": 10.2,
		"P999": 11.2
	},
	{
		"Month": 8,
		"L": -0.1288,
		"M": 7.9487,
		"S": 0.12181,
		"P01": 5.5,
		"P1": 6,
		"P3": 6.3,
		"P5": 6.5,
		"P10": 6.8,
		"P15": 7,
		"P25": 7.3,
		"P50": 7.9,
		"P75": 8.6,
		"P85": 9,
		"P90": 9.3,
		"P95": 9.7,
		"P97": 10,
		"P99": 10.6,
		"P999": 11.7
	},
	{
		"Month": 9,
		"L": -0.1507,
		"M": 8.2254,
		"S": 0.12199,
		"P01": 5.7,
		"P1": 6.2,
		"P3": 6.6,
		"P5": 6.8,
		"P10": 7,
		"P15": 7.3,
		"P25": 7.6,
		"P50": 8.2,
		"P75": 8.9,
		"P85": 9.3,
		"P90": 9.6,
		"P95": 10.1,
		"P97": 10.4,
		"P99": 11,
		"P999": 12.1
	},
	{
		"Month": 10,
		"L": -0.17,
		"M": 8.48,
		"S": 0.12223,
		"P01": 5.9,
		"P1": 6.4,
		"P3": 6.8,
		"P5": 7,
		"P10": 7.3,
		"P15": 7.5,
		"P25": 7.8,
		"P50": 8.5,
		"P75": 9.2,
		"P85": 9.6,
		"P90": 9.9,
		"P95": 10.4,
		"P97": 10.7,
		"P99": 11.3,
		"P999": 12.5
	},
	{
		"Month": 11,
		"L": -0.1872,
		"M": 8.7192,
		"S": 0.12247,
		"P01": 6,
		"P1": 6.6,
		"P3": 7,
		"P5": 7.2,
		"P10": 7.5,
		"P15": 7.7,
		"P25": 8,
		"P50": 8.7,
		"P75": 9.5,
		"P85": 9.9,
		"P90": 10.2,
		"P95": 10.7,
		"P97": 11,
		"P99": 11.7,
		"P999": 12.9
	},
	{
		"Month": 12,
		"L": -0.2024,
		"M": 8.9481,
		"S": 0.12268,
		"P01": 6.2,
		"P1": 6.8,
		"P3": 7.1,
		"P5": 7.3,
		"P10": 7.7,
		"P15": 7.9,
		"P25": 8.2,
		"P50": 8.9,
		"P75": 9.7,
		"P85": 10.2,
		"P90": 10.5,
		"P95": 11,
		"P97": 11.3,
		"P99": 12,
		"P999": 13.3
	},
	{
		"Month": 13,
		"L": -0.2158,
		"M": 9.1699,
		"S": 0.12283,
		"P01": 6.4,
		"P1": 6.9,
		"P3": 7.3,
		"P5": 7.5,
		"P10": 7.9,
		"P15": 8.1,
		"P25": 8.4,
		"P50": 9.2,
		"P75": 10,
		"P85": 10.4,
		"P90": 10.8,
		"P95": 11.3,
		"P97": 11.6,
		"P99": 12.3,
		"P999": 13.6
	},
	{
		"Month": 14,
		"L": -0.2278,
		"M": 9.387,
		"S": 0.12294,
		"P01": 6.5,
		"P1": 7.1,
		"P3": 7.5,
		"P5": 7.7,
		"P10": 8,
		"P15": 8.3,
		"P25": 8.6,
		"P50": 9.4,
		"P75": 10.2,
		"P85": 10.7,
		"P90": 11,
		"P95": 11.5,
		"P97": 11.9,
		"P99": 12.6,
		"P999": 14
	},
	{
		"Month": 15,
		"L": -0.2384,
		"M": 9.6008,
		"S": 0.12299,
		"P01": 6.7,
		"P1": 7.3,
		"P3": 7.7,
		"P5": 7.9,
		"P10": 8.2,
		"P15": 8.5,
		"P25": 8.8,
		"P50": 9.6,
		"P75": 10.4,
		"P85": 10.9,
		"P90": 11.3,
		"P95": 11.8,
		"P97": 12.2,
		"P99": 12.9,
		"P999": 14.3
	},
	{
		"Month": 16,
		"L": -0.2478,
		"M": 9.8124,
		"S": 0.12303,
		"P01": 6.8,
		"P1": 7.4,
		"P3": 7.8,
		"P5": 8.1,
		"P10": 8.4,
		"P15": 8.7,
		"P25": 9,
		"P50": 9.8,
		"P75": 10.7,
		"P85": 11.2,
		"P90": 11.5,
		"P95": 12.1,
		"P97": 12.5,
		"P99": 13.2,
		"P999": 14.6
	},
	{
		"Month": 17,
		"L": -0.2562,
		"M": 10.0226,
		"S": 0.12306,
		"P01": 7,
		"P1": 7.6,
		"P3": 8,
		"P5": 8.2,
		"P10": 8.6,
		"P15": 8.8,
		"P25": 9.2,
		"P50": 10,
		"P75": 10.9,
		"P85": 11.4,
		"P90": 11.8,
		"P95": 12.3,
		"P97": 12.7,
		"P99": 13.5,
		"P999": 15
	},
	{
		"Month": 18,
		"L": -0.2637,
		"M": 10.2315,
		"S": 0.12309,
		"P01": 7.1,
		"P1": 7.8,
		"P3": 8.2,
		"P5": 8.4,
		"P10": 8.8,
		"P15": 9,
		"P25": 9.4,
		"P50": 10.2,
		"P75": 11.1,
		"P85": 11.6,
		"P90": 12,
		"P95": 12.6,
		"P97": 13,
		"P99": 13.8,
		"P999": 15.3
	},
	{
		"Month": 19,
		"L": -0.2703,
		"M": 10.4393,
		"S": 0.12315,
		"P01": 7.3,
		"P1": 7.9,
		"P3": 8.3,
		"P5": 8.6,
		"P10": 8.9,
		"P15": 9.2,
		"P25": 9.6,
		"P50": 10.4,
		"P75": 11.4,
		"P85": 11.9,
		"P90": 12.3,
		"P95": 12.9,
		"P97": 13.3,
		"P99": 14.1,
		"P999": 15.6
	},
	{
		"Month": 20,
		"L": -0.2762,
		"M": 10.6464,
		"S": 0.12323,
		"P01": 7.4,
		"P1": 8.1,
		"P3": 8.5,
		"P5": 8.7,
		"P10": 9.1,
		"P15": 9.4,
		"P25": 9.8,
		"P50": 10.6,
		"P75": 11.6,
		"P85": 12.1,
		"P90": 12.5,
		"P95": 13.1,
		"P97": 13.5,
		"P99": 14.4,
		"P999": 15.9
	},
	{
		"Month": 21,
		"L": -0.2815,
		"M": 10.8534,
		"S": 0.12335,
		"P01": 7.6,
		"P1": 8.2,
		"P3": 8.7,
		"P5": 8.9,
		"P10": 9.3,
		"P15": 9.6,
		"P25": 10,
		"P50": 10.9,
		"P75": 11.8,
		"P85": 12.4,
		"P90": 12.8,
		"P95": 13.4,
		"P97": 13.8,
		"P99": 14.6,
		"P999": 16.2
	},
	{
		"Month": 22,
		"L": -0.2862,
		"M": 11.0608,
		"S": 0.1235,
		"P01": 7.7,
		"P1": 8.4,
		"P3": 8.8,
		"P5": 9.1,
		"P10": 9.5,
		"P15": 9.8,
		"P25": 10.2,
		"P50": 11.1,
		"P75": 12,
		"P85": 12.6,
		"P90": 13,
		"P95": 13.6,
		"P97": 14.1,
		"P99": 14.9,
		"P999": 16.6
	},
	{
		"Month": 23,
		"L": -0.2903,
		"M": 11.2688,
		"S": 0.12369,
		"P01": 7.8,
		"P1": 8.5,
		"P3": 9,
		"P5": 9.2,
		"P10": 9.7,
		"P15": 9.9,
		"P25": 10.4,
		"P50": 11.3,
		"P75": 12.3,
		"P85": 12.8,
		"P90": 13.3,
		"P95": 13.9,
		"P97": 14.3,
		"P99": 15.2,
		"P999": 16.9
	},
	{
		"Month": 24,
		"L": -0.2941,
		"M": 11.4775,
		"S": 0.1239,
		"P01": 8,
		"P1": 8.7,
		"P3": 9.2,
		"P5": 9.4,
		"P10": 9.8,
		"P15": 10.1,
		"P25": 10.6,
		"P50": 11.5,
		"P75": 12.5,
		"P85": 13.1,
		"P90": 13.5,
		"P95": 14.2,
		"P97": 14.6,
		"P99": 15.5,
		"P999": 17.2
	}
];

/***/ }),
/* 14 */
/***/ (function(module, exports) {

module.exports = [
	{
		"Month": 25,
		"L": -0.2975,
		"M": 11.6864,
		"S": 0.12414,
		"P01": 8.1,
		"P1": 8.9,
		"P3": 9.3,
		"P5": 9.6,
		"P10": 10,
		"P15": 10.3,
		"P25": 10.8,
		"P50": 11.7,
		"P75": 12.7,
		"P85": 13.3,
		"P90": 13.8,
		"P95": 14.4,
		"P97": 14.9,
		"P99": 15.8,
		"P999": 17.6
	},
	{
		"Month": 26,
		"L": -0.3005,
		"M": 11.8947,
		"S": 0.12441,
		"P01": 8.3,
		"P1": 9,
		"P3": 9.5,
		"P5": 9.8,
		"P10": 10.2,
		"P15": 10.5,
		"P25": 10.9,
		"P50": 11.9,
		"P75": 12.9,
		"P85": 13.6,
		"P90": 14,
		"P95": 14.7,
		"P97": 15.2,
		"P99": 16.1,
		"P999": 17.9
	},
	{
		"Month": 27,
		"L": -0.3032,
		"M": 12.1015,
		"S": 0.12472,
		"P01": 8.4,
		"P1": 9.2,
		"P3": 9.6,
		"P5": 9.9,
		"P10": 10.4,
		"P15": 10.7,
		"P25": 11.1,
		"P50": 12.1,
		"P75": 13.2,
		"P85": 13.8,
		"P90": 14.3,
		"P95": 15,
		"P97": 15.4,
		"P99": 16.4,
		"P999": 18.2
	},
	{
		"Month": 28,
		"L": -0.3057,
		"M": 12.3059,
		"S": 0.12506,
		"P01": 8.5,
		"P1": 9.3,
		"P3": 9.8,
		"P5": 10.1,
		"P10": 10.5,
		"P15": 10.8,
		"P25": 11.3,
		"P50": 12.3,
		"P75": 13.4,
		"P85": 14,
		"P90": 14.5,
		"P95": 15.2,
		"P97": 15.7,
		"P99": 16.7,
		"P999": 18.6
	},
	{
		"Month": 29,
		"L": -0.308,
		"M": 12.5073,
		"S": 0.12545,
		"P01": 8.7,
		"P1": 9.5,
		"P3": 10,
		"P5": 10.2,
		"P10": 10.7,
		"P15": 11,
		"P25": 11.5,
		"P50": 12.5,
		"P75": 13.6,
		"P85": 14.3,
		"P90": 14.7,
		"P95": 15.5,
		"P97": 16,
		"P99": 17,
		"P999": 18.9
	},
	{
		"Month": 30,
		"L": -0.3101,
		"M": 12.7055,
		"S": 0.12587,
		"P01": 8.8,
		"P1": 9.6,
		"P3": 10.1,
		"P5": 10.4,
		"P10": 10.9,
		"P15": 11.2,
		"P25": 11.7,
		"P50": 12.7,
		"P75": 13.8,
		"P85": 14.5,
		"P90": 15,
		"P95": 15.7,
		"P97": 16.2,
		"P99": 17.3,
		"P999": 19.2
	},
	{
		"Month": 31,
		"L": -0.312,
		"M": 12.9006,
		"S": 0.12633,
		"P01": 8.9,
		"P1": 9.7,
		"P3": 10.3,
		"P5": 10.5,
		"P10": 11,
		"P15": 11.3,
		"P25": 11.9,
		"P50": 12.9,
		"P75": 14.1,
		"P85": 14.7,
		"P90": 15.2,
		"P95": 16,
		"P97": 16.5,
		"P99": 17.6,
		"P999": 19.6
	},
	{
		"Month": 32,
		"L": -0.3138,
		"M": 13.093,
		"S": 0.12683,
		"P01": 9,
		"P1": 9.9,
		"P3": 10.4,
		"P5": 10.7,
		"P10": 11.2,
		"P15": 11.5,
		"P25": 12,
		"P50": 13.1,
		"P75": 14.3,
		"P85": 15,
		"P90": 15.5,
		"P95": 16.2,
		"P97": 16.8,
		"P99": 17.8,
		"P999": 19.9
	},
	{
		"Month": 33,
		"L": -0.3155,
		"M": 13.2837,
		"S": 0.12737,
		"P01": 9.2,
		"P1": 10,
		"P3": 10.5,
		"P5": 10.8,
		"P10": 11.3,
		"P15": 11.7,
		"P25": 12.2,
		"P50": 13.3,
		"P75": 14.5,
		"P85": 15.2,
		"P90": 15.7,
		"P95": 16.5,
		"P97": 17,
		"P99": 18.1,
		"P999": 20.2
	},
	{
		"Month": 34,
		"L": -0.3171,
		"M": 13.4731,
		"S": 0.12794,
		"P01": 9.3,
		"P1": 10.1,
		"P3": 10.7,
		"P5": 11,
		"P10": 11.5,
		"P15": 11.8,
		"P25": 12.4,
		"P50": 13.5,
		"P75": 14.7,
		"P85": 15.4,
		"P90": 15.9,
		"P95": 16.8,
		"P97": 17.3,
		"P99": 18.4,
		"P999": 20.6
	},
	{
		"Month": 35,
		"L": -0.3186,
		"M": 13.6618,
		"S": 0.12855,
		"P01": 9.4,
		"P1": 10.3,
		"P3": 10.8,
		"P5": 11.1,
		"P10": 11.6,
		"P15": 12,
		"P25": 12.5,
		"P50": 13.7,
		"P75": 14.9,
		"P85": 15.7,
		"P90": 16.2,
		"P95": 17,
		"P97": 17.6,
		"P99": 18.7,
		"P999": 20.9
	},
	{
		"Month": 36,
		"L": -0.3201,
		"M": 13.8503,
		"S": 0.12919,
		"P01": 9.5,
		"P1": 10.4,
		"P3": 11,
		"P5": 11.3,
		"P10": 11.8,
		"P15": 12.1,
		"P25": 12.7,
		"P50": 13.9,
		"P75": 15.1,
		"P85": 15.9,
		"P90": 16.4,
		"P95": 17.3,
		"P97": 17.8,
		"P99": 19,
		"P999": 21.2
	},
	{
		"Month": 37,
		"L": -0.3216,
		"M": 14.0385,
		"S": 0.12988,
		"P01": 9.6,
		"P1": 10.5,
		"P3": 11.1,
		"P5": 11.4,
		"P10": 11.9,
		"P15": 12.3,
		"P25": 12.9,
		"P50": 14,
		"P75": 15.3,
		"P85": 16.1,
		"P90": 16.7,
		"P95": 17.5,
		"P97": 18.1,
		"P99": 19.3,
		"P999": 21.6
	},
	{
		"Month": 38,
		"L": -0.323,
		"M": 14.2265,
		"S": 0.13059,
		"P01": 9.7,
		"P1": 10.6,
		"P3": 11.2,
		"P5": 11.6,
		"P10": 12.1,
		"P15": 12.5,
		"P25": 13,
		"P50": 14.2,
		"P75": 15.6,
		"P85": 16.3,
		"P90": 16.9,
		"P95": 17.8,
		"P97": 18.4,
		"P99": 19.6,
		"P999": 21.9
	},
	{
		"Month": 39,
		"L": -0.3243,
		"M": 14.414,
		"S": 0.13135,
		"P01": 9.8,
		"P1": 10.8,
		"P3": 11.4,
		"P5": 11.7,
		"P10": 12.2,
		"P15": 12.6,
		"P25": 13.2,
		"P50": 14.4,
		"P75": 15.8,
		"P85": 16.6,
		"P90": 17.1,
		"P95": 18,
		"P97": 18.6,
		"P99": 19.9,
		"P999": 22.3
	},
	{
		"Month": 40,
		"L": -0.3257,
		"M": 14.601,
		"S": 0.13213,
		"P01": 10,
		"P1": 10.9,
		"P3": 11.5,
		"P5": 11.8,
		"P10": 12.4,
		"P15": 12.8,
		"P25": 13.4,
		"P50": 14.6,
		"P75": 16,
		"P85": 16.8,
		"P90": 17.4,
		"P95": 18.3,
		"P97": 18.9,
		"P99": 20.2,
		"P999": 22.6
	},
	{
		"Month": 41,
		"L": -0.327,
		"M": 14.7873,
		"S": 0.13293,
		"P01": 10.1,
		"P1": 11,
		"P3": 11.6,
		"P5": 12,
		"P10": 12.5,
		"P15": 12.9,
		"P25": 13.5,
		"P50": 14.8,
		"P75": 16.2,
		"P85": 17,
		"P90": 17.6,
		"P95": 18.6,
		"P97": 19.2,
		"P99": 20.5,
		"P999": 23
	},
	{
		"Month": 42,
		"L": -0.3283,
		"M": 14.9727,
		"S": 0.13376,
		"P01": 10.2,
		"P1": 11.1,
		"P3": 11.8,
		"P5": 12.1,
		"P10": 12.7,
		"P15": 13.1,
		"P25": 13.7,
		"P50": 15,
		"P75": 16.4,
		"P85": 17.3,
		"P90": 17.9,
		"P95": 18.8,
		"P97": 19.5,
		"P99": 20.8,
		"P999": 23.3
	},
	{
		"Month": 43,
		"L": -0.3296,
		"M": 15.1573,
		"S": 0.1346,
		"P01": 10.3,
		"P1": 11.3,
		"P3": 11.9,
		"P5": 12.2,
		"P10": 12.8,
		"P15": 13.2,
		"P25": 13.9,
		"P50": 15.2,
		"P75": 16.6,
		"P85": 17.5,
		"P90": 18.1,
		"P95": 19.1,
		"P97": 19.7,
		"P99": 21.1,
		"P999": 23.7
	},
	{
		"Month": 44,
		"L": -0.3309,
		"M": 15.341,
		"S": 0.13545,
		"P01": 10.4,
		"P1": 11.4,
		"P3": 12,
		"P5": 12.4,
		"P10": 13,
		"P15": 13.4,
		"P25": 14,
		"P50": 15.3,
		"P75": 16.8,
		"P85": 17.7,
		"P90": 18.3,
		"P95": 19.3,
		"P97": 20,
		"P99": 21.4,
		"P999": 24.1
	},
	{
		"Month": 45,
		"L": -0.3322,
		"M": 15.524,
		"S": 0.1363,
		"P01": 10.5,
		"P1": 11.5,
		"P3": 12.1,
		"P5": 12.5,
		"P10": 13.1,
		"P15": 13.5,
		"P25": 14.2,
		"P50": 15.5,
		"P75": 17,
		"P85": 17.9,
		"P90": 18.6,
		"P95": 19.6,
		"P97": 20.3,
		"P99": 21.7,
		"P999": 24.4
	},
	{
		"Month": 46,
		"L": -0.3335,
		"M": 15.7064,
		"S": 0.13716,
		"P01": 10.6,
		"P1": 11.6,
		"P3": 12.3,
		"P5": 12.6,
		"P10": 13.2,
		"P15": 13.7,
		"P25": 14.3,
		"P50": 15.7,
		"P75": 17.3,
		"P85": 18.2,
		"P90": 18.8,
		"P95": 19.9,
		"P97": 20.6,
		"P99": 22,
		"P999": 24.8
	},
	{
		"Month": 47,
		"L": -0.3348,
		"M": 15.8882,
		"S": 0.138,
		"P01": 10.7,
		"P1": 11.7,
		"P3": 12.4,
		"P5": 12.8,
		"P10": 13.4,
		"P15": 13.8,
		"P25": 14.5,
		"P50": 15.9,
		"P75": 17.5,
		"P85": 18.4,
		"P90": 19.1,
		"P95": 20.1,
		"P97": 20.8,
		"P99": 22.3,
		"P999": 25.2
	},
	{
		"Month": 48,
		"L": -0.3361,
		"M": 16.0697,
		"S": 0.13884,
		"P01": 10.8,
		"P1": 11.8,
		"P3": 12.5,
		"P5": 12.9,
		"P10": 13.5,
		"P15": 14,
		"P25": 14.7,
		"P50": 16.1,
		"P75": 17.7,
		"P85": 18.6,
		"P90": 19.3,
		"P95": 20.4,
		"P97": 21.1,
		"P99": 22.6,
		"P999": 25.5
	},
	{
		"Month": 49,
		"L": -0.3374,
		"M": 16.2511,
		"S": 0.13968,
		"P01": 10.9,
		"P1": 11.9,
		"P3": 12.6,
		"P5": 13,
		"P10": 13.7,
		"P15": 14.1,
		"P25": 14.8,
		"P50": 16.3,
		"P75": 17.9,
		"P85": 18.9,
		"P90": 19.5,
		"P95": 20.6,
		"P97": 21.4,
		"P99": 22.9,
		"P999": 25.9
	},
	{
		"Month": 50,
		"L": -0.3387,
		"M": 16.4322,
		"S": 0.14051,
		"P01": 11,
		"P1": 12.1,
		"P3": 12.8,
		"P5": 13.2,
		"P10": 13.8,
		"P15": 14.3,
		"P25": 15,
		"P50": 16.4,
		"P75": 18.1,
		"P85": 19.1,
		"P90": 19.8,
		"P95": 20.9,
		"P97": 21.7,
		"P99": 23.2,
		"P999": 26.3
	},
	{
		"Month": 51,
		"L": -0.34,
		"M": 16.6133,
		"S": 0.14132,
		"P01": 11.1,
		"P1": 12.2,
		"P3": 12.9,
		"P5": 13.3,
		"P10": 13.9,
		"P15": 14.4,
		"P25": 15.1,
		"P50": 16.6,
		"P75": 18.3,
		"P85": 19.3,
		"P90": 20,
		"P95": 21.2,
		"P97": 22,
		"P99": 23.5,
		"P999": 26.7
	},
	{
		"Month": 52,
		"L": -0.3414,
		"M": 16.7942,
		"S": 0.14213,
		"P01": 11.2,
		"P1": 12.3,
		"P3": 13,
		"P5": 13.4,
		"P10": 14.1,
		"P15": 14.5,
		"P25": 15.3,
		"P50": 16.8,
		"P75": 18.5,
		"P85": 19.5,
		"P90": 20.3,
		"P95": 21.4,
		"P97": 22.2,
		"P99": 23.9,
		"P999": 27
	},
	{
		"Month": 53,
		"L": -0.3427,
		"M": 16.9748,
		"S": 0.14293,
		"P01": 11.3,
		"P1": 12.4,
		"P3": 13.1,
		"P5": 13.5,
		"P10": 14.2,
		"P15": 14.7,
		"P25": 15.4,
		"P50": 17,
		"P75": 18.7,
		"P85": 19.8,
		"P90": 20.5,
		"P95": 21.7,
		"P97": 22.5,
		"P99": 24.2,
		"P999": 27.4
	},
	{
		"Month": 54,
		"L": -0.344,
		"M": 17.1551,
		"S": 0.14371,
		"P01": 11.3,
		"P1": 12.5,
		"P3": 13.2,
		"P5": 13.7,
		"P10": 14.3,
		"P15": 14.8,
		"P25": 15.6,
		"P50": 17.2,
		"P75": 18.9,
		"P85": 20,
		"P90": 20.8,
		"P95": 22,
		"P97": 22.8,
		"P99": 24.5,
		"P999": 27.8
	},
	{
		"Month": 55,
		"L": -0.3453,
		"M": 17.3347,
		"S": 0.14448,
		"P01": 11.4,
		"P1": 12.6,
		"P3": 13.4,
		"P5": 13.8,
		"P10": 14.5,
		"P15": 15,
		"P25": 15.8,
		"P50": 17.3,
		"P75": 19.1,
		"P85": 20.2,
		"P90": 21,
		"P95": 22.2,
		"P97": 23.1,
		"P99": 24.8,
		"P999": 28.2
	},
	{
		"Month": 56,
		"L": -0.3466,
		"M": 17.5136,
		"S": 0.14525,
		"P01": 11.5,
		"P1": 12.7,
		"P3": 13.5,
		"P5": 13.9,
		"P10": 14.6,
		"P15": 15.1,
		"P25": 15.9,
		"P50": 17.5,
		"P75": 19.3,
		"P85": 20.4,
		"P90": 21.2,
		"P95": 22.5,
		"P97": 23.3,
		"P99": 25.1,
		"P999": 28.5
	},
	{
		"Month": 57,
		"L": -0.3479,
		"M": 17.6916,
		"S": 0.146,
		"P01": 11.6,
		"P1": 12.8,
		"P3": 13.6,
		"P5": 14,
		"P10": 14.8,
		"P15": 15.3,
		"P25": 16.1,
		"P50": 17.7,
		"P75": 19.6,
		"P85": 20.7,
		"P90": 21.5,
		"P95": 22.7,
		"P97": 23.6,
		"P99": 25.4,
		"P999": 28.9
	},
	{
		"Month": 58,
		"L": -0.3492,
		"M": 17.8686,
		"S": 0.14675,
		"P01": 11.7,
		"P1": 12.9,
		"P3": 13.7,
		"P5": 14.2,
		"P10": 14.9,
		"P15": 15.4,
		"P25": 16.2,
		"P50": 17.9,
		"P75": 19.8,
		"P85": 20.9,
		"P90": 21.7,
		"P95": 23,
		"P97": 23.9,
		"P99": 25.7,
		"P999": 29.3
	},
	{
		"Month": 59,
		"L": -0.3505,
		"M": 18.0445,
		"S": 0.14748,
		"P01": 11.8,
		"P1": 13.1,
		"P3": 13.8,
		"P5": 14.3,
		"P10": 15,
		"P15": 15.5,
		"P25": 16.4,
		"P50": 18,
		"P75": 20,
		"P85": 21.1,
		"P90": 21.9,
		"P95": 23.3,
		"P97": 24.2,
		"P99": 26,
		"P999": 29.6
	},
	{
		"Month": 60,
		"L": -0.3518,
		"M": 18.2193,
		"S": 0.14821,
		"P01": 11.9,
		"P1": 13.2,
		"P3": 14,
		"P5": 14.4,
		"P10": 15.2,
		"P15": 15.7,
		"P25": 16.5,
		"P50": 18.2,
		"P75": 20.2,
		"P85": 21.3,
		"P90": 22.2,
		"P95": 23.5,
		"P97": 24.4,
		"P99": 26.3,
		"P999": 30
	}
];

/***/ }),
/* 15 */
/***/ (function(module, exports) {

module.exports = [
	{
		"Length": 45,
		"L": -0.3521,
		"M": 2.441,
		"S": 0.09182,
		"P01": 1.9,
		"P1": 2,
		"P3": 2.1,
		"P5": 2.1,
		"P10": 2.2,
		"P15": 2.2,
		"P25": 2.3,
		"P50": 2.4,
		"P75": 2.6,
		"P85": 2.7,
		"P90": 2.8,
		"P95": 2.9,
		"P97": 2.9,
		"P99": 3,
		"P999": 3.3
	},
	{
		"Length": 45.5,
		"L": -0.3521,
		"M": 2.5244,
		"S": 0.09153,
		"P01": 1.9,
		"P1": 2.1,
		"P3": 2.1,
		"P5": 2.2,
		"P10": 2.3,
		"P15": 2.3,
		"P25": 2.4,
		"P50": 2.5,
		"P75": 2.7,
		"P85": 2.8,
		"P90": 2.8,
		"P95": 2.9,
		"P97": 3,
		"P99": 3.1,
		"P999": 3.4
	},
	{
		"Length": 46,
		"L": -0.3521,
		"M": 2.6077,
		"S": 0.09124,
		"P01": 2,
		"P1": 2.1,
		"P3": 2.2,
		"P5": 2.3,
		"P10": 2.3,
		"P15": 2.4,
		"P25": 2.5,
		"P50": 2.6,
		"P75": 2.8,
		"P85": 2.9,
		"P90": 2.9,
		"P95": 3,
		"P97": 3.1,
		"P99": 3.3,
		"P999": 3.5
	},
	{
		"Length": 46.5,
		"L": -0.3521,
		"M": 2.6913,
		"S": 0.09094,
		"P01": 2.1,
		"P1": 2.2,
		"P3": 2.3,
		"P5": 2.3,
		"P10": 2.4,
		"P15": 2.5,
		"P25": 2.5,
		"P50": 2.7,
		"P75": 2.9,
		"P85": 3,
		"P90": 3,
		"P95": 3.1,
		"P97": 3.2,
		"P99": 3.4,
		"P999": 3.6
	},
	{
		"Length": 47,
		"L": -0.3521,
		"M": 2.7755,
		"S": 0.09065,
		"P01": 2.1,
		"P1": 2.3,
		"P3": 2.4,
		"P5": 2.4,
		"P10": 2.5,
		"P15": 2.5,
		"P25": 2.6,
		"P50": 2.8,
		"P75": 3,
		"P85": 3.1,
		"P90": 3.1,
		"P95": 3.2,
		"P97": 3.3,
		"P99": 3.5,
		"P999": 3.7
	},
	{
		"Length": 47.5,
		"L": -0.3521,
		"M": 2.8609,
		"S": 0.09036,
		"P01": 2.2,
		"P1": 2.3,
		"P3": 2.4,
		"P5": 2.5,
		"P10": 2.6,
		"P15": 2.6,
		"P25": 2.7,
		"P50": 2.9,
		"P75": 3,
		"P85": 3.1,
		"P90": 3.2,
		"P95": 3.3,
		"P97": 3.4,
		"P99": 3.6,
		"P999": 3.8
	},
	{
		"Length": 48,
		"L": -0.3521,
		"M": 2.948,
		"S": 0.09007,
		"P01": 2.3,
		"P1": 2.4,
		"P3": 2.5,
		"P5": 2.6,
		"P10": 2.6,
		"P15": 2.7,
		"P25": 2.8,
		"P50": 2.9,
		"P75": 3.1,
		"P85": 3.2,
		"P90": 3.3,
		"P95": 3.4,
		"P97": 3.5,
		"P99": 3.7,
		"P999": 4
	},
	{
		"Length": 48.5,
		"L": -0.3521,
		"M": 3.0377,
		"S": 0.08977,
		"P01": 2.3,
		"P1": 2.5,
		"P3": 2.6,
		"P5": 2.6,
		"P10": 2.7,
		"P15": 2.8,
		"P25": 2.9,
		"P50": 3,
		"P75": 3.2,
		"P85": 3.3,
		"P90": 3.4,
		"P95": 3.5,
		"P97": 3.6,
		"P99": 3.8,
		"P999": 4.1
	},
	{
		"Length": 49,
		"L": -0.3521,
		"M": 3.1308,
		"S": 0.08948,
		"P01": 2.4,
		"P1": 2.6,
		"P3": 2.7,
		"P5": 2.7,
		"P10": 2.8,
		"P15": 2.9,
		"P25": 2.9,
		"P50": 3.1,
		"P75": 3.3,
		"P85": 3.4,
		"P90": 3.5,
		"P95": 3.6,
		"P97": 3.7,
		"P99": 3.9,
		"P999": 4.2
	},
	{
		"Length": 49.5,
		"L": -0.3521,
		"M": 3.2276,
		"S": 0.08919,
		"P01": 2.5,
		"P1": 2.6,
		"P3": 2.7,
		"P5": 2.8,
		"P10": 2.9,
		"P15": 2.9,
		"P25": 3,
		"P50": 3.2,
		"P75": 3.4,
		"P85": 3.5,
		"P90": 3.6,
		"P95": 3.8,
		"P97": 3.8,
		"P99": 4,
		"P999": 4.3
	},
	{
		"Length": 50,
		"L": -0.3521,
		"M": 3.3278,
		"S": 0.0889,
		"P01": 2.6,
		"P1": 2.7,
		"P3": 2.8,
		"P5": 2.9,
		"P10": 3,
		"P15": 3,
		"P25": 3.1,
		"P50": 3.3,
		"P75": 3.5,
		"P85": 3.7,
		"P90": 3.7,
		"P95": 3.9,
		"P97": 4,
		"P99": 4.1,
		"P999": 4.4
	},
	{
		"Length": 50.5,
		"L": -0.3521,
		"M": 3.4311,
		"S": 0.08861,
		"P01": 2.6,
		"P1": 2.8,
		"P3": 2.9,
		"P5": 3,
		"P10": 3.1,
		"P15": 3.1,
		"P25": 3.2,
		"P50": 3.4,
		"P75": 3.6,
		"P85": 3.8,
		"P90": 3.9,
		"P95": 4,
		"P97": 4.1,
		"P99": 4.2,
		"P999": 4.6
	},
	{
		"Length": 51,
		"L": -0.3521,
		"M": 3.5376,
		"S": 0.08831,
		"P01": 2.7,
		"P1": 2.9,
		"P3": 3,
		"P5": 3.1,
		"P10": 3.2,
		"P15": 3.2,
		"P25": 3.3,
		"P50": 3.5,
		"P75": 3.8,
		"P85": 3.9,
		"P90": 4,
		"P95": 4.1,
		"P97": 4.2,
		"P99": 4.4,
		"P999": 4.7
	},
	{
		"Length": 51.5,
		"L": -0.3521,
		"M": 3.6477,
		"S": 0.08801,
		"P01": 2.8,
		"P1": 3,
		"P3": 3.1,
		"P5": 3.2,
		"P10": 3.3,
		"P15": 3.3,
		"P25": 3.4,
		"P50": 3.6,
		"P75": 3.9,
		"P85": 4,
		"P90": 4.1,
		"P95": 4.2,
		"P97": 4.3,
		"P99": 4.5,
		"P999": 4.9
	},
	{
		"Length": 52,
		"L": -0.3521,
		"M": 3.762,
		"S": 0.08771,
		"P01": 2.9,
		"P1": 3.1,
		"P3": 3.2,
		"P5": 3.3,
		"P10": 3.4,
		"P15": 3.4,
		"P25": 3.5,
		"P50": 3.8,
		"P75": 4,
		"P85": 4.1,
		"P90": 4.2,
		"P95": 4.4,
		"P97": 4.5,
		"P99": 4.6,
		"P999": 5
	},
	{
		"Length": 52.5,
		"L": -0.3521,
		"M": 3.8814,
		"S": 0.08741,
		"P01": 3,
		"P1": 3.2,
		"P3": 3.3,
		"P5": 3.4,
		"P10": 3.5,
		"P15": 3.6,
		"P25": 3.7,
		"P50": 3.9,
		"P75": 4.1,
		"P85": 4.3,
		"P90": 4.4,
		"P95": 4.5,
		"P97": 4.6,
		"P99": 4.8,
		"P999": 5.2
	},
	{
		"Length": 53,
		"L": -0.3521,
		"M": 4.006,
		"S": 0.08711,
		"P01": 3.1,
		"P1": 3.3,
		"P3": 3.4,
		"P5": 3.5,
		"P10": 3.6,
		"P15": 3.7,
		"P25": 3.8,
		"P50": 4,
		"P75": 4.3,
		"P85": 4.4,
		"P90": 4.5,
		"P95": 4.6,
		"P97": 4.7,
		"P99": 4.9,
		"P999": 5.3
	},
	{
		"Length": 53.5,
		"L": -0.3521,
		"M": 4.1354,
		"S": 0.08681,
		"P01": 3.2,
		"P1": 3.4,
		"P3": 3.5,
		"P5": 3.6,
		"P10": 3.7,
		"P15": 3.8,
		"P25": 3.9,
		"P50": 4.1,
		"P75": 4.4,
		"P85": 4.5,
		"P90": 4.6,
		"P95": 4.8,
		"P97": 4.9,
		"P99": 5.1,
		"P999": 5.5
	},
	{
		"Length": 54,
		"L": -0.3521,
		"M": 4.2693,
		"S": 0.08651,
		"P01": 3.3,
		"P1": 3.5,
		"P3": 3.6,
		"P5": 3.7,
		"P10": 3.8,
		"P15": 3.9,
		"P25": 4,
		"P50": 4.3,
		"P75": 4.5,
		"P85": 4.7,
		"P90": 4.8,
		"P95": 4.9,
		"P97": 5,
		"P99": 5.3,
		"P999": 5.7
	},
	{
		"Length": 54.5,
		"L": -0.3521,
		"M": 4.4066,
		"S": 0.08621,
		"P01": 3.4,
		"P1": 3.6,
		"P3": 3.8,
		"P5": 3.8,
		"P10": 4,
		"P15": 4,
		"P25": 4.2,
		"P50": 4.4,
		"P75": 4.7,
		"P85": 4.8,
		"P90": 4.9,
		"P95": 5.1,
		"P97": 5.2,
		"P99": 5.4,
		"P999": 5.8
	},
	{
		"Length": 55,
		"L": -0.3521,
		"M": 4.5467,
		"S": 0.08592,
		"P01": 3.5,
		"P1": 3.7,
		"P3": 3.9,
		"P5": 4,
		"P10": 4.1,
		"P15": 4.2,
		"P25": 4.3,
		"P50": 4.5,
		"P75": 4.8,
		"P85": 5,
		"P90": 5.1,
		"P95": 5.3,
		"P97": 5.4,
		"P99": 5.6,
		"P999": 6
	},
	{
		"Length": 55.5,
		"L": -0.3521,
		"M": 4.6892,
		"S": 0.08563,
		"P01": 3.6,
		"P1": 3.9,
		"P3": 4,
		"P5": 4.1,
		"P10": 4.2,
		"P15": 4.3,
		"P25": 4.4,
		"P50": 4.7,
		"P75": 5,
		"P85": 5.1,
		"P90": 5.2,
		"P95": 5.4,
		"P97": 5.5,
		"P99": 5.8,
		"P999": 6.2
	},
	{
		"Length": 56,
		"L": -0.3521,
		"M": 4.8338,
		"S": 0.08535,
		"P01": 3.8,
		"P1": 4,
		"P3": 4.1,
		"P5": 4.2,
		"P10": 4.3,
		"P15": 4.4,
		"P25": 4.6,
		"P50": 4.8,
		"P75": 5.1,
		"P85": 5.3,
		"P90": 5.4,
		"P95": 5.6,
		"P97": 5.7,
		"P99": 5.9,
		"P999": 6.4
	},
	{
		"Length": 56.5,
		"L": -0.3521,
		"M": 4.9796,
		"S": 0.08507,
		"P01": 3.9,
		"P1": 4.1,
		"P3": 4.3,
		"P5": 4.3,
		"P10": 4.5,
		"P15": 4.6,
		"P25": 4.7,
		"P50": 5,
		"P75": 5.3,
		"P85": 5.4,
		"P90": 5.6,
		"P95": 5.7,
		"P97": 5.9,
		"P99": 6.1,
		"P999": 6.6
	},
	{
		"Length": 57,
		"L": -0.3521,
		"M": 5.1259,
		"S": 0.08481,
		"P01": 4,
		"P1": 4.2,
		"P3": 4.4,
		"P5": 4.5,
		"P10": 4.6,
		"P15": 4.7,
		"P25": 4.8,
		"P50": 5.1,
		"P75": 5.4,
		"P85": 5.6,
		"P90": 5.7,
		"P95": 5.9,
		"P97": 6,
		"P99": 6.3,
		"P999": 6.7
	},
	{
		"Length": 57.5,
		"L": -0.3521,
		"M": 5.2721,
		"S": 0.08455,
		"P01": 4.1,
		"P1": 4.4,
		"P3": 4.5,
		"P5": 4.6,
		"P10": 4.7,
		"P15": 4.8,
		"P25": 5,
		"P50": 5.3,
		"P75": 5.6,
		"P85": 5.8,
		"P90": 5.9,
		"P95": 6.1,
		"P97": 6.2,
		"P99": 6.5,
		"P999": 6.9
	},
	{
		"Length": 58,
		"L": -0.3521,
		"M": 5.418,
		"S": 0.0843,
		"P01": 4.2,
		"P1": 4.5,
		"P3": 4.6,
		"P5": 4.7,
		"P10": 4.9,
		"P15": 5,
		"P25": 5.1,
		"P50": 5.4,
		"P75": 5.7,
		"P85": 5.9,
		"P90": 6,
		"P95": 6.2,
		"P97": 6.4,
		"P99": 6.6,
		"P999": 7.1
	},
	{
		"Length": 58.5,
		"L": -0.3521,
		"M": 5.5632,
		"S": 0.08406,
		"P01": 4.3,
		"P1": 4.6,
		"P3": 4.8,
		"P5": 4.9,
		"P10": 5,
		"P15": 5.1,
		"P25": 5.3,
		"P50": 5.6,
		"P75": 5.9,
		"P85": 6.1,
		"P90": 6.2,
		"P95": 6.4,
		"P97": 6.5,
		"P99": 6.8,
		"P999": 7.3
	},
	{
		"Length": 59,
		"L": -0.3521,
		"M": 5.7074,
		"S": 0.08383,
		"P01": 4.5,
		"P1": 4.7,
		"P3": 4.9,
		"P5": 5,
		"P10": 5.1,
		"P15": 5.2,
		"P25": 5.4,
		"P50": 5.7,
		"P75": 6,
		"P85": 6.2,
		"P90": 6.4,
		"P95": 6.6,
		"P97": 6.7,
		"P99": 7,
		"P999": 7.5
	},
	{
		"Length": 59.5,
		"L": -0.3521,
		"M": 5.8501,
		"S": 0.08362,
		"P01": 4.6,
		"P1": 4.8,
		"P3": 5,
		"P5": 5.1,
		"P10": 5.3,
		"P15": 5.4,
		"P25": 5.5,
		"P50": 5.9,
		"P75": 6.2,
		"P85": 6.4,
		"P90": 6.5,
		"P95": 6.7,
		"P97": 6.9,
		"P99": 7.2,
		"P999": 7.7
	},
	{
		"Length": 60,
		"L": -0.3521,
		"M": 5.9907,
		"S": 0.08342,
		"P01": 4.7,
		"P1": 5,
		"P3": 5.1,
		"P5": 5.2,
		"P10": 5.4,
		"P15": 5.5,
		"P25": 5.7,
		"P50": 6,
		"P75": 6.3,
		"P85": 6.5,
		"P90": 6.7,
		"P95": 6.9,
		"P97": 7,
		"P99": 7.3,
		"P999": 7.8
	},
	{
		"Length": 60.5,
		"L": -0.3521,
		"M": 6.1284,
		"S": 0.08324,
		"P01": 4.8,
		"P1": 5.1,
		"P3": 5.3,
		"P5": 5.4,
		"P10": 5.5,
		"P15": 5.6,
		"P25": 5.8,
		"P50": 6.1,
		"P75": 6.5,
		"P85": 6.7,
		"P90": 6.8,
		"P95": 7.1,
		"P97": 7.2,
		"P99": 7.5,
		"P999": 8
	},
	{
		"Length": 61,
		"L": -0.3521,
		"M": 6.2632,
		"S": 0.08308,
		"P01": 4.9,
		"P1": 5.2,
		"P3": 5.4,
		"P5": 5.5,
		"P10": 5.6,
		"P15": 5.8,
		"P25": 5.9,
		"P50": 6.3,
		"P75": 6.6,
		"P85": 6.8,
		"P90": 7,
		"P95": 7.2,
		"P97": 7.4,
		"P99": 7.7,
		"P999": 8.2
	},
	{
		"Length": 61.5,
		"L": -0.3521,
		"M": 6.3954,
		"S": 0.08292,
		"P01": 5,
		"P1": 5.3,
		"P3": 5.5,
		"P5": 5.6,
		"P10": 5.8,
		"P15": 5.9,
		"P25": 6.1,
		"P50": 6.4,
		"P75": 6.8,
		"P85": 7,
		"P90": 7.1,
		"P95": 7.4,
		"P97": 7.5,
		"P99": 7.8,
		"P999": 8.4
	},
	{
		"Length": 62,
		"L": -0.3521,
		"M": 6.5251,
		"S": 0.08279,
		"P01": 5.1,
		"P1": 5.4,
		"P3": 5.6,
		"P5": 5.7,
		"P10": 5.9,
		"P15": 6,
		"P25": 6.2,
		"P50": 6.5,
		"P75": 6.9,
		"P85": 7.1,
		"P90": 7.3,
		"P95": 7.5,
		"P97": 7.7,
		"P99": 8,
		"P999": 8.5
	},
	{
		"Length": 62.5,
		"L": -0.3521,
		"M": 6.6527,
		"S": 0.08266,
		"P01": 5.2,
		"P1": 5.5,
		"P3": 5.7,
		"P5": 5.8,
		"P10": 6,
		"P15": 6.1,
		"P25": 6.3,
		"P50": 6.7,
		"P75": 7,
		"P85": 7.3,
		"P90": 7.4,
		"P95": 7.6,
		"P97": 7.8,
		"P99": 8.1,
		"P999": 8.7
	},
	{
		"Length": 63,
		"L": -0.3521,
		"M": 6.7786,
		"S": 0.08255,
		"P01": 5.3,
		"P1": 5.6,
		"P3": 5.8,
		"P5": 5.9,
		"P10": 6.1,
		"P15": 6.2,
		"P25": 6.4,
		"P50": 6.8,
		"P75": 7.2,
		"P85": 7.4,
		"P90": 7.6,
		"P95": 7.8,
		"P97": 8,
		"P99": 8.3,
		"P999": 8.9
	},
	{
		"Length": 63.5,
		"L": -0.3521,
		"M": 6.9028,
		"S": 0.08245,
		"P01": 5.4,
		"P1": 5.7,
		"P3": 5.9,
		"P5": 6,
		"P10": 6.2,
		"P15": 6.3,
		"P25": 6.5,
		"P50": 6.9,
		"P75": 7.3,
		"P85": 7.5,
		"P90": 7.7,
		"P95": 7.9,
		"P97": 8.1,
		"P99": 8.4,
		"P999": 9
	},
	{
		"Length": 64,
		"L": -0.3521,
		"M": 7.0255,
		"S": 0.08236,
		"P01": 5.5,
		"P1": 5.8,
		"P3": 6,
		"P5": 6.2,
		"P10": 6.3,
		"P15": 6.5,
		"P25": 6.6,
		"P50": 7,
		"P75": 7.4,
		"P85": 7.7,
		"P90": 7.8,
		"P95": 8.1,
		"P97": 8.2,
		"P99": 8.6,
		"P999": 9.2
	},
	{
		"Length": 64.5,
		"L": -0.3521,
		"M": 7.1467,
		"S": 0.08229,
		"P01": 5.6,
		"P1": 5.9,
		"P3": 6.1,
		"P5": 6.3,
		"P10": 6.4,
		"P15": 6.6,
		"P25": 6.8,
		"P50": 7.1,
		"P75": 7.6,
		"P85": 7.8,
		"P90": 8,
		"P95": 8.2,
		"P97": 8.4,
		"P99": 8.7,
		"P999": 9.3
	},
	{
		"Length": 65,
		"L": -0.3521,
		"M": 7.2666,
		"S": 0.08223,
		"P01": 5.7,
		"P1": 6,
		"P3": 6.3,
		"P5": 6.4,
		"P10": 6.6,
		"P15": 6.7,
		"P25": 6.9,
		"P50": 7.3,
		"P75": 7.7,
		"P85": 7.9,
		"P90": 8.1,
		"P95": 8.3,
		"P97": 8.5,
		"P99": 8.9,
		"P999": 9.5
	},
	{
		"Length": 65.5,
		"L": -0.3521,
		"M": 7.3854,
		"S": 0.08218,
		"P01": 5.8,
		"P1": 6.1,
		"P3": 6.4,
		"P5": 6.5,
		"P10": 6.7,
		"P15": 6.8,
		"P25": 7,
		"P50": 7.4,
		"P75": 7.8,
		"P85": 8.1,
		"P90": 8.2,
		"P95": 8.5,
		"P97": 8.7,
		"P99": 9,
		"P999": 9.6
	},
	{
		"Length": 66,
		"L": -0.3521,
		"M": 7.5034,
		"S": 0.08215,
		"P01": 5.9,
		"P1": 6.2,
		"P3": 6.5,
		"P5": 6.6,
		"P10": 6.8,
		"P15": 6.9,
		"P25": 7.1,
		"P50": 7.5,
		"P75": 7.9,
		"P85": 8.2,
		"P90": 8.4,
		"P95": 8.6,
		"P97": 8.8,
		"P99": 9.1,
		"P999": 9.8
	},
	{
		"Length": 66.5,
		"L": -0.3521,
		"M": 7.6206,
		"S": 0.08213,
		"P01": 6,
		"P1": 6.3,
		"P3": 6.6,
		"P5": 6.7,
		"P10": 6.9,
		"P15": 7,
		"P25": 7.2,
		"P50": 7.6,
		"P75": 8.1,
		"P85": 8.3,
		"P90": 8.5,
		"P95": 8.8,
		"P97": 8.9,
		"P99": 9.3,
		"P999": 9.9
	},
	{
		"Length": 67,
		"L": -0.3521,
		"M": 7.737,
		"S": 0.08212,
		"P01": 6.1,
		"P1": 6.4,
		"P3": 6.7,
		"P5": 6.8,
		"P10": 7,
		"P15": 7.1,
		"P25": 7.3,
		"P50": 7.7,
		"P75": 8.2,
		"P85": 8.4,
		"P90": 8.6,
		"P95": 8.9,
		"P97": 9.1,
		"P99": 9.4,
		"P999": 10.1
	},
	{
		"Length": 67.5,
		"L": -0.3521,
		"M": 7.8526,
		"S": 0.08212,
		"P01": 6.2,
		"P1": 6.5,
		"P3": 6.8,
		"P5": 6.9,
		"P10": 7.1,
		"P15": 7.2,
		"P25": 7.4,
		"P50": 7.9,
		"P75": 8.3,
		"P85": 8.6,
		"P90": 8.7,
		"P95": 9,
		"P97": 9.2,
		"P99": 9.6,
		"P999": 10.2
	},
	{
		"Length": 68,
		"L": -0.3521,
		"M": 7.9674,
		"S": 0.08214,
		"P01": 6.2,
		"P1": 6.6,
		"P3": 6.9,
		"P5": 7,
		"P10": 7.2,
		"P15": 7.3,
		"P25": 7.5,
		"P50": 8,
		"P75": 8.4,
		"P85": 8.7,
		"P90": 8.9,
		"P95": 9.2,
		"P97": 9.3,
		"P99": 9.7,
		"P999": 10.4
	},
	{
		"Length": 68.5,
		"L": -0.3521,
		"M": 8.0816,
		"S": 0.08216,
		"P01": 6.3,
		"P1": 6.7,
		"P3": 7,
		"P5": 7.1,
		"P10": 7.3,
		"P15": 7.4,
		"P25": 7.7,
		"P50": 8.1,
		"P75": 8.5,
		"P85": 8.8,
		"P90": 9,
		"P95": 9.3,
		"P97": 9.5,
		"P99": 9.8,
		"P999": 10.5
	},
	{
		"Length": 69,
		"L": -0.3521,
		"M": 8.1955,
		"S": 0.08219,
		"P01": 6.4,
		"P1": 6.8,
		"P3": 7.1,
		"P5": 7.2,
		"P10": 7.4,
		"P15": 7.5,
		"P25": 7.8,
		"P50": 8.2,
		"P75": 8.7,
		"P85": 8.9,
		"P90": 9.1,
		"P95": 9.4,
		"P97": 9.6,
		"P99": 10,
		"P999": 10.7
	},
	{
		"Length": 69.5,
		"L": -0.3521,
		"M": 8.3092,
		"S": 0.08224,
		"P01": 6.5,
		"P1": 6.9,
		"P3": 7.1,
		"P5": 7.3,
		"P10": 7.5,
		"P15": 7.6,
		"P25": 7.9,
		"P50": 8.3,
		"P75": 8.8,
		"P85": 9.1,
		"P90": 9.3,
		"P95": 9.5,
		"P97": 9.7,
		"P99": 10.1,
		"P999": 10.8
	},
	{
		"Length": 70,
		"L": -0.3521,
		"M": 8.4227,
		"S": 0.08229,
		"P01": 6.6,
		"P1": 7,
		"P3": 7.2,
		"P5": 7.4,
		"P10": 7.6,
		"P15": 7.7,
		"P25": 8,
		"P50": 8.4,
		"P75": 8.9,
		"P85": 9.2,
		"P90": 9.4,
		"P95": 9.7,
		"P97": 9.9,
		"P99": 10.3,
		"P999": 11
	},
	{
		"Length": 70.5,
		"L": -0.3521,
		"M": 8.5358,
		"S": 0.08235,
		"P01": 6.7,
		"P1": 7.1,
		"P3": 7.3,
		"P5": 7.5,
		"P10": 7.7,
		"P15": 7.8,
		"P25": 8.1,
		"P50": 8.5,
		"P75": 9,
		"P85": 9.3,
		"P90": 9.5,
		"P95": 9.8,
		"P97": 10,
		"P99": 10.4,
		"P999": 11.1
	},
	{
		"Length": 71,
		"L": -0.3521,
		"M": 8.648,
		"S": 0.08241,
		"P01": 6.8,
		"P1": 7.2,
		"P3": 7.4,
		"P5": 7.6,
		"P10": 7.8,
		"P15": 8,
		"P25": 8.2,
		"P50": 8.6,
		"P75": 9.1,
		"P85": 9.4,
		"P90": 9.6,
		"P95": 9.9,
		"P97": 10.1,
		"P99": 10.5,
		"P999": 11.3
	},
	{
		"Length": 71.5,
		"L": -0.3521,
		"M": 8.7594,
		"S": 0.08248,
		"P01": 6.9,
		"P1": 7.3,
		"P3": 7.5,
		"P5": 7.7,
		"P10": 7.9,
		"P15": 8.1,
		"P25": 8.3,
		"P50": 8.8,
		"P75": 9.3,
		"P85": 9.6,
		"P90": 9.8,
		"P95": 10.1,
		"P97": 10.3,
		"P99": 10.7,
		"P999": 11.4
	},
	{
		"Length": 72,
		"L": -0.3521,
		"M": 8.8697,
		"S": 0.08254,
		"P01": 6.9,
		"P1": 7.4,
		"P3": 7.6,
		"P5": 7.8,
		"P10": 8,
		"P15": 8.2,
		"P25": 8.4,
		"P50": 8.9,
		"P75": 9.4,
		"P85": 9.7,
		"P90": 9.9,
		"P95": 10.2,
		"P97": 10.4,
		"P99": 10.8,
		"P999": 11.6
	},
	{
		"Length": 72.5,
		"L": -0.3521,
		"M": 8.9788,
		"S": 0.08262,
		"P01": 7,
		"P1": 7.5,
		"P3": 7.7,
		"P5": 7.9,
		"P10": 8.1,
		"P15": 8.3,
		"P25": 8.5,
		"P50": 9,
		"P75": 9.5,
		"P85": 9.8,
		"P90": 10,
		"P95": 10.3,
		"P97": 10.5,
		"P99": 11,
		"P999": 11.7
	},
	{
		"Length": 73,
		"L": -0.3521,
		"M": 9.0865,
		"S": 0.08269,
		"P01": 7.1,
		"P1": 7.5,
		"P3": 7.8,
		"P5": 8,
		"P10": 8.2,
		"P15": 8.4,
		"P25": 8.6,
		"P50": 9.1,
		"P75": 9.6,
		"P85": 9.9,
		"P90": 10.1,
		"P95": 10.4,
		"P97": 10.7,
		"P99": 11.1,
		"P999": 11.9
	},
	{
		"Length": 73.5,
		"L": -0.3521,
		"M": 9.1927,
		"S": 0.08276,
		"P01": 7.2,
		"P1": 7.6,
		"P3": 7.9,
		"P5": 8,
		"P10": 8.3,
		"P15": 8.4,
		"P25": 8.7,
		"P50": 9.2,
		"P75": 9.7,
		"P85": 10,
		"P90": 10.2,
		"P95": 10.6,
		"P97": 10.8,
		"P99": 11.2,
		"P999": 12
	},
	{
		"Length": 74,
		"L": -0.3521,
		"M": 9.2974,
		"S": 0.08283,
		"P01": 7.3,
		"P1": 7.7,
		"P3": 8,
		"P5": 8.1,
		"P10": 8.4,
		"P15": 8.5,
		"P25": 8.8,
		"P50": 9.3,
		"P75": 9.8,
		"P85": 10.1,
		"P90": 10.4,
		"P95": 10.7,
		"P97": 10.9,
		"P99": 11.4,
		"P999": 12.2
	},
	{
		"Length": 74.5,
		"L": -0.3521,
		"M": 9.401,
		"S": 0.08289,
		"P01": 7.4,
		"P1": 7.8,
		"P3": 8.1,
		"P5": 8.2,
		"P10": 8.5,
		"P15": 8.6,
		"P25": 8.9,
		"P50": 9.4,
		"P75": 9.9,
		"P85": 10.3,
		"P90": 10.5,
		"P95": 10.8,
		"P97": 11,
		"P99": 11.5,
		"P999": 12.3
	},
	{
		"Length": 75,
		"L": -0.3521,
		"M": 9.5032,
		"S": 0.08295,
		"P01": 7.4,
		"P1": 7.9,
		"P3": 8.2,
		"P5": 8.3,
		"P10": 8.6,
		"P15": 8.7,
		"P25": 9,
		"P50": 9.5,
		"P75": 10.1,
		"P85": 10.4,
		"P90": 10.6,
		"P95": 10.9,
		"P97": 11.2,
		"P99": 11.6,
		"P999": 12.4
	},
	{
		"Length": 75.5,
		"L": -0.3521,
		"M": 9.6041,
		"S": 0.08301,
		"P01": 7.5,
		"P1": 8,
		"P3": 8.2,
		"P5": 8.4,
		"P10": 8.7,
		"P15": 8.8,
		"P25": 9.1,
		"P50": 9.6,
		"P75": 10.2,
		"P85": 10.5,
		"P90": 10.7,
		"P95": 11,
		"P97": 11.3,
		"P99": 11.7,
		"P999": 12.6
	},
	{
		"Length": 76,
		"L": -0.3521,
		"M": 9.7033,
		"S": 0.08307,
		"P01": 7.6,
		"P1": 8,
		"P3": 8.3,
		"P5": 8.5,
		"P10": 8.7,
		"P15": 8.9,
		"P25": 9.2,
		"P50": 9.7,
		"P75": 10.3,
		"P85": 10.6,
		"P90": 10.8,
		"P95": 11.2,
		"P97": 11.4,
		"P99": 11.9,
		"P999": 12.7
	},
	{
		"Length": 76.5,
		"L": -0.3521,
		"M": 9.8007,
		"S": 0.08311,
		"P01": 7.7,
		"P1": 8.1,
		"P3": 8.4,
		"P5": 8.6,
		"P10": 8.8,
		"P15": 9,
		"P25": 9.3,
		"P50": 9.8,
		"P75": 10.4,
		"P85": 10.7,
		"P90": 10.9,
		"P95": 11.3,
		"P97": 11.5,
		"P99": 12,
		"P999": 12.8
	},
	{
		"Length": 77,
		"L": -0.3521,
		"M": 9.8963,
		"S": 0.08314,
		"P01": 7.7,
		"P1": 8.2,
		"P3": 8.5,
		"P5": 8.7,
		"P10": 8.9,
		"P15": 9.1,
		"P25": 9.4,
		"P50": 9.9,
		"P75": 10.5,
		"P85": 10.8,
		"P90": 11,
		"P95": 11.4,
		"P97": 11.6,
		"P99": 12.1,
		"P999": 13
	},
	{
		"Length": 77.5,
		"L": -0.3521,
		"M": 9.9902,
		"S": 0.08317,
		"P01": 7.8,
		"P1": 8.3,
		"P3": 8.6,
		"P5": 8.7,
		"P10": 9,
		"P15": 9.2,
		"P25": 9.5,
		"P50": 10,
		"P75": 10.6,
		"P85": 10.9,
		"P90": 11.1,
		"P95": 11.5,
		"P97": 11.7,
		"P99": 12.2,
		"P999": 13.1
	},
	{
		"Length": 78,
		"L": -0.3521,
		"M": 10.0827,
		"S": 0.08318,
		"P01": 7.9,
		"P1": 8.4,
		"P3": 8.7,
		"P5": 8.8,
		"P10": 9.1,
		"P15": 9.3,
		"P25": 9.5,
		"P50": 10.1,
		"P75": 10.7,
		"P85": 11,
		"P90": 11.2,
		"P95": 11.6,
		"P97": 11.8,
		"P99": 12.3,
		"P999": 13.2
	},
	{
		"Length": 78.5,
		"L": -0.3521,
		"M": 10.1741,
		"S": 0.08318,
		"P01": 8,
		"P1": 8.4,
		"P3": 8.7,
		"P5": 8.9,
		"P10": 9.2,
		"P15": 9.3,
		"P25": 9.6,
		"P50": 10.2,
		"P75": 10.8,
		"P85": 11.1,
		"P90": 11.3,
		"P95": 11.7,
		"P97": 12,
		"P99": 12.4,
		"P999": 13.3
	},
	{
		"Length": 79,
		"L": -0.3521,
		"M": 10.2649,
		"S": 0.08316,
		"P01": 8,
		"P1": 8.5,
		"P3": 8.8,
		"P5": 9,
		"P10": 9.2,
		"P15": 9.4,
		"P25": 9.7,
		"P50": 10.3,
		"P75": 10.9,
		"P85": 11.2,
		"P90": 11.4,
		"P95": 11.8,
		"P97": 12.1,
		"P99": 12.5,
		"P999": 13.4
	},
	{
		"Length": 79.5,
		"L": -0.3521,
		"M": 10.3558,
		"S": 0.08313,
		"P01": 8.1,
		"P1": 8.6,
		"P3": 8.9,
		"P5": 9.1,
		"P10": 9.3,
		"P15": 9.5,
		"P25": 9.8,
		"P50": 10.4,
		"P75": 11,
		"P85": 11.3,
		"P90": 11.5,
		"P95": 11.9,
		"P97": 12.2,
		"P99": 12.7,
		"P999": 13.6
	},
	{
		"Length": 80,
		"L": -0.3521,
		"M": 10.4475,
		"S": 0.08308,
		"P01": 8.2,
		"P1": 8.7,
		"P3": 9,
		"P5": 9.1,
		"P10": 9.4,
		"P15": 9.6,
		"P25": 9.9,
		"P50": 10.4,
		"P75": 11.1,
		"P85": 11.4,
		"P90": 11.6,
		"P95": 12,
		"P97": 12.3,
		"P99": 12.8,
		"P999": 13.7
	},
	{
		"Length": 80.5,
		"L": -0.3521,
		"M": 10.5405,
		"S": 0.08301,
		"P01": 8.2,
		"P1": 8.7,
		"P3": 9.1,
		"P5": 9.2,
		"P10": 9.5,
		"P15": 9.7,
		"P25": 10,
		"P50": 10.5,
		"P75": 11.2,
		"P85": 11.5,
		"P90": 11.7,
		"P95": 12.1,
		"P97": 12.4,
		"P99": 12.9,
		"P999": 13.8
	},
	{
		"Length": 81,
		"L": -0.3521,
		"M": 10.6352,
		"S": 0.08293,
		"P01": 8.3,
		"P1": 8.8,
		"P3": 9.1,
		"P5": 9.3,
		"P10": 9.6,
		"P15": 9.8,
		"P25": 10.1,
		"P50": 10.6,
		"P75": 11.3,
		"P85": 11.6,
		"P90": 11.9,
		"P95": 12.2,
		"P97": 12.5,
		"P99": 13,
		"P999": 13.9
	},
	{
		"Length": 81.5,
		"L": -0.3521,
		"M": 10.7322,
		"S": 0.08284,
		"P01": 8.4,
		"P1": 8.9,
		"P3": 9.2,
		"P5": 9.4,
		"P10": 9.7,
		"P15": 9.9,
		"P25": 10.2,
		"P50": 10.7,
		"P75": 11.4,
		"P85": 11.7,
		"P90": 12,
		"P95": 12.3,
		"P97": 12.6,
		"P99": 13.1,
		"P999": 14
	},
	{
		"Length": 82,
		"L": -0.3521,
		"M": 10.8321,
		"S": 0.08273,
		"P01": 8.5,
		"P1": 9,
		"P3": 9.3,
		"P5": 9.5,
		"P10": 9.8,
		"P15": 10,
		"P25": 10.2,
		"P50": 10.8,
		"P75": 11.5,
		"P85": 11.8,
		"P90": 12.1,
		"P95": 12.5,
		"P97": 12.7,
		"P99": 13.2,
		"P999": 14.2
	},
	{
		"Length": 82.5,
		"L": -0.3521,
		"M": 10.935,
		"S": 0.0826,
		"P01": 8.6,
		"P1": 9.1,
		"P3": 9.4,
		"P5": 9.6,
		"P10": 9.9,
		"P15": 10.1,
		"P25": 10.3,
		"P50": 10.9,
		"P75": 11.6,
		"P85": 11.9,
		"P90": 12.2,
		"P95": 12.6,
		"P97": 12.8,
		"P99": 13.3,
		"P999": 14.3
	},
	{
		"Length": 83,
		"L": -0.3521,
		"M": 11.0415,
		"S": 0.08246,
		"P01": 8.7,
		"P1": 9.2,
		"P3": 9.5,
		"P5": 9.7,
		"P10": 10,
		"P15": 10.1,
		"P25": 10.4,
		"P50": 11,
		"P75": 11.7,
		"P85": 12,
		"P90": 12.3,
		"P95": 12.7,
		"P97": 13,
		"P99": 13.5,
		"P999": 14.4
	},
	{
		"Length": 83.5,
		"L": -0.3521,
		"M": 11.1516,
		"S": 0.08231,
		"P01": 8.7,
		"P1": 9.3,
		"P3": 9.6,
		"P5": 9.8,
		"P10": 10.1,
		"P15": 10.3,
		"P25": 10.6,
		"P50": 11.2,
		"P75": 11.8,
		"P85": 12.2,
		"P90": 12.4,
		"P95": 12.8,
		"P97": 13.1,
		"P99": 13.6,
		"P999": 14.6
	},
	{
		"Length": 84,
		"L": -0.3521,
		"M": 11.2651,
		"S": 0.08215,
		"P01": 8.8,
		"P1": 9.4,
		"P3": 9.7,
		"P5": 9.9,
		"P10": 10.2,
		"P15": 10.4,
		"P25": 10.7,
		"P50": 11.3,
		"P75": 11.9,
		"P85": 12.3,
		"P90": 12.5,
		"P95": 12.9,
		"P97": 13.2,
		"P99": 13.7,
		"P999": 14.7
	},
	{
		"Length": 84.5,
		"L": -0.3521,
		"M": 11.3817,
		"S": 0.08198,
		"P01": 8.9,
		"P1": 9.5,
		"P3": 9.8,
		"P5": 10,
		"P10": 10.3,
		"P15": 10.5,
		"P25": 10.8,
		"P50": 11.4,
		"P75": 12,
		"P85": 12.4,
		"P90": 12.7,
		"P95": 13.1,
		"P97": 13.3,
		"P99": 13.9,
		"P999": 14.8
	},
	{
		"Length": 85,
		"L": -0.3521,
		"M": 11.5007,
		"S": 0.08181,
		"P01": 9,
		"P1": 9.6,
		"P3": 9.9,
		"P5": 10.1,
		"P10": 10.4,
		"P15": 10.6,
		"P25": 10.9,
		"P50": 11.5,
		"P75": 12.2,
		"P85": 12.5,
		"P90": 12.8,
		"P95": 13.2,
		"P97": 13.5,
		"P99": 14,
		"P999": 15
	},
	{
		"Length": 85.5,
		"L": -0.3521,
		"M": 11.6218,
		"S": 0.08163,
		"P01": 9.1,
		"P1": 9.7,
		"P3": 10,
		"P5": 10.2,
		"P10": 10.5,
		"P15": 10.7,
		"P25": 11,
		"P50": 11.6,
		"P75": 12.3,
		"P85": 12.7,
		"P90": 12.9,
		"P95": 13.3,
		"P97": 13.6,
		"P99": 14.1,
		"P999": 15.1
	},
	{
		"Length": 86,
		"L": -0.3521,
		"M": 11.7444,
		"S": 0.08145,
		"P01": 9.2,
		"P1": 9.8,
		"P3": 10.1,
		"P5": 10.3,
		"P10": 10.6,
		"P15": 10.8,
		"P25": 11.1,
		"P50": 11.7,
		"P75": 12.4,
		"P85": 12.8,
		"P90": 13.1,
		"P95": 13.5,
		"P97": 13.7,
		"P99": 14.3,
		"P999": 15.3
	},
	{
		"Length": 86.5,
		"L": -0.3521,
		"M": 11.8678,
		"S": 0.08128,
		"P01": 9.3,
		"P1": 9.9,
		"P3": 10.2,
		"P5": 10.4,
		"P10": 10.7,
		"P15": 10.9,
		"P25": 11.2,
		"P50": 11.9,
		"P75": 12.5,
		"P85": 12.9,
		"P90": 13.2,
		"P95": 13.6,
		"P97": 13.9,
		"P99": 14.4,
		"P999": 15.4
	},
	{
		"Length": 87,
		"L": -0.3521,
		"M": 11.9916,
		"S": 0.08111,
		"P01": 9.4,
		"P1": 10,
		"P3": 10.3,
		"P5": 10.5,
		"P10": 10.8,
		"P15": 11,
		"P25": 11.4,
		"P50": 12,
		"P75": 12.7,
		"P85": 13.1,
		"P90": 13.3,
		"P95": 13.7,
		"P97": 14,
		"P99": 14.6,
		"P999": 15.6
	},
	{
		"Length": 87.5,
		"L": -0.3521,
		"M": 12.1152,
		"S": 0.08096,
		"P01": 9.5,
		"P1": 10.1,
		"P3": 10.4,
		"P5": 10.6,
		"P10": 10.9,
		"P15": 11.2,
		"P25": 11.5,
		"P50": 12.1,
		"P75": 12.8,
		"P85": 13.2,
		"P90": 13.5,
		"P95": 13.9,
		"P97": 14.2,
		"P99": 14.7,
		"P999": 15.7
	},
	{
		"Length": 88,
		"L": -0.3521,
		"M": 12.2382,
		"S": 0.08082,
		"P01": 9.6,
		"P1": 10.2,
		"P3": 10.6,
		"P5": 10.7,
		"P10": 11.1,
		"P15": 11.3,
		"P25": 11.6,
		"P50": 12.2,
		"P75": 12.9,
		"P85": 13.3,
		"P90": 13.6,
		"P95": 14,
		"P97": 14.3,
		"P99": 14.9,
		"P999": 15.9
	},
	{
		"Length": 88.5,
		"L": -0.3521,
		"M": 12.3603,
		"S": 0.08069,
		"P01": 9.7,
		"P1": 10.3,
		"P3": 10.7,
		"P5": 10.9,
		"P10": 11.2,
		"P15": 11.4,
		"P25": 11.7,
		"P50": 12.4,
		"P75": 13.1,
		"P85": 13.5,
		"P90": 13.7,
		"P95": 14.2,
		"P97": 14.4,
		"P99": 15,
		"P999": 16
	},
	{
		"Length": 89,
		"L": -0.3521,
		"M": 12.4815,
		"S": 0.08058,
		"P01": 9.8,
		"P1": 10.4,
		"P3": 10.8,
		"P5": 11,
		"P10": 11.3,
		"P15": 11.5,
		"P25": 11.8,
		"P50": 12.5,
		"P75": 13.2,
		"P85": 13.6,
		"P90": 13.9,
		"P95": 14.3,
		"P97": 14.6,
		"P99": 15.2,
		"P999": 16.2
	},
	{
		"Length": 89.5,
		"L": -0.3521,
		"M": 12.6017,
		"S": 0.08048,
		"P01": 9.9,
		"P1": 10.5,
		"P3": 10.9,
		"P5": 11.1,
		"P10": 11.4,
		"P15": 11.6,
		"P25": 11.9,
		"P50": 12.6,
		"P75": 13.3,
		"P85": 13.7,
		"P90": 14,
		"P95": 14.4,
		"P97": 14.7,
		"P99": 15.3,
		"P999": 16.3
	},
	{
		"Length": 90,
		"L": -0.3521,
		"M": 12.7209,
		"S": 0.08041,
		"P01": 10,
		"P1": 10.6,
		"P3": 11,
		"P5": 11.2,
		"P10": 11.5,
		"P15": 11.7,
		"P25": 12.1,
		"P50": 12.7,
		"P75": 13.4,
		"P85": 13.8,
		"P90": 14.1,
		"P95": 14.6,
		"P97": 14.9,
		"P99": 15.4,
		"P999": 16.5
	},
	{
		"Length": 90.5,
		"L": -0.3521,
		"M": 12.8392,
		"S": 0.08034,
		"P01": 10.1,
		"P1": 10.7,
		"P3": 11.1,
		"P5": 11.3,
		"P10": 11.6,
		"P15": 11.8,
		"P25": 12.2,
		"P50": 12.8,
		"P75": 13.6,
		"P85": 14,
		"P90": 14.3,
		"P95": 14.7,
		"P97": 15,
		"P99": 15.6,
		"P999": 16.6
	},
	{
		"Length": 91,
		"L": -0.3521,
		"M": 12.9569,
		"S": 0.0803,
		"P01": 10.2,
		"P1": 10.8,
		"P3": 11.2,
		"P5": 11.4,
		"P10": 11.7,
		"P15": 11.9,
		"P25": 12.3,
		"P50": 13,
		"P75": 13.7,
		"P85": 14.1,
		"P90": 14.4,
		"P95": 14.8,
		"P97": 15.1,
		"P99": 15.7,
		"P999": 16.8
	},
	{
		"Length": 91.5,
		"L": -0.3521,
		"M": 13.0742,
		"S": 0.08026,
		"P01": 10.3,
		"P1": 10.9,
		"P3": 11.3,
		"P5": 11.5,
		"P10": 11.8,
		"P15": 12,
		"P25": 12.4,
		"P50": 13.1,
		"P75": 13.8,
		"P85": 14.2,
		"P90": 14.5,
		"P95": 15,
		"P97": 15.3,
		"P99": 15.9,
		"P999": 16.9
	},
	{
		"Length": 92,
		"L": -0.3521,
		"M": 13.191,
		"S": 0.08025,
		"P01": 10.4,
		"P1": 11,
		"P3": 11.4,
		"P5": 11.6,
		"P10": 11.9,
		"P15": 12.2,
		"P25": 12.5,
		"P50": 13.2,
		"P75": 13.9,
		"P85": 14.4,
		"P90": 14.6,
		"P95": 15.1,
		"P97": 15.4,
		"P99": 16,
		"P999": 17.1
	},
	{
		"Length": 92.5,
		"L": -0.3521,
		"M": 13.3075,
		"S": 0.08025,
		"P01": 10.5,
		"P1": 11.1,
		"P3": 11.5,
		"P5": 11.7,
		"P10": 12,
		"P15": 12.3,
		"P25": 12.6,
		"P50": 13.3,
		"P75": 14.1,
		"P85": 14.5,
		"P90": 14.8,
		"P95": 15.2,
		"P97": 15.5,
		"P99": 16.1,
		"P999": 17.3
	},
	{
		"Length": 93,
		"L": -0.3521,
		"M": 13.4239,
		"S": 0.08026,
		"P01": 10.6,
		"P1": 11.2,
		"P3": 11.6,
		"P5": 11.8,
		"P10": 12.1,
		"P15": 12.4,
		"P25": 12.7,
		"P50": 13.4,
		"P75": 14.2,
		"P85": 14.6,
		"P90": 14.9,
		"P95": 15.4,
		"P97": 15.7,
		"P99": 16.3,
		"P999": 17.4
	},
	{
		"Length": 93.5,
		"L": -0.3521,
		"M": 13.5404,
		"S": 0.08029,
		"P01": 10.7,
		"P1": 11.3,
		"P3": 11.7,
		"P5": 11.9,
		"P10": 12.2,
		"P15": 12.5,
		"P25": 12.8,
		"P50": 13.5,
		"P75": 14.3,
		"P85": 14.7,
		"P90": 15,
		"P95": 15.5,
		"P97": 15.8,
		"P99": 16.4,
		"P999": 17.6
	},
	{
		"Length": 94,
		"L": -0.3521,
		"M": 13.6572,
		"S": 0.08034,
		"P01": 10.8,
		"P1": 11.4,
		"P3": 11.8,
		"P5": 12,
		"P10": 12.3,
		"P15": 12.6,
		"P25": 12.9,
		"P50": 13.7,
		"P75": 14.4,
		"P85": 14.9,
		"P90": 15.2,
		"P95": 15.6,
		"P97": 16,
		"P99": 16.6,
		"P999": 17.7
	},
	{
		"Length": 94.5,
		"L": -0.3521,
		"M": 13.7746,
		"S": 0.0804,
		"P01": 10.9,
		"P1": 11.5,
		"P3": 11.9,
		"P5": 12.1,
		"P10": 12.4,
		"P15": 12.7,
		"P25": 13.1,
		"P50": 13.8,
		"P75": 14.5,
		"P85": 15,
		"P90": 15.3,
		"P95": 15.8,
		"P97": 16.1,
		"P99": 16.7,
		"P999": 17.9
	},
	{
		"Length": 95,
		"L": -0.3521,
		"M": 13.8928,
		"S": 0.08047,
		"P01": 10.9,
		"P1": 11.6,
		"P3": 12,
		"P5": 12.2,
		"P10": 12.6,
		"P15": 12.8,
		"P25": 13.2,
		"P50": 13.9,
		"P75": 14.7,
		"P85": 15.1,
		"P90": 15.4,
		"P95": 15.9,
		"P97": 16.2,
		"P99": 16.9,
		"P999": 18
	},
	{
		"Length": 95.5,
		"L": -0.3521,
		"M": 14.012,
		"S": 0.08056,
		"P01": 11,
		"P1": 11.7,
		"P3": 12.1,
		"P5": 12.3,
		"P10": 12.7,
		"P15": 12.9,
		"P25": 13.3,
		"P50": 14,
		"P75": 14.8,
		"P85": 15.3,
		"P90": 15.6,
		"P95": 16,
		"P97": 16.4,
		"P99": 17,
		"P999": 18.2
	},
	{
		"Length": 96,
		"L": -0.3521,
		"M": 14.1325,
		"S": 0.08067,
		"P01": 11.1,
		"P1": 11.8,
		"P3": 12.2,
		"P5": 12.4,
		"P10": 12.8,
		"P15": 13,
		"P25": 13.4,
		"P50": 14.1,
		"P75": 14.9,
		"P85": 15.4,
		"P90": 15.7,
		"P95": 16.2,
		"P97": 16.5,
		"P99": 17.2,
		"P999": 18.3
	},
	{
		"Length": 96.5,
		"L": -0.3521,
		"M": 14.2544,
		"S": 0.08078,
		"P01": 11.2,
		"P1": 11.9,
		"P3": 12.3,
		"P5": 12.5,
		"P10": 12.9,
		"P15": 13.1,
		"P25": 13.5,
		"P50": 14.3,
		"P75": 15.1,
		"P85": 15.5,
		"P90": 15.8,
		"P95": 16.3,
		"P97": 16.7,
		"P99": 17.3,
		"P999": 18.5
	},
	{
		"Length": 97,
		"L": -0.3521,
		"M": 14.3782,
		"S": 0.08092,
		"P01": 11.3,
		"P1": 12,
		"P3": 12.4,
		"P5": 12.6,
		"P10": 13,
		"P15": 13.2,
		"P25": 13.6,
		"P50": 14.4,
		"P75": 15.2,
		"P85": 15.7,
		"P90": 16,
		"P95": 16.5,
		"P97": 16.8,
		"P99": 17.5,
		"P999": 18.7
	},
	{
		"Length": 97.5,
		"L": -0.3521,
		"M": 14.5038,
		"S": 0.08106,
		"P01": 11.4,
		"P1": 12.1,
		"P3": 12.5,
		"P5": 12.7,
		"P10": 13.1,
		"P15": 13.4,
		"P25": 13.7,
		"P50": 14.5,
		"P75": 15.3,
		"P85": 15.8,
		"P90": 16.1,
		"P95": 16.6,
		"P97": 17,
		"P99": 17.6,
		"P999": 18.9
	},
	{
		"Length": 98,
		"L": -0.3521,
		"M": 14.6316,
		"S": 0.08122,
		"P01": 11.5,
		"P1": 12.2,
		"P3": 12.6,
		"P5": 12.8,
		"P10": 13.2,
		"P15": 13.5,
		"P25": 13.9,
		"P50": 14.6,
		"P75": 15.5,
		"P85": 15.9,
		"P90": 16.3,
		"P95": 16.8,
		"P97": 17.1,
		"P99": 17.8,
		"P999": 19
	},
	{
		"Length": 98.5,
		"L": -0.3521,
		"M": 14.7614,
		"S": 0.08139,
		"P01": 11.6,
		"P1": 12.3,
		"P3": 12.7,
		"P5": 13,
		"P10": 13.3,
		"P15": 13.6,
		"P25": 14,
		"P50": 14.8,
		"P75": 15.6,
		"P85": 16.1,
		"P90": 16.4,
		"P95": 16.9,
		"P97": 17.3,
		"P99": 18,
		"P999": 19.2
	},
	{
		"Length": 99,
		"L": -0.3521,
		"M": 14.8934,
		"S": 0.08157,
		"P01": 11.7,
		"P1": 12.4,
		"P3": 12.8,
		"P5": 13.1,
		"P10": 13.4,
		"P15": 13.7,
		"P25": 14.1,
		"P50": 14.9,
		"P75": 15.7,
		"P85": 16.2,
		"P90": 16.6,
		"P95": 17.1,
		"P97": 17.4,
		"P99": 18.1,
		"P999": 19.4
	},
	{
		"Length": 99.5,
		"L": -0.3521,
		"M": 15.0275,
		"S": 0.08177,
		"P01": 11.8,
		"P1": 12.5,
		"P3": 12.9,
		"P5": 13.2,
		"P10": 13.6,
		"P15": 13.8,
		"P25": 14.2,
		"P50": 15,
		"P75": 15.9,
		"P85": 16.4,
		"P90": 16.7,
		"P95": 17.2,
		"P97": 17.6,
		"P99": 18.3,
		"P999": 19.6
	},
	{
		"Length": 100,
		"L": -0.3521,
		"M": 15.1637,
		"S": 0.08198,
		"P01": 11.9,
		"P1": 12.6,
		"P3": 13,
		"P5": 13.3,
		"P10": 13.7,
		"P15": 13.9,
		"P25": 14.4,
		"P50": 15.2,
		"P75": 16,
		"P85": 16.5,
		"P90": 16.9,
		"P95": 17.4,
		"P97": 17.8,
		"P99": 18.5,
		"P999": 19.8
	},
	{
		"Length": 100.5,
		"L": -0.3521,
		"M": 15.3018,
		"S": 0.0822,
		"P01": 12,
		"P1": 12.7,
		"P3": 13.2,
		"P5": 13.4,
		"P10": 13.8,
		"P15": 14.1,
		"P25": 14.5,
		"P50": 15.3,
		"P75": 16.2,
		"P85": 16.7,
		"P90": 17,
		"P95": 17.6,
		"P97": 17.9,
		"P99": 18.7,
		"P999": 20
	},
	{
		"Length": 101,
		"L": -0.3521,
		"M": 15.4419,
		"S": 0.08243,
		"P01": 12.1,
		"P1": 12.8,
		"P3": 13.3,
		"P5": 13.5,
		"P10": 13.9,
		"P15": 14.2,
		"P25": 14.6,
		"P50": 15.4,
		"P75": 16.3,
		"P85": 16.8,
		"P90": 17.2,
		"P95": 17.7,
		"P97": 18.1,
		"P99": 18.8,
		"P999": 20.2
	},
	{
		"Length": 101.5,
		"L": -0.3521,
		"M": 15.5838,
		"S": 0.08267,
		"P01": 12.2,
		"P1": 12.9,
		"P3": 13.4,
		"P5": 13.6,
		"P10": 14,
		"P15": 14.3,
		"P25": 14.7,
		"P50": 15.6,
		"P75": 16.5,
		"P85": 17,
		"P90": 17.4,
		"P95": 17.9,
		"P97": 18.3,
		"P99": 19,
		"P999": 20.4
	},
	{
		"Length": 102,
		"L": -0.3521,
		"M": 15.7276,
		"S": 0.08292,
		"P01": 12.3,
		"P1": 13,
		"P3": 13.5,
		"P5": 13.8,
		"P10": 14.2,
		"P15": 14.5,
		"P25": 14.9,
		"P50": 15.7,
		"P75": 16.6,
		"P85": 17.2,
		"P90": 17.5,
		"P95": 18.1,
		"P97": 18.5,
		"P99": 19.2,
		"P999": 20.6
	},
	{
		"Length": 102.5,
		"L": -0.3521,
		"M": 15.8732,
		"S": 0.08317,
		"P01": 12.4,
		"P1": 13.2,
		"P3": 13.6,
		"P5": 13.9,
		"P10": 14.3,
		"P15": 14.6,
		"P25": 15,
		"P50": 15.9,
		"P75": 16.8,
		"P85": 17.3,
		"P90": 17.7,
		"P95": 18.3,
		"P97": 18.6,
		"P99": 19.4,
		"P999": 20.8
	},
	{
		"Length": 103,
		"L": -0.3521,
		"M": 16.0206,
		"S": 0.08343,
		"P01": 12.5,
		"P1": 13.3,
		"P3": 13.8,
		"P5": 14,
		"P10": 14.4,
		"P15": 14.7,
		"P25": 15.2,
		"P50": 16,
		"P75": 17,
		"P85": 17.5,
		"P90": 17.9,
		"P95": 18.4,
		"P97": 18.8,
		"P99": 19.6,
		"P999": 21
	},
	{
		"Length": 103.5,
		"L": -0.3521,
		"M": 16.1697,
		"S": 0.0837,
		"P01": 12.6,
		"P1": 13.4,
		"P3": 13.9,
		"P5": 14.1,
		"P10": 14.6,
		"P15": 14.8,
		"P25": 15.3,
		"P50": 16.2,
		"P75": 17.1,
		"P85": 17.7,
		"P90": 18,
		"P95": 18.6,
		"P97": 19,
		"P99": 19.8,
		"P999": 21.2
	},
	{
		"Length": 104,
		"L": -0.3521,
		"M": 16.3204,
		"S": 0.08397,
		"P01": 12.7,
		"P1": 13.5,
		"P3": 14,
		"P5": 14.3,
		"P10": 14.7,
		"P15": 15,
		"P25": 15.4,
		"P50": 16.3,
		"P75": 17.3,
		"P85": 17.8,
		"P90": 18.2,
		"P95": 18.8,
		"P97": 19.2,
		"P99": 20,
		"P999": 21.4
	},
	{
		"Length": 104.5,
		"L": -0.3521,
		"M": 16.4728,
		"S": 0.08425,
		"P01": 12.8,
		"P1": 13.6,
		"P3": 14.1,
		"P5": 14.4,
		"P10": 14.8,
		"P15": 15.1,
		"P25": 15.6,
		"P50": 16.5,
		"P75": 17.4,
		"P85": 18,
		"P90": 18.4,
		"P95": 19,
		"P97": 19.4,
		"P99": 20.2,
		"P999": 21.6
	},
	{
		"Length": 105,
		"L": -0.3521,
		"M": 16.6268,
		"S": 0.08453,
		"P01": 13,
		"P1": 13.7,
		"P3": 14.2,
		"P5": 14.5,
		"P10": 14.9,
		"P15": 15.3,
		"P25": 15.7,
		"P50": 16.6,
		"P75": 17.6,
		"P85": 18.2,
		"P90": 18.6,
		"P95": 19.2,
		"P97": 19.6,
		"P99": 20.4,
		"P999": 21.9
	},
	{
		"Length": 105.5,
		"L": -0.3521,
		"M": 16.7826,
		"S": 0.08481,
		"P01": 13.1,
		"P1": 13.9,
		"P3": 14.4,
		"P5": 14.6,
		"P10": 15.1,
		"P15": 15.4,
		"P25": 15.9,
		"P50": 16.8,
		"P75": 17.8,
		"P85": 18.4,
		"P90": 18.7,
		"P95": 19.4,
		"P97": 19.8,
		"P99": 20.6,
		"P999": 22.1
	},
	{
		"Length": 106,
		"L": -0.3521,
		"M": 16.9401,
		"S": 0.0851,
		"P01": 13.2,
		"P1": 14,
		"P3": 14.5,
		"P5": 14.8,
		"P10": 15.2,
		"P15": 15.5,
		"P25": 16,
		"P50": 16.9,
		"P75": 18,
		"P85": 18.5,
		"P90": 18.9,
		"P95": 19.6,
		"P97": 20,
		"P99": 20.8,
		"P999": 22.3
	},
	{
		"Length": 106.5,
		"L": -0.3521,
		"M": 17.0995,
		"S": 0.08539,
		"P01": 13.3,
		"P1": 14.1,
		"P3": 14.6,
		"P5": 14.9,
		"P10": 15.4,
		"P15": 15.7,
		"P25": 16.2,
		"P50": 17.1,
		"P75": 18.1,
		"P85": 18.7,
		"P90": 19.1,
		"P95": 19.7,
		"P97": 20.2,
		"P99": 21,
		"P999": 22.6
	},
	{
		"Length": 107,
		"L": -0.3521,
		"M": 17.2607,
		"S": 0.08568,
		"P01": 13.4,
		"P1": 14.2,
		"P3": 14.8,
		"P5": 15,
		"P10": 15.5,
		"P15": 15.8,
		"P25": 16.3,
		"P50": 17.3,
		"P75": 18.3,
		"P85": 18.9,
		"P90": 19.3,
		"P95": 19.9,
		"P97": 20.4,
		"P99": 21.2,
		"P999": 22.8
	},
	{
		"Length": 107.5,
		"L": -0.3521,
		"M": 17.4237,
		"S": 0.08599,
		"P01": 13.5,
		"P1": 14.4,
		"P3": 14.9,
		"P5": 15.2,
		"P10": 15.6,
		"P15": 16,
		"P25": 16.5,
		"P50": 17.4,
		"P75": 18.5,
		"P85": 19.1,
		"P90": 19.5,
		"P95": 20.1,
		"P97": 20.6,
		"P99": 21.4,
		"P999": 23
	},
	{
		"Length": 108,
		"L": -0.3521,
		"M": 17.5885,
		"S": 0.08629,
		"P01": 13.6,
		"P1": 14.5,
		"P3": 15,
		"P5": 15.3,
		"P10": 15.8,
		"P15": 16.1,
		"P25": 16.6,
		"P50": 17.6,
		"P75": 18.7,
		"P85": 19.3,
		"P90": 19.7,
		"P95": 20.3,
		"P97": 20.8,
		"P99": 21.7,
		"P999": 23.3
	},
	{
		"Length": 108.5,
		"L": -0.3521,
		"M": 17.7553,
		"S": 0.0866,
		"P01": 13.7,
		"P1": 14.6,
		"P3": 15.2,
		"P5": 15.5,
		"P10": 15.9,
		"P15": 16.3,
		"P25": 16.8,
		"P50": 17.8,
		"P75": 18.8,
		"P85": 19.5,
		"P90": 19.9,
		"P95": 20.5,
		"P97": 21,
		"P99": 21.9,
		"P999": 23.5
	},
	{
		"Length": 109,
		"L": -0.3521,
		"M": 17.9242,
		"S": 0.08691,
		"P01": 13.9,
		"P1": 14.7,
		"P3": 15.3,
		"P5": 15.6,
		"P10": 16.1,
		"P15": 16.4,
		"P25": 16.9,
		"P50": 17.9,
		"P75": 19,
		"P85": 19.6,
		"P90": 20.1,
		"P95": 20.8,
		"P97": 21.2,
		"P99": 22.1,
		"P999": 23.8
	},
	{
		"Length": 109.5,
		"L": -0.3521,
		"M": 18.0954,
		"S": 0.08723,
		"P01": 14,
		"P1": 14.9,
		"P3": 15.4,
		"P5": 15.7,
		"P10": 16.2,
		"P15": 16.6,
		"P25": 17.1,
		"P50": 18.1,
		"P75": 19.2,
		"P85": 19.8,
		"P90": 20.3,
		"P95": 21,
		"P97": 21.4,
		"P99": 22.3,
		"P999": 24
	},
	{
		"Length": 110,
		"L": -0.3521,
		"M": 18.2689,
		"S": 0.08755,
		"P01": 14.1,
		"P1": 15,
		"P3": 15.6,
		"P5": 15.9,
		"P10": 16.4,
		"P15": 16.7,
		"P25": 17.2,
		"P50": 18.3,
		"P75": 19.4,
		"P85": 20,
		"P90": 20.5,
		"P95": 21.2,
		"P97": 21.6,
		"P99": 22.6,
		"P999": 24.3
	}
];

/***/ }),
/* 16 */
/***/ (function(module, exports) {

module.exports = [
	{
		"Height": 65,
		"L": -0.3521,
		"M": 7.4327,
		"S": 0.08217,
		"P01": 5.8,
		"P1": 6.2,
		"P3": 6.4,
		"P5": 6.5,
		"P10": 6.7,
		"P15": 6.8,
		"P25": 7,
		"P50": 7.4,
		"P75": 7.9,
		"P85": 8.1,
		"P90": 8.3,
		"P95": 8.5,
		"P97": 8.7,
		"P99": 9.1,
		"P999": 9.7
	},
	{
		"Height": 65.5,
		"L": -0.3521,
		"M": 7.5504,
		"S": 0.08214,
		"P01": 5.9,
		"P1": 6.3,
		"P3": 6.5,
		"P5": 6.6,
		"P10": 6.8,
		"P15": 6.9,
		"P25": 7.1,
		"P50": 7.6,
		"P75": 8,
		"P85": 8.2,
		"P90": 8.4,
		"P95": 8.7,
		"P97": 8.9,
		"P99": 9.2,
		"P999": 9.9
	},
	{
		"Height": 66,
		"L": -0.3521,
		"M": 7.6673,
		"S": 0.08212,
		"P01": 6,
		"P1": 6.4,
		"P3": 6.6,
		"P5": 6.7,
		"P10": 6.9,
		"P15": 7.1,
		"P25": 7.3,
		"P50": 7.7,
		"P75": 8.1,
		"P85": 8.4,
		"P90": 8.5,
		"P95": 8.8,
		"P97": 9,
		"P99": 9.3,
		"P999": 10
	},
	{
		"Height": 66.5,
		"L": -0.3521,
		"M": 7.7834,
		"S": 0.08212,
		"P01": 6.1,
		"P1": 6.5,
		"P3": 6.7,
		"P5": 6.8,
		"P10": 7,
		"P15": 7.2,
		"P25": 7.4,
		"P50": 7.8,
		"P75": 8.2,
		"P85": 8.5,
		"P90": 8.7,
		"P95": 8.9,
		"P97": 9.1,
		"P99": 9.5,
		"P999": 10.2
	},
	{
		"Height": 67,
		"L": -0.3521,
		"M": 7.8986,
		"S": 0.08213,
		"P01": 6.2,
		"P1": 6.6,
		"P3": 6.8,
		"P5": 6.9,
		"P10": 7.1,
		"P15": 7.3,
		"P25": 7.5,
		"P50": 7.9,
		"P75": 8.4,
		"P85": 8.6,
		"P90": 8.8,
		"P95": 9.1,
		"P97": 9.3,
		"P99": 9.6,
		"P999": 10.3
	},
	{
		"Height": 67.5,
		"L": -0.3521,
		"M": 8.0132,
		"S": 0.08214,
		"P01": 6.3,
		"P1": 6.7,
		"P3": 6.9,
		"P5": 7,
		"P10": 7.2,
		"P15": 7.4,
		"P25": 7.6,
		"P50": 8,
		"P75": 8.5,
		"P85": 8.7,
		"P90": 8.9,
		"P95": 9.2,
		"P97": 9.4,
		"P99": 9.8,
		"P999": 10.5
	},
	{
		"Height": 68,
		"L": -0.3521,
		"M": 8.1272,
		"S": 0.08217,
		"P01": 6.4,
		"P1": 6.8,
		"P3": 7,
		"P5": 7.1,
		"P10": 7.3,
		"P15": 7.5,
		"P25": 7.7,
		"P50": 8.1,
		"P75": 8.6,
		"P85": 8.9,
		"P90": 9,
		"P95": 9.3,
		"P97": 9.5,
		"P99": 9.9,
		"P999": 10.6
	},
	{
		"Height": 68.5,
		"L": -0.3521,
		"M": 8.241,
		"S": 0.08221,
		"P01": 6.5,
		"P1": 6.8,
		"P3": 7.1,
		"P5": 7.2,
		"P10": 7.4,
		"P15": 7.6,
		"P25": 7.8,
		"P50": 8.2,
		"P75": 8.7,
		"P85": 9,
		"P90": 9.2,
		"P95": 9.5,
		"P97": 9.7,
		"P99": 10,
		"P999": 10.8
	},
	{
		"Height": 69,
		"L": -0.3521,
		"M": 8.3547,
		"S": 0.08226,
		"P01": 6.5,
		"P1": 6.9,
		"P3": 7.2,
		"P5": 7.3,
		"P10": 7.5,
		"P15": 7.7,
		"P25": 7.9,
		"P50": 8.4,
		"P75": 8.8,
		"P85": 9.1,
		"P90": 9.3,
		"P95": 9.6,
		"P97": 9.8,
		"P99": 10.2,
		"P999": 10.9
	},
	{
		"Height": 69.5,
		"L": -0.3521,
		"M": 8.468,
		"S": 0.08231,
		"P01": 6.6,
		"P1": 7,
		"P3": 7.3,
		"P5": 7.4,
		"P10": 7.6,
		"P15": 7.8,
		"P25": 8,
		"P50": 8.5,
		"P75": 9,
		"P85": 9.2,
		"P90": 9.4,
		"P95": 9.7,
		"P97": 9.9,
		"P99": 10.3,
		"P999": 11.1
	},
	{
		"Height": 70,
		"L": -0.3521,
		"M": 8.5808,
		"S": 0.08237,
		"P01": 6.7,
		"P1": 7.1,
		"P3": 7.4,
		"P5": 7.5,
		"P10": 7.7,
		"P15": 7.9,
		"P25": 8.1,
		"P50": 8.6,
		"P75": 9.1,
		"P85": 9.4,
		"P90": 9.6,
		"P95": 9.9,
		"P97": 10.1,
		"P99": 10.5,
		"P999": 11.2
	},
	{
		"Height": 70.5,
		"L": -0.3521,
		"M": 8.6927,
		"S": 0.08243,
		"P01": 6.8,
		"P1": 7.2,
		"P3": 7.5,
		"P5": 7.6,
		"P10": 7.8,
		"P15": 8,
		"P25": 8.2,
		"P50": 8.7,
		"P75": 9.2,
		"P85": 9.5,
		"P90": 9.7,
		"P95": 10,
		"P97": 10.2,
		"P99": 10.6,
		"P999": 11.4
	},
	{
		"Height": 71,
		"L": -0.3521,
		"M": 8.8036,
		"S": 0.0825,
		"P01": 6.9,
		"P1": 7.3,
		"P3": 7.6,
		"P5": 7.7,
		"P10": 7.9,
		"P15": 8.1,
		"P25": 8.3,
		"P50": 8.8,
		"P75": 9.3,
		"P85": 9.6,
		"P90": 9.8,
		"P95": 10.1,
		"P97": 10.3,
		"P99": 10.7,
		"P999": 11.5
	},
	{
		"Height": 71.5,
		"L": -0.3521,
		"M": 8.9135,
		"S": 0.08257,
		"P01": 7,
		"P1": 7.4,
		"P3": 7.7,
		"P5": 7.8,
		"P10": 8,
		"P15": 8.2,
		"P25": 8.4,
		"P50": 8.9,
		"P75": 9.4,
		"P85": 9.7,
		"P90": 9.9,
		"P95": 10.2,
		"P97": 10.5,
		"P99": 10.9,
		"P999": 11.6
	},
	{
		"Height": 72,
		"L": -0.3521,
		"M": 9.0221,
		"S": 0.08264,
		"P01": 7.1,
		"P1": 7.5,
		"P3": 7.8,
		"P5": 7.9,
		"P10": 8.1,
		"P15": 8.3,
		"P25": 8.5,
		"P50": 9,
		"P75": 9.5,
		"P85": 9.8,
		"P90": 10.1,
		"P95": 10.4,
		"P97": 10.6,
		"P99": 11,
		"P999": 11.8
	},
	{
		"Height": 72.5,
		"L": -0.3521,
		"M": 9.1292,
		"S": 0.08272,
		"P01": 7.1,
		"P1": 7.6,
		"P3": 7.8,
		"P5": 8,
		"P10": 8.2,
		"P15": 8.4,
		"P25": 8.6,
		"P50": 9.1,
		"P75": 9.7,
		"P85": 10,
		"P90": 10.2,
		"P95": 10.5,
		"P97": 10.7,
		"P99": 11.1,
		"P999": 11.9
	},
	{
		"Height": 73,
		"L": -0.3521,
		"M": 9.2347,
		"S": 0.08278,
		"P01": 7.2,
		"P1": 7.7,
		"P3": 7.9,
		"P5": 8.1,
		"P10": 8.3,
		"P15": 8.5,
		"P25": 8.7,
		"P50": 9.2,
		"P75": 9.8,
		"P85": 10.1,
		"P90": 10.3,
		"P95": 10.6,
		"P97": 10.8,
		"P99": 11.3,
		"P999": 12.1
	},
	{
		"Height": 73.5,
		"L": -0.3521,
		"M": 9.339,
		"S": 0.08285,
		"P01": 7.3,
		"P1": 7.8,
		"P3": 8,
		"P5": 8.2,
		"P10": 8.4,
		"P15": 8.6,
		"P25": 8.8,
		"P50": 9.3,
		"P75": 9.9,
		"P85": 10.2,
		"P90": 10.4,
		"P95": 10.7,
		"P97": 11,
		"P99": 11.4,
		"P999": 12.2
	},
	{
		"Height": 74,
		"L": -0.3521,
		"M": 9.442,
		"S": 0.08292,
		"P01": 7.4,
		"P1": 7.8,
		"P3": 8.1,
		"P5": 8.3,
		"P10": 8.5,
		"P15": 8.7,
		"P25": 8.9,
		"P50": 9.4,
		"P75": 10,
		"P85": 10.3,
		"P90": 10.5,
		"P95": 10.9,
		"P97": 11.1,
		"P99": 11.5,
		"P999": 12.4
	},
	{
		"Height": 74.5,
		"L": -0.3521,
		"M": 9.5438,
		"S": 0.08298,
		"P01": 7.5,
		"P1": 7.9,
		"P3": 8.2,
		"P5": 8.4,
		"P10": 8.6,
		"P15": 8.8,
		"P25": 9,
		"P50": 9.5,
		"P75": 10.1,
		"P85": 10.4,
		"P90": 10.6,
		"P95": 11,
		"P97": 11.2,
		"P99": 11.7,
		"P999": 12.5
	},
	{
		"Height": 75,
		"L": -0.3521,
		"M": 9.644,
		"S": 0.08303,
		"P01": 7.5,
		"P1": 8,
		"P3": 8.3,
		"P5": 8.4,
		"P10": 8.7,
		"P15": 8.9,
		"P25": 9.1,
		"P50": 9.6,
		"P75": 10.2,
		"P85": 10.5,
		"P90": 10.7,
		"P95": 11.1,
		"P97": 11.3,
		"P99": 11.8,
		"P999": 12.6
	},
	{
		"Height": 75.5,
		"L": -0.3521,
		"M": 9.7425,
		"S": 0.08308,
		"P01": 7.6,
		"P1": 8.1,
		"P3": 8.4,
		"P5": 8.5,
		"P10": 8.8,
		"P15": 9,
		"P25": 9.2,
		"P50": 9.7,
		"P75": 10.3,
		"P85": 10.6,
		"P90": 10.9,
		"P95": 11.2,
		"P97": 11.4,
		"P99": 11.9,
		"P999": 12.8
	},
	{
		"Height": 76,
		"L": -0.3521,
		"M": 9.8392,
		"S": 0.08312,
		"P01": 7.7,
		"P1": 8.2,
		"P3": 8.5,
		"P5": 8.6,
		"P10": 8.9,
		"P15": 9,
		"P25": 9.3,
		"P50": 9.8,
		"P75": 10.4,
		"P85": 10.7,
		"P90": 11,
		"P95": 11.3,
		"P97": 11.6,
		"P99": 12,
		"P999": 12.9
	},
	{
		"Height": 76.5,
		"L": -0.3521,
		"M": 9.9341,
		"S": 0.08315,
		"P01": 7.8,
		"P1": 8.2,
		"P3": 8.5,
		"P5": 8.7,
		"P10": 8.9,
		"P15": 9.1,
		"P25": 9.4,
		"P50": 9.9,
		"P75": 10.5,
		"P85": 10.8,
		"P90": 11.1,
		"P95": 11.4,
		"P97": 11.7,
		"P99": 12.1,
		"P999": 13
	},
	{
		"Height": 77,
		"L": -0.3521,
		"M": 10.0274,
		"S": 0.08317,
		"P01": 7.8,
		"P1": 8.3,
		"P3": 8.6,
		"P5": 8.8,
		"P10": 9,
		"P15": 9.2,
		"P25": 9.5,
		"P50": 10,
		"P75": 10.6,
		"P85": 10.9,
		"P90": 11.2,
		"P95": 11.5,
		"P97": 11.8,
		"P99": 12.3,
		"P999": 13.1
	},
	{
		"Height": 77.5,
		"L": -0.3521,
		"M": 10.1194,
		"S": 0.08318,
		"P01": 7.9,
		"P1": 8.4,
		"P3": 8.7,
		"P5": 8.9,
		"P10": 9.1,
		"P15": 9.3,
		"P25": 9.6,
		"P50": 10.1,
		"P75": 10.7,
		"P85": 11,
		"P90": 11.3,
		"P95": 11.6,
		"P97": 11.9,
		"P99": 12.4,
		"P999": 13.2
	},
	{
		"Height": 78,
		"L": -0.3521,
		"M": 10.2105,
		"S": 0.08317,
		"P01": 8,
		"P1": 8.5,
		"P3": 8.8,
		"P5": 8.9,
		"P10": 9.2,
		"P15": 9.4,
		"P25": 9.7,
		"P50": 10.2,
		"P75": 10.8,
		"P85": 11.1,
		"P90": 11.4,
		"P95": 11.7,
		"P97": 12,
		"P99": 12.5,
		"P999": 13.4
	},
	{
		"Height": 78.5,
		"L": -0.3521,
		"M": 10.3012,
		"S": 0.08315,
		"P01": 8.1,
		"P1": 8.5,
		"P3": 8.8,
		"P5": 9,
		"P10": 9.3,
		"P15": 9.5,
		"P25": 9.7,
		"P50": 10.3,
		"P75": 10.9,
		"P85": 11.2,
		"P90": 11.5,
		"P95": 11.9,
		"P97": 12.1,
		"P99": 12.6,
		"P999": 13.5
	},
	{
		"Height": 79,
		"L": -0.3521,
		"M": 10.3923,
		"S": 0.08311,
		"P01": 8.1,
		"P1": 8.6,
		"P3": 8.9,
		"P5": 9.1,
		"P10": 9.4,
		"P15": 9.5,
		"P25": 9.8,
		"P50": 10.4,
		"P75": 11,
		"P85": 11.3,
		"P90": 11.6,
		"P95": 12,
		"P97": 12.2,
		"P99": 12.7,
		"P999": 13.6
	},
	{
		"Height": 79.5,
		"L": -0.3521,
		"M": 10.4845,
		"S": 0.08305,
		"P01": 8.2,
		"P1": 8.7,
		"P3": 9,
		"P5": 9.2,
		"P10": 9.4,
		"P15": 9.6,
		"P25": 9.9,
		"P50": 10.5,
		"P75": 11.1,
		"P85": 11.4,
		"P90": 11.7,
		"P95": 12.1,
		"P97": 12.3,
		"P99": 12.8,
		"P999": 13.7
	},
	{
		"Height": 80,
		"L": -0.3521,
		"M": 10.5781,
		"S": 0.08298,
		"P01": 8.3,
		"P1": 8.8,
		"P3": 9.1,
		"P5": 9.3,
		"P10": 9.5,
		"P15": 9.7,
		"P25": 10,
		"P50": 10.6,
		"P75": 11.2,
		"P85": 11.5,
		"P90": 11.8,
		"P95": 12.2,
		"P97": 12.4,
		"P99": 12.9,
		"P999": 13.8
	},
	{
		"Height": 80.5,
		"L": -0.3521,
		"M": 10.6737,
		"S": 0.0829,
		"P01": 8.4,
		"P1": 8.9,
		"P3": 9.2,
		"P5": 9.3,
		"P10": 9.6,
		"P15": 9.8,
		"P25": 10.1,
		"P50": 10.7,
		"P75": 11.3,
		"P85": 11.6,
		"P90": 11.9,
		"P95": 12.3,
		"P97": 12.5,
		"P99": 13,
		"P999": 14
	},
	{
		"Height": 81,
		"L": -0.3521,
		"M": 10.7718,
		"S": 0.08279,
		"P01": 8.4,
		"P1": 8.9,
		"P3": 9.3,
		"P5": 9.4,
		"P10": 9.7,
		"P15": 9.9,
		"P25": 10.2,
		"P50": 10.8,
		"P75": 11.4,
		"P85": 11.8,
		"P90": 12,
		"P95": 12.4,
		"P97": 12.6,
		"P99": 13.1,
		"P999": 14.1
	},
	{
		"Height": 81.5,
		"L": -0.3521,
		"M": 10.8728,
		"S": 0.08268,
		"P01": 8.5,
		"P1": 9,
		"P3": 9.3,
		"P5": 9.5,
		"P10": 9.8,
		"P15": 10,
		"P25": 10.3,
		"P50": 10.9,
		"P75": 11.5,
		"P85": 11.9,
		"P90": 12.1,
		"P95": 12.5,
		"P97": 12.8,
		"P99": 13.3,
		"P999": 14.2
	},
	{
		"Height": 82,
		"L": -0.3521,
		"M": 10.9772,
		"S": 0.08255,
		"P01": 8.6,
		"P1": 9.1,
		"P3": 9.4,
		"P5": 9.6,
		"P10": 9.9,
		"P15": 10.1,
		"P25": 10.4,
		"P50": 11,
		"P75": 11.6,
		"P85": 12,
		"P90": 12.2,
		"P95": 12.6,
		"P97": 12.9,
		"P99": 13.4,
		"P999": 14.3
	},
	{
		"Height": 82.5,
		"L": -0.3521,
		"M": 11.0851,
		"S": 0.08241,
		"P01": 8.7,
		"P1": 9.2,
		"P3": 9.5,
		"P5": 9.7,
		"P10": 10,
		"P15": 10.2,
		"P25": 10.5,
		"P50": 11.1,
		"P75": 11.7,
		"P85": 12.1,
		"P90": 12.3,
		"P95": 12.7,
		"P97": 13,
		"P99": 13.5,
		"P999": 14.5
	},
	{
		"Height": 83,
		"L": -0.3521,
		"M": 11.1966,
		"S": 0.08225,
		"P01": 8.8,
		"P1": 9.3,
		"P3": 9.6,
		"P5": 9.8,
		"P10": 10.1,
		"P15": 10.3,
		"P25": 10.6,
		"P50": 11.2,
		"P75": 11.8,
		"P85": 12.2,
		"P90": 12.5,
		"P95": 12.9,
		"P97": 13.1,
		"P99": 13.6,
		"P999": 14.6
	},
	{
		"Height": 83.5,
		"L": -0.3521,
		"M": 11.3114,
		"S": 0.08209,
		"P01": 8.9,
		"P1": 9.4,
		"P3": 9.7,
		"P5": 9.9,
		"P10": 10.2,
		"P15": 10.4,
		"P25": 10.7,
		"P50": 11.3,
		"P75": 12,
		"P85": 12.3,
		"P90": 12.6,
		"P95": 13,
		"P97": 13.3,
		"P99": 13.8,
		"P999": 14.8
	},
	{
		"Height": 84,
		"L": -0.3521,
		"M": 11.429,
		"S": 0.08191,
		"P01": 9,
		"P1": 9.5,
		"P3": 9.8,
		"P5": 10,
		"P10": 10.3,
		"P15": 10.5,
		"P25": 10.8,
		"P50": 11.4,
		"P75": 12.1,
		"P85": 12.5,
		"P90": 12.7,
		"P95": 13.1,
		"P97": 13.4,
		"P99": 13.9,
		"P999": 14.9
	},
	{
		"Height": 84.5,
		"L": -0.3521,
		"M": 11.549,
		"S": 0.08174,
		"P01": 9.1,
		"P1": 9.6,
		"P3": 9.9,
		"P5": 10.1,
		"P10": 10.4,
		"P15": 10.6,
		"P25": 10.9,
		"P50": 11.5,
		"P75": 12.2,
		"P85": 12.6,
		"P90": 12.8,
		"P95": 13.3,
		"P97": 13.5,
		"P99": 14.1,
		"P999": 15
	},
	{
		"Height": 85,
		"L": -0.3521,
		"M": 11.6707,
		"S": 0.08156,
		"P01": 9.2,
		"P1": 9.7,
		"P3": 10.1,
		"P5": 10.2,
		"P10": 10.5,
		"P15": 10.7,
		"P25": 11.1,
		"P50": 11.7,
		"P75": 12.3,
		"P85": 12.7,
		"P90": 13,
		"P95": 13.4,
		"P97": 13.7,
		"P99": 14.2,
		"P999": 15.2
	},
	{
		"Height": 85.5,
		"L": -0.3521,
		"M": 11.7937,
		"S": 0.08138,
		"P01": 9.3,
		"P1": 9.8,
		"P3": 10.2,
		"P5": 10.3,
		"P10": 10.6,
		"P15": 10.9,
		"P25": 11.2,
		"P50": 11.8,
		"P75": 12.5,
		"P85": 12.8,
		"P90": 13.1,
		"P95": 13.5,
		"P97": 13.8,
		"P99": 14.3,
		"P999": 15.3
	},
	{
		"Height": 86,
		"L": -0.3521,
		"M": 11.9173,
		"S": 0.08121,
		"P01": 9.4,
		"P1": 9.9,
		"P3": 10.3,
		"P5": 10.5,
		"P10": 10.8,
		"P15": 11,
		"P25": 11.3,
		"P50": 11.9,
		"P75": 12.6,
		"P85": 13,
		"P90": 13.3,
		"P95": 13.7,
		"P97": 13.9,
		"P99": 14.5,
		"P999": 15.5
	},
	{
		"Height": 86.5,
		"L": -0.3521,
		"M": 12.0411,
		"S": 0.08105,
		"P01": 9.5,
		"P1": 10,
		"P3": 10.4,
		"P5": 10.6,
		"P10": 10.9,
		"P15": 11.1,
		"P25": 11.4,
		"P50": 12,
		"P75": 12.7,
		"P85": 13.1,
		"P90": 13.4,
		"P95": 13.8,
		"P97": 14.1,
		"P99": 14.6,
		"P999": 15.7
	},
	{
		"Height": 87,
		"L": -0.3521,
		"M": 12.1645,
		"S": 0.0809,
		"P01": 9.6,
		"P1": 10.1,
		"P3": 10.5,
		"P5": 10.7,
		"P10": 11,
		"P15": 11.2,
		"P25": 11.5,
		"P50": 12.2,
		"P75": 12.9,
		"P85": 13.2,
		"P90": 13.5,
		"P95": 13.9,
		"P97": 14.2,
		"P99": 14.8,
		"P999": 15.8
	},
	{
		"Height": 87.5,
		"L": -0.3521,
		"M": 12.2871,
		"S": 0.08076,
		"P01": 9.7,
		"P1": 10.2,
		"P3": 10.6,
		"P5": 10.8,
		"P10": 11.1,
		"P15": 11.3,
		"P25": 11.6,
		"P50": 12.3,
		"P75": 13,
		"P85": 13.4,
		"P90": 13.7,
		"P95": 14.1,
		"P97": 14.4,
		"P99": 14.9,
		"P999": 16
	},
	{
		"Height": 88,
		"L": -0.3521,
		"M": 12.4089,
		"S": 0.08064,
		"P01": 9.8,
		"P1": 10.3,
		"P3": 10.7,
		"P5": 10.9,
		"P10": 11.2,
		"P15": 11.4,
		"P25": 11.8,
		"P50": 12.4,
		"P75": 13.1,
		"P85": 13.5,
		"P90": 13.8,
		"P95": 14.2,
		"P97": 14.5,
		"P99": 15.1,
		"P999": 16.1
	},
	{
		"Height": 88.5,
		"L": -0.3521,
		"M": 12.5298,
		"S": 0.08054,
		"P01": 9.9,
		"P1": 10.5,
		"P3": 10.8,
		"P5": 11,
		"P10": 11.3,
		"P15": 11.5,
		"P25": 11.9,
		"P50": 12.5,
		"P75": 13.2,
		"P85": 13.6,
		"P90": 13.9,
		"P95": 14.4,
		"P97": 14.6,
		"P99": 15.2,
		"P999": 16.3
	},
	{
		"Height": 89,
		"L": -0.3521,
		"M": 12.6495,
		"S": 0.08045,
		"P01": 10,
		"P1": 10.6,
		"P3": 10.9,
		"P5": 11.1,
		"P10": 11.4,
		"P15": 11.7,
		"P25": 12,
		"P50": 12.6,
		"P75": 13.4,
		"P85": 13.8,
		"P90": 14.1,
		"P95": 14.5,
		"P97": 14.8,
		"P99": 15.4,
		"P999": 16.4
	},
	{
		"Height": 89.5,
		"L": -0.3521,
		"M": 12.7683,
		"S": 0.08038,
		"P01": 10.1,
		"P1": 10.7,
		"P3": 11,
		"P5": 11.2,
		"P10": 11.5,
		"P15": 11.8,
		"P25": 12.1,
		"P50": 12.8,
		"P75": 13.5,
		"P85": 13.9,
		"P90": 14.2,
		"P95": 14.6,
		"P97": 14.9,
		"P99": 15.5,
		"P999": 16.6
	},
	{
		"Height": 90,
		"L": -0.3521,
		"M": 12.8864,
		"S": 0.08032,
		"P01": 10.2,
		"P1": 10.8,
		"P3": 11.1,
		"P5": 11.3,
		"P10": 11.6,
		"P15": 11.9,
		"P25": 12.2,
		"P50": 12.9,
		"P75": 13.6,
		"P85": 14,
		"P90": 14.3,
		"P95": 14.8,
		"P97": 15.1,
		"P99": 15.6,
		"P999": 16.7
	},
	{
		"Height": 90.5,
		"L": -0.3521,
		"M": 13.0038,
		"S": 0.08028,
		"P01": 10.3,
		"P1": 10.9,
		"P3": 11.2,
		"P5": 11.4,
		"P10": 11.8,
		"P15": 12,
		"P25": 12.3,
		"P50": 13,
		"P75": 13.7,
		"P85": 14.1,
		"P90": 14.4,
		"P95": 14.9,
		"P97": 15.2,
		"P99": 15.8,
		"P999": 16.9
	},
	{
		"Height": 91,
		"L": -0.3521,
		"M": 13.1209,
		"S": 0.08025,
		"P01": 10.3,
		"P1": 11,
		"P3": 11.3,
		"P5": 11.5,
		"P10": 11.9,
		"P15": 12.1,
		"P25": 12.4,
		"P50": 13.1,
		"P75": 13.9,
		"P85": 14.3,
		"P90": 14.6,
		"P95": 15,
		"P97": 15.3,
		"P99": 15.9,
		"P999": 17
	},
	{
		"Height": 91.5,
		"L": -0.3521,
		"M": 13.2376,
		"S": 0.08024,
		"P01": 10.4,
		"P1": 11,
		"P3": 11.4,
		"P5": 11.6,
		"P10": 12,
		"P15": 12.2,
		"P25": 12.5,
		"P50": 13.2,
		"P75": 14,
		"P85": 14.4,
		"P90": 14.7,
		"P95": 15.2,
		"P97": 15.5,
		"P99": 16.1,
		"P999": 17.2
	},
	{
		"Height": 92,
		"L": -0.3521,
		"M": 13.3541,
		"S": 0.08025,
		"P01": 10.5,
		"P1": 11.1,
		"P3": 11.5,
		"P5": 11.7,
		"P10": 12.1,
		"P15": 12.3,
		"P25": 12.7,
		"P50": 13.4,
		"P75": 14.1,
		"P85": 14.5,
		"P90": 14.8,
		"P95": 15.3,
		"P97": 15.6,
		"P99": 16.2,
		"P999": 17.3
	},
	{
		"Height": 92.5,
		"L": -0.3521,
		"M": 13.4705,
		"S": 0.08027,
		"P01": 10.6,
		"P1": 11.2,
		"P3": 11.6,
		"P5": 11.8,
		"P10": 12.2,
		"P15": 12.4,
		"P25": 12.8,
		"P50": 13.5,
		"P75": 14.2,
		"P85": 14.7,
		"P90": 15,
		"P95": 15.4,
		"P97": 15.7,
		"P99": 16.3,
		"P999": 17.5
	},
	{
		"Height": 93,
		"L": -0.3521,
		"M": 13.587,
		"S": 0.08031,
		"P01": 10.7,
		"P1": 11.3,
		"P3": 11.7,
		"P5": 11.9,
		"P10": 12.3,
		"P15": 12.5,
		"P25": 12.9,
		"P50": 13.6,
		"P75": 14.4,
		"P85": 14.8,
		"P90": 15.1,
		"P95": 15.6,
		"P97": 15.9,
		"P99": 16.5,
		"P999": 17.6
	},
	{
		"Height": 93.5,
		"L": -0.3521,
		"M": 13.7041,
		"S": 0.08036,
		"P01": 10.8,
		"P1": 11.4,
		"P3": 11.8,
		"P5": 12,
		"P10": 12.4,
		"P15": 12.6,
		"P25": 13,
		"P50": 13.7,
		"P75": 14.5,
		"P85": 14.9,
		"P90": 15.2,
		"P95": 15.7,
		"P97": 16,
		"P99": 16.6,
		"P999": 17.8
	},
	{
		"Height": 94,
		"L": -0.3521,
		"M": 13.8217,
		"S": 0.08043,
		"P01": 10.9,
		"P1": 11.5,
		"P3": 11.9,
		"P5": 12.1,
		"P10": 12.5,
		"P15": 12.7,
		"P25": 13.1,
		"P50": 13.8,
		"P75": 14.6,
		"P85": 15,
		"P90": 15.4,
		"P95": 15.8,
		"P97": 16.1,
		"P99": 16.8,
		"P999": 17.9
	},
	{
		"Height": 94.5,
		"L": -0.3521,
		"M": 13.9403,
		"S": 0.08051,
		"P01": 11,
		"P1": 11.6,
		"P3": 12,
		"P5": 12.2,
		"P10": 12.6,
		"P15": 12.8,
		"P25": 13.2,
		"P50": 13.9,
		"P75": 14.7,
		"P85": 15.2,
		"P90": 15.5,
		"P95": 16,
		"P97": 16.3,
		"P99": 16.9,
		"P999": 18.1
	},
	{
		"Height": 95,
		"L": -0.3521,
		"M": 14.06,
		"S": 0.0806,
		"P01": 11.1,
		"P1": 11.7,
		"P3": 12.1,
		"P5": 12.4,
		"P10": 12.7,
		"P15": 12.9,
		"P25": 13.3,
		"P50": 14.1,
		"P75": 14.9,
		"P85": 15.3,
		"P90": 15.6,
		"P95": 16.1,
		"P97": 16.4,
		"P99": 17.1,
		"P999": 18.2
	},
	{
		"Height": 95.5,
		"L": -0.3521,
		"M": 14.1811,
		"S": 0.08071,
		"P01": 11.2,
		"P1": 11.8,
		"P3": 12.2,
		"P5": 12.5,
		"P10": 12.8,
		"P15": 13.1,
		"P25": 13.4,
		"P50": 14.2,
		"P75": 15,
		"P85": 15.4,
		"P90": 15.8,
		"P95": 16.2,
		"P97": 16.6,
		"P99": 17.2,
		"P999": 18.4
	},
	{
		"Height": 96,
		"L": -0.3521,
		"M": 14.3037,
		"S": 0.08083,
		"P01": 11.3,
		"P1": 11.9,
		"P3": 12.3,
		"P5": 12.6,
		"P10": 12.9,
		"P15": 13.2,
		"P25": 13.6,
		"P50": 14.3,
		"P75": 15.1,
		"P85": 15.6,
		"P90": 15.9,
		"P95": 16.4,
		"P97": 16.7,
		"P99": 17.4,
		"P999": 18.6
	},
	{
		"Height": 96.5,
		"L": -0.3521,
		"M": 14.4282,
		"S": 0.08097,
		"P01": 11.4,
		"P1": 12,
		"P3": 12.4,
		"P5": 12.7,
		"P10": 13,
		"P15": 13.3,
		"P25": 13.7,
		"P50": 14.4,
		"P75": 15.2,
		"P85": 15.7,
		"P90": 16,
		"P95": 16.5,
		"P97": 16.9,
		"P99": 17.5,
		"P999": 18.7
	},
	{
		"Height": 97,
		"L": -0.3521,
		"M": 14.5547,
		"S": 0.08112,
		"P01": 11.4,
		"P1": 12.1,
		"P3": 12.5,
		"P5": 12.8,
		"P10": 13.1,
		"P15": 13.4,
		"P25": 13.8,
		"P50": 14.6,
		"P75": 15.4,
		"P85": 15.9,
		"P90": 16.2,
		"P95": 16.7,
		"P97": 17,
		"P99": 17.7,
		"P999": 18.9
	},
	{
		"Height": 97.5,
		"L": -0.3521,
		"M": 14.6832,
		"S": 0.08129,
		"P01": 11.5,
		"P1": 12.2,
		"P3": 12.7,
		"P5": 12.9,
		"P10": 13.3,
		"P15": 13.5,
		"P25": 13.9,
		"P50": 14.7,
		"P75": 15.5,
		"P85": 16,
		"P90": 16.3,
		"P95": 16.8,
		"P97": 17.2,
		"P99": 17.9,
		"P999": 19.1
	},
	{
		"Height": 98,
		"L": -0.3521,
		"M": 14.814,
		"S": 0.08146,
		"P01": 11.6,
		"P1": 12.3,
		"P3": 12.8,
		"P5": 13,
		"P10": 13.4,
		"P15": 13.6,
		"P25": 14,
		"P50": 14.8,
		"P75": 15.7,
		"P85": 16.1,
		"P90": 16.5,
		"P95": 17,
		"P97": 17.3,
		"P99": 18,
		"P999": 19.3
	},
	{
		"Height": 98.5,
		"L": -0.3521,
		"M": 14.9468,
		"S": 0.08165,
		"P01": 11.7,
		"P1": 12.4,
		"P3": 12.9,
		"P5": 13.1,
		"P10": 13.5,
		"P15": 13.8,
		"P25": 14.2,
		"P50": 14.9,
		"P75": 15.8,
		"P85": 16.3,
		"P90": 16.6,
		"P95": 17.2,
		"P97": 17.5,
		"P99": 18.2,
		"P999": 19.5
	},
	{
		"Height": 99,
		"L": -0.3521,
		"M": 15.0818,
		"S": 0.08185,
		"P01": 11.8,
		"P1": 12.5,
		"P3": 13,
		"P5": 13.2,
		"P10": 13.6,
		"P15": 13.9,
		"P25": 14.3,
		"P50": 15.1,
		"P75": 15.9,
		"P85": 16.4,
		"P90": 16.8,
		"P95": 17.3,
		"P97": 17.7,
		"P99": 18.4,
		"P999": 19.7
	},
	{
		"Height": 99.5,
		"L": -0.3521,
		"M": 15.2187,
		"S": 0.08206,
		"P01": 11.9,
		"P1": 12.7,
		"P3": 13.1,
		"P5": 13.3,
		"P10": 13.7,
		"P15": 14,
		"P25": 14.4,
		"P50": 15.2,
		"P75": 16.1,
		"P85": 16.6,
		"P90": 16.9,
		"P95": 17.5,
		"P97": 17.8,
		"P99": 18.5,
		"P999": 19.8
	},
	{
		"Height": 100,
		"L": -0.3521,
		"M": 15.3576,
		"S": 0.08229,
		"P01": 12,
		"P1": 12.8,
		"P3": 13.2,
		"P5": 13.5,
		"P10": 13.8,
		"P15": 14.1,
		"P25": 14.5,
		"P50": 15.4,
		"P75": 16.2,
		"P85": 16.7,
		"P90": 17.1,
		"P95": 17.6,
		"P97": 18,
		"P99": 18.7,
		"P999": 20
	},
	{
		"Height": 100.5,
		"L": -0.3521,
		"M": 15.4985,
		"S": 0.08252,
		"P01": 12.1,
		"P1": 12.9,
		"P3": 13.3,
		"P5": 13.6,
		"P10": 14,
		"P15": 14.2,
		"P25": 14.7,
		"P50": 15.5,
		"P75": 16.4,
		"P85": 16.9,
		"P90": 17.3,
		"P95": 17.8,
		"P97": 18.2,
		"P99": 18.9,
		"P999": 20.2
	},
	{
		"Height": 101,
		"L": -0.3521,
		"M": 15.6412,
		"S": 0.08277,
		"P01": 12.2,
		"P1": 13,
		"P3": 13.4,
		"P5": 13.7,
		"P10": 14.1,
		"P15": 14.4,
		"P25": 14.8,
		"P50": 15.6,
		"P75": 16.5,
		"P85": 17.1,
		"P90": 17.4,
		"P95": 18,
		"P97": 18.4,
		"P99": 19.1,
		"P999": 20.4
	},
	{
		"Height": 101.5,
		"L": -0.3521,
		"M": 15.7857,
		"S": 0.08302,
		"P01": 12.3,
		"P1": 13.1,
		"P3": 13.6,
		"P5": 13.8,
		"P10": 14.2,
		"P15": 14.5,
		"P25": 14.9,
		"P50": 15.8,
		"P75": 16.7,
		"P85": 17.2,
		"P90": 17.6,
		"P95": 18.2,
		"P97": 18.5,
		"P99": 19.3,
		"P999": 20.7
	},
	{
		"Height": 102,
		"L": -0.3521,
		"M": 15.932,
		"S": 0.08328,
		"P01": 12.5,
		"P1": 13.2,
		"P3": 13.7,
		"P5": 13.9,
		"P10": 14.3,
		"P15": 14.6,
		"P25": 15.1,
		"P50": 15.9,
		"P75": 16.9,
		"P85": 17.4,
		"P90": 17.8,
		"P95": 18.3,
		"P97": 18.7,
		"P99": 19.5,
		"P999": 20.9
	},
	{
		"Height": 102.5,
		"L": -0.3521,
		"M": 16.0801,
		"S": 0.08354,
		"P01": 12.6,
		"P1": 13.3,
		"P3": 13.8,
		"P5": 14.1,
		"P10": 14.5,
		"P15": 14.8,
		"P25": 15.2,
		"P50": 16.1,
		"P75": 17,
		"P85": 17.6,
		"P90": 17.9,
		"P95": 18.5,
		"P97": 18.9,
		"P99": 19.7,
		"P999": 21.1
	},
	{
		"Height": 103,
		"L": -0.3521,
		"M": 16.2298,
		"S": 0.08381,
		"P01": 12.7,
		"P1": 13.4,
		"P3": 13.9,
		"P5": 14.2,
		"P10": 14.6,
		"P15": 14.9,
		"P25": 15.3,
		"P50": 16.2,
		"P75": 17.2,
		"P85": 17.7,
		"P90": 18.1,
		"P95": 18.7,
		"P97": 19.1,
		"P99": 19.9,
		"P999": 21.3
	},
	{
		"Height": 103.5,
		"L": -0.3521,
		"M": 16.3812,
		"S": 0.08408,
		"P01": 12.8,
		"P1": 13.6,
		"P3": 14,
		"P5": 14.3,
		"P10": 14.7,
		"P15": 15,
		"P25": 15.5,
		"P50": 16.4,
		"P75": 17.3,
		"P85": 17.9,
		"P90": 18.3,
		"P95": 18.9,
		"P97": 19.3,
		"P99": 20.1,
		"P999": 21.5
	},
	{
		"Height": 104,
		"L": -0.3521,
		"M": 16.5342,
		"S": 0.08436,
		"P01": 12.9,
		"P1": 13.7,
		"P3": 14.2,
		"P5": 14.4,
		"P10": 14.9,
		"P15": 15.2,
		"P25": 15.6,
		"P50": 16.5,
		"P75": 17.5,
		"P85": 18.1,
		"P90": 18.5,
		"P95": 19.1,
		"P97": 19.5,
		"P99": 20.3,
		"P999": 21.7
	},
	{
		"Height": 104.5,
		"L": -0.3521,
		"M": 16.6889,
		"S": 0.08464,
		"P01": 13,
		"P1": 13.8,
		"P3": 14.3,
		"P5": 14.6,
		"P10": 15,
		"P15": 15.3,
		"P25": 15.8,
		"P50": 16.7,
		"P75": 17.7,
		"P85": 18.2,
		"P90": 18.6,
		"P95": 19.2,
		"P97": 19.7,
		"P99": 20.5,
		"P999": 22
	},
	{
		"Height": 105,
		"L": -0.3521,
		"M": 16.8454,
		"S": 0.08493,
		"P01": 13.1,
		"P1": 13.9,
		"P3": 14.4,
		"P5": 14.7,
		"P10": 15.1,
		"P15": 15.4,
		"P25": 15.9,
		"P50": 16.8,
		"P75": 17.8,
		"P85": 18.4,
		"P90": 18.8,
		"P95": 19.4,
		"P97": 19.9,
		"P99": 20.7,
		"P999": 22.2
	},
	{
		"Height": 105.5,
		"L": -0.3521,
		"M": 17.0036,
		"S": 0.08521,
		"P01": 13.2,
		"P1": 14,
		"P3": 14.5,
		"P5": 14.8,
		"P10": 15.3,
		"P15": 15.6,
		"P25": 16.1,
		"P50": 17,
		"P75": 18,
		"P85": 18.6,
		"P90": 19,
		"P95": 19.6,
		"P97": 20.1,
		"P99": 20.9,
		"P999": 22.4
	},
	{
		"Height": 106,
		"L": -0.3521,
		"M": 17.1637,
		"S": 0.08551,
		"P01": 13.3,
		"P1": 14.2,
		"P3": 14.7,
		"P5": 15,
		"P10": 15.4,
		"P15": 15.7,
		"P25": 16.2,
		"P50": 17.2,
		"P75": 18.2,
		"P85": 18.8,
		"P90": 19.2,
		"P95": 19.8,
		"P97": 20.3,
		"P99": 21.1,
		"P999": 22.6
	},
	{
		"Height": 106.5,
		"L": -0.3521,
		"M": 17.3256,
		"S": 0.0858,
		"P01": 13.4,
		"P1": 14.3,
		"P3": 14.8,
		"P5": 15.1,
		"P10": 15.6,
		"P15": 15.9,
		"P25": 16.4,
		"P50": 17.3,
		"P75": 18.4,
		"P85": 19,
		"P90": 19.4,
		"P95": 20,
		"P97": 20.5,
		"P99": 21.3,
		"P999": 22.9
	},
	{
		"Height": 107,
		"L": -0.3521,
		"M": 17.4894,
		"S": 0.08611,
		"P01": 13.6,
		"P1": 14.4,
		"P3": 14.9,
		"P5": 15.2,
		"P10": 15.7,
		"P15": 16,
		"P25": 16.5,
		"P50": 17.5,
		"P75": 18.5,
		"P85": 19.1,
		"P90": 19.6,
		"P95": 20.2,
		"P97": 20.7,
		"P99": 21.5,
		"P999": 23.1
	},
	{
		"Height": 107.5,
		"L": -0.3521,
		"M": 17.655,
		"S": 0.08641,
		"P01": 13.7,
		"P1": 14.5,
		"P3": 15.1,
		"P5": 15.4,
		"P10": 15.8,
		"P15": 16.2,
		"P25": 16.7,
		"P50": 17.7,
		"P75": 18.7,
		"P85": 19.3,
		"P90": 19.8,
		"P95": 20.4,
		"P97": 20.9,
		"P99": 21.7,
		"P999": 23.4
	},
	{
		"Height": 108,
		"L": -0.3521,
		"M": 17.8226,
		"S": 0.08673,
		"P01": 13.8,
		"P1": 14.7,
		"P3": 15.2,
		"P5": 15.5,
		"P10": 16,
		"P15": 16.3,
		"P25": 16.8,
		"P50": 17.8,
		"P75": 18.9,
		"P85": 19.5,
		"P90": 20,
		"P95": 20.6,
		"P97": 21.1,
		"P99": 22,
		"P999": 23.6
	},
	{
		"Height": 108.5,
		"L": -0.3521,
		"M": 17.9924,
		"S": 0.08704,
		"P01": 13.9,
		"P1": 14.8,
		"P3": 15.3,
		"P5": 15.6,
		"P10": 16.1,
		"P15": 16.5,
		"P25": 17,
		"P50": 18,
		"P75": 19.1,
		"P85": 19.7,
		"P90": 20.2,
		"P95": 20.8,
		"P97": 21.3,
		"P99": 22.2,
		"P999": 23.9
	},
	{
		"Height": 109,
		"L": -0.3521,
		"M": 18.1645,
		"S": 0.08736,
		"P01": 14,
		"P1": 14.9,
		"P3": 15.5,
		"P5": 15.8,
		"P10": 16.3,
		"P15": 16.6,
		"P25": 17.1,
		"P50": 18.2,
		"P75": 19.3,
		"P85": 19.9,
		"P90": 20.4,
		"P95": 21.1,
		"P97": 21.5,
		"P99": 22.4,
		"P999": 24.1
	},
	{
		"Height": 109.5,
		"L": -0.3521,
		"M": 18.339,
		"S": 0.08768,
		"P01": 14.2,
		"P1": 15.1,
		"P3": 15.6,
		"P5": 15.9,
		"P10": 16.4,
		"P15": 16.8,
		"P25": 17.3,
		"P50": 18.3,
		"P75": 19.5,
		"P85": 20.1,
		"P90": 20.6,
		"P95": 21.3,
		"P97": 21.7,
		"P99": 22.7,
		"P999": 24.4
	},
	{
		"Height": 110,
		"L": -0.3521,
		"M": 18.5158,
		"S": 0.088,
		"P01": 14.3,
		"P1": 15.2,
		"P3": 15.8,
		"P5": 16.1,
		"P10": 16.6,
		"P15": 16.9,
		"P25": 17.5,
		"P50": 18.5,
		"P75": 19.7,
		"P85": 20.3,
		"P90": 20.8,
		"P95": 21.5,
		"P97": 22,
		"P99": 22.9,
		"P999": 24.6
	},
	{
		"Height": 110.5,
		"L": -0.3521,
		"M": 18.6948,
		"S": 0.08832,
		"P01": 14.4,
		"P1": 15.3,
		"P3": 15.9,
		"P5": 16.2,
		"P10": 16.7,
		"P15": 17.1,
		"P25": 17.6,
		"P50": 18.7,
		"P75": 19.9,
		"P85": 20.5,
		"P90": 21,
		"P95": 21.7,
		"P97": 22.2,
		"P99": 23.1,
		"P999": 24.9
	},
	{
		"Height": 111,
		"L": -0.3521,
		"M": 18.8759,
		"S": 0.08864,
		"P01": 14.5,
		"P1": 15.5,
		"P3": 16.1,
		"P5": 16.4,
		"P10": 16.9,
		"P15": 17.2,
		"P25": 17.8,
		"P50": 18.9,
		"P75": 20.1,
		"P85": 20.7,
		"P90": 21.2,
		"P95": 21.9,
		"P97": 22.4,
		"P99": 23.4,
		"P999": 25.2
	},
	{
		"Height": 111.5,
		"L": -0.3521,
		"M": 19.059,
		"S": 0.08896,
		"P01": 14.7,
		"P1": 15.6,
		"P3": 16.2,
		"P5": 16.5,
		"P10": 17,
		"P15": 17.4,
		"P25": 18,
		"P50": 19.1,
		"P75": 20.3,
		"P85": 20.9,
		"P90": 21.4,
		"P95": 22.1,
		"P97": 22.6,
		"P99": 23.6,
		"P999": 25.4
	},
	{
		"Height": 112,
		"L": -0.3521,
		"M": 19.2439,
		"S": 0.08928,
		"P01": 14.8,
		"P1": 15.7,
		"P3": 16.3,
		"P5": 16.7,
		"P10": 17.2,
		"P15": 17.6,
		"P25": 18.1,
		"P50": 19.2,
		"P75": 20.5,
		"P85": 21.1,
		"P90": 21.6,
		"P95": 22.4,
		"P97": 22.9,
		"P99": 23.9,
		"P999": 25.7
	},
	{
		"Height": 112.5,
		"L": -0.3521,
		"M": 19.4304,
		"S": 0.0896,
		"P01": 14.9,
		"P1": 15.9,
		"P3": 16.5,
		"P5": 16.8,
		"P10": 17.4,
		"P15": 17.7,
		"P25": 18.3,
		"P50": 19.4,
		"P75": 20.7,
		"P85": 21.4,
		"P90": 21.8,
		"P95": 22.6,
		"P97": 23.1,
		"P99": 24.1,
		"P999": 26
	},
	{
		"Height": 113,
		"L": -0.3521,
		"M": 19.6185,
		"S": 0.08991,
		"P01": 15.1,
		"P1": 16,
		"P3": 16.6,
		"P5": 17,
		"P10": 17.5,
		"P15": 17.9,
		"P25": 18.5,
		"P50": 19.6,
		"P75": 20.9,
		"P85": 21.6,
		"P90": 22.1,
		"P95": 22.8,
		"P97": 23.4,
		"P99": 24.4,
		"P999": 26.3
	},
	{
		"Height": 113.5,
		"L": -0.3521,
		"M": 19.8081,
		"S": 0.09022,
		"P01": 15.2,
		"P1": 16.2,
		"P3": 16.8,
		"P5": 17.1,
		"P10": 17.7,
		"P15": 18.1,
		"P25": 18.7,
		"P50": 19.8,
		"P75": 21.1,
		"P85": 21.8,
		"P90": 22.3,
		"P95": 23.1,
		"P97": 23.6,
		"P99": 24.6,
		"P999": 26.6
	},
	{
		"Height": 114,
		"L": -0.3521,
		"M": 19.999,
		"S": 0.09054,
		"P01": 15.3,
		"P1": 16.3,
		"P3": 17,
		"P5": 17.3,
		"P10": 17.8,
		"P15": 18.2,
		"P25": 18.8,
		"P50": 20,
		"P75": 21.3,
		"P85": 22,
		"P90": 22.5,
		"P95": 23.3,
		"P97": 23.8,
		"P99": 24.9,
		"P999": 26.8
	},
	{
		"Height": 114.5,
		"L": -0.3521,
		"M": 20.1912,
		"S": 0.09085,
		"P01": 15.4,
		"P1": 16.5,
		"P3": 17.1,
		"P5": 17.5,
		"P10": 18,
		"P15": 18.4,
		"P25": 19,
		"P50": 20.2,
		"P75": 21.5,
		"P85": 22.2,
		"P90": 22.7,
		"P95": 23.5,
		"P97": 24.1,
		"P99": 25.2,
		"P999": 27.1
	},
	{
		"Height": 115,
		"L": -0.3521,
		"M": 20.3846,
		"S": 0.09116,
		"P01": 15.6,
		"P1": 16.6,
		"P3": 17.3,
		"P5": 17.6,
		"P10": 18.2,
		"P15": 18.6,
		"P25": 19.2,
		"P50": 20.4,
		"P75": 21.7,
		"P85": 22.4,
		"P90": 23,
		"P95": 23.8,
		"P97": 24.3,
		"P99": 25.4,
		"P999": 27.4
	},
	{
		"Height": 115.5,
		"L": -0.3521,
		"M": 20.5789,
		"S": 0.09147,
		"P01": 15.7,
		"P1": 16.8,
		"P3": 17.4,
		"P5": 17.8,
		"P10": 18.3,
		"P15": 18.7,
		"P25": 19.4,
		"P50": 20.6,
		"P75": 21.9,
		"P85": 22.7,
		"P90": 23.2,
		"P95": 24,
		"P97": 24.6,
		"P99": 25.7,
		"P999": 27.7
	},
	{
		"Height": 116,
		"L": -0.3521,
		"M": 20.7741,
		"S": 0.09177,
		"P01": 15.9,
		"P1": 16.9,
		"P3": 17.6,
		"P5": 17.9,
		"P10": 18.5,
		"P15": 18.9,
		"P25": 19.5,
		"P50": 20.8,
		"P75": 22.1,
		"P85": 22.9,
		"P90": 23.4,
		"P95": 24.3,
		"P97": 24.8,
		"P99": 25.9,
		"P999": 28
	},
	{
		"Height": 116.5,
		"L": -0.3521,
		"M": 20.97,
		"S": 0.09208,
		"P01": 16,
		"P1": 17.1,
		"P3": 17.7,
		"P5": 18.1,
		"P10": 18.7,
		"P15": 19.1,
		"P25": 19.7,
		"P50": 21,
		"P75": 22.3,
		"P85": 23.1,
		"P90": 23.7,
		"P95": 24.5,
		"P97": 25.1,
		"P99": 26.2,
		"P999": 28.3
	},
	{
		"Height": 117,
		"L": -0.3521,
		"M": 21.1666,
		"S": 0.09239,
		"P01": 16.1,
		"P1": 17.2,
		"P3": 17.9,
		"P5": 18.3,
		"P10": 18.8,
		"P15": 19.3,
		"P25": 19.9,
		"P50": 21.2,
		"P75": 22.5,
		"P85": 23.3,
		"P90": 23.9,
		"P95": 24.7,
		"P97": 25.3,
		"P99": 26.5,
		"P999": 28.6
	},
	{
		"Height": 117.5,
		"L": -0.3521,
		"M": 21.3636,
		"S": 0.0927,
		"P01": 16.3,
		"P1": 17.4,
		"P3": 18,
		"P5": 18.4,
		"P10": 19,
		"P15": 19.4,
		"P25": 20.1,
		"P50": 21.4,
		"P75": 22.8,
		"P85": 23.6,
		"P90": 24.1,
		"P95": 25,
		"P97": 25.6,
		"P99": 26.7,
		"P999": 28.9
	},
	{
		"Height": 118,
		"L": -0.3521,
		"M": 21.5611,
		"S": 0.093,
		"P01": 16.4,
		"P1": 17.5,
		"P3": 18.2,
		"P5": 18.6,
		"P10": 19.2,
		"P15": 19.6,
		"P25": 20.3,
		"P50": 21.6,
		"P75": 23,
		"P85": 23.8,
		"P90": 24.4,
		"P95": 25.2,
		"P97": 25.8,
		"P99": 27,
		"P999": 29.2
	},
	{
		"Height": 118.5,
		"L": -0.3521,
		"M": 21.7588,
		"S": 0.09331,
		"P01": 16.5,
		"P1": 17.7,
		"P3": 18.4,
		"P5": 18.7,
		"P10": 19.4,
		"P15": 19.8,
		"P25": 20.4,
		"P50": 21.8,
		"P75": 23.2,
		"P85": 24,
		"P90": 24.6,
		"P95": 25.5,
		"P97": 26.1,
		"P99": 27.3,
		"P999": 29.5
	},
	{
		"Height": 119,
		"L": -0.3521,
		"M": 21.9568,
		"S": 0.09362,
		"P01": 16.7,
		"P1": 17.8,
		"P3": 18.5,
		"P5": 18.9,
		"P10": 19.5,
		"P15": 20,
		"P25": 20.6,
		"P50": 22,
		"P75": 23.4,
		"P85": 24.2,
		"P90": 24.8,
		"P95": 25.7,
		"P97": 26.3,
		"P99": 27.5,
		"P999": 29.8
	},
	{
		"Height": 119.5,
		"L": -0.3521,
		"M": 22.1549,
		"S": 0.09393,
		"P01": 16.8,
		"P1": 17.9,
		"P3": 18.7,
		"P5": 19.1,
		"P10": 19.7,
		"P15": 20.1,
		"P25": 20.8,
		"P50": 22.2,
		"P75": 23.6,
		"P85": 24.5,
		"P90": 25.1,
		"P95": 26,
		"P97": 26.6,
		"P99": 27.8,
		"P999": 30.1
	},
	{
		"Height": 120,
		"L": -0.3521,
		"M": 22.353,
		"S": 0.09424,
		"P01": 16.9,
		"P1": 18.1,
		"P3": 18.8,
		"P5": 19.2,
		"P10": 19.9,
		"P15": 20.3,
		"P25": 21,
		"P50": 22.4,
		"P75": 23.8,
		"P85": 24.7,
		"P90": 25.3,
		"P95": 26.2,
		"P97": 26.8,
		"P99": 28.1,
		"P999": 30.4
	}
];

/***/ }),
/* 17 */
/***/ (function(module, exports) {

module.exports = [
	{
		"Length": 45,
		"L": -0.3833,
		"M": 2.4607,
		"S": 0.09029,
		"P01": 1.9,
		"P1": 2,
		"P3": 2.1,
		"P5": 2.1,
		"P10": 2.2,
		"P15": 2.2,
		"P25": 2.3,
		"P50": 2.5,
		"P75": 2.6,
		"P85": 2.7,
		"P90": 2.8,
		"P95": 2.9,
		"P97": 2.9,
		"P99": 3.1,
		"P999": 3.3
	},
	{
		"Length": 45.5,
		"L": -0.3833,
		"M": 2.5457,
		"S": 0.09033,
		"P01": 2,
		"P1": 2.1,
		"P3": 2.2,
		"P5": 2.2,
		"P10": 2.3,
		"P15": 2.3,
		"P25": 2.4,
		"P50": 2.5,
		"P75": 2.7,
		"P85": 2.8,
		"P90": 2.9,
		"P95": 3,
		"P97": 3,
		"P99": 3.2,
		"P999": 3.4
	},
	{
		"Length": 46,
		"L": -0.3833,
		"M": 2.6306,
		"S": 0.09037,
		"P01": 2,
		"P1": 2.1,
		"P3": 2.2,
		"P5": 2.3,
		"P10": 2.3,
		"P15": 2.4,
		"P25": 2.5,
		"P50": 2.6,
		"P75": 2.8,
		"P85": 2.9,
		"P90": 3,
		"P95": 3.1,
		"P97": 3.1,
		"P99": 3.3,
		"P999": 3.5
	},
	{
		"Length": 46.5,
		"L": -0.3833,
		"M": 2.7155,
		"S": 0.0904,
		"P01": 2.1,
		"P1": 2.2,
		"P3": 2.3,
		"P5": 2.3,
		"P10": 2.4,
		"P15": 2.5,
		"P25": 2.6,
		"P50": 2.7,
		"P75": 2.9,
		"P85": 3,
		"P90": 3.1,
		"P95": 3.2,
		"P97": 3.2,
		"P99": 3.4,
		"P999": 3.6
	},
	{
		"Length": 47,
		"L": -0.3833,
		"M": 2.8007,
		"S": 0.09044,
		"P01": 2.1,
		"P1": 2.3,
		"P3": 2.4,
		"P5": 2.4,
		"P10": 2.5,
		"P15": 2.6,
		"P25": 2.6,
		"P50": 2.8,
		"P75": 3,
		"P85": 3.1,
		"P90": 3.2,
		"P95": 3.3,
		"P97": 3.3,
		"P99": 3.5,
		"P999": 3.8
	},
	{
		"Length": 47.5,
		"L": -0.3833,
		"M": 2.8867,
		"S": 0.09048,
		"P01": 2.2,
		"P1": 2.4,
		"P3": 2.4,
		"P5": 2.5,
		"P10": 2.6,
		"P15": 2.6,
		"P25": 2.7,
		"P50": 2.9,
		"P75": 3.1,
		"P85": 3.2,
		"P90": 3.3,
		"P95": 3.4,
		"P97": 3.4,
		"P99": 3.6,
		"P999": 3.9
	},
	{
		"Length": 48,
		"L": -0.3833,
		"M": 2.9741,
		"S": 0.09052,
		"P01": 2.3,
		"P1": 2.4,
		"P3": 2.5,
		"P5": 2.6,
		"P10": 2.7,
		"P15": 2.7,
		"P25": 2.8,
		"P50": 3,
		"P75": 3.2,
		"P85": 3.3,
		"P90": 3.3,
		"P95": 3.5,
		"P97": 3.5,
		"P99": 3.7,
		"P999": 4
	},
	{
		"Length": 48.5,
		"L": -0.3833,
		"M": 3.0636,
		"S": 0.09056,
		"P01": 2.3,
		"P1": 2.5,
		"P3": 2.6,
		"P5": 2.7,
		"P10": 2.7,
		"P15": 2.8,
		"P25": 2.9,
		"P50": 3.1,
		"P75": 3.3,
		"P85": 3.4,
		"P90": 3.4,
		"P95": 3.6,
		"P97": 3.7,
		"P99": 3.8,
		"P999": 4.1
	},
	{
		"Length": 49,
		"L": -0.3833,
		"M": 3.156,
		"S": 0.0906,
		"P01": 2.4,
		"P1": 2.6,
		"P3": 2.7,
		"P5": 2.7,
		"P10": 2.8,
		"P15": 2.9,
		"P25": 3,
		"P50": 3.2,
		"P75": 3.4,
		"P85": 3.5,
		"P90": 3.6,
		"P95": 3.7,
		"P97": 3.8,
		"P99": 3.9,
		"P999": 4.2
	},
	{
		"Length": 49.5,
		"L": -0.3833,
		"M": 3.252,
		"S": 0.09064,
		"P01": 2.5,
		"P1": 2.7,
		"P3": 2.8,
		"P5": 2.8,
		"P10": 2.9,
		"P15": 3,
		"P25": 3.1,
		"P50": 3.3,
		"P75": 3.5,
		"P85": 3.6,
		"P90": 3.7,
		"P95": 3.8,
		"P97": 3.9,
		"P99": 4.1,
		"P999": 4.4
	},
	{
		"Length": 50,
		"L": -0.3833,
		"M": 3.3518,
		"S": 0.09068,
		"P01": 2.6,
		"P1": 2.7,
		"P3": 2.8,
		"P5": 2.9,
		"P10": 3,
		"P15": 3.1,
		"P25": 3.2,
		"P50": 3.4,
		"P75": 3.6,
		"P85": 3.7,
		"P90": 3.8,
		"P95": 3.9,
		"P97": 4,
		"P99": 4.2,
		"P999": 4.5
	},
	{
		"Length": 50.5,
		"L": -0.3833,
		"M": 3.4557,
		"S": 0.09072,
		"P01": 2.6,
		"P1": 2.8,
		"P3": 2.9,
		"P5": 3,
		"P10": 3.1,
		"P15": 3.2,
		"P25": 3.3,
		"P50": 3.5,
		"P75": 3.7,
		"P85": 3.8,
		"P90": 3.9,
		"P95": 4,
		"P97": 4.1,
		"P99": 4.3,
		"P999": 4.6
	},
	{
		"Length": 51,
		"L": -0.3833,
		"M": 3.5636,
		"S": 0.09076,
		"P01": 2.7,
		"P1": 2.9,
		"P3": 3,
		"P5": 3.1,
		"P10": 3.2,
		"P15": 3.2,
		"P25": 3.4,
		"P50": 3.6,
		"P75": 3.8,
		"P85": 3.9,
		"P90": 4,
		"P95": 4.2,
		"P97": 4.3,
		"P99": 4.4,
		"P999": 4.8
	},
	{
		"Length": 51.5,
		"L": -0.3833,
		"M": 3.6754,
		"S": 0.0908,
		"P01": 2.8,
		"P1": 3,
		"P3": 3.1,
		"P5": 3.2,
		"P10": 3.3,
		"P15": 3.4,
		"P25": 3.5,
		"P50": 3.7,
		"P75": 3.9,
		"P85": 4,
		"P90": 4.1,
		"P95": 4.3,
		"P97": 4.4,
		"P99": 4.6,
		"P999": 4.9
	},
	{
		"Length": 52,
		"L": -0.3833,
		"M": 3.7911,
		"S": 0.09085,
		"P01": 2.9,
		"P1": 3.1,
		"P3": 3.2,
		"P5": 3.3,
		"P10": 3.4,
		"P15": 3.5,
		"P25": 3.6,
		"P50": 3.8,
		"P75": 4,
		"P85": 4.2,
		"P90": 4.3,
		"P95": 4.4,
		"P97": 4.5,
		"P99": 4.7,
		"P999": 5.1
	},
	{
		"Length": 52.5,
		"L": -0.3833,
		"M": 3.9105,
		"S": 0.09089,
		"P01": 3,
		"P1": 3.2,
		"P3": 3.3,
		"P5": 3.4,
		"P10": 3.5,
		"P15": 3.6,
		"P25": 3.7,
		"P50": 3.9,
		"P75": 4.2,
		"P85": 4.3,
		"P90": 4.4,
		"P95": 4.6,
		"P97": 4.7,
		"P99": 4.9,
		"P999": 5.3
	},
	{
		"Length": 53,
		"L": -0.3833,
		"M": 4.0332,
		"S": 0.09093,
		"P01": 3.1,
		"P1": 3.3,
		"P3": 3.4,
		"P5": 3.5,
		"P10": 3.6,
		"P15": 3.7,
		"P25": 3.8,
		"P50": 4,
		"P75": 4.3,
		"P85": 4.4,
		"P90": 4.5,
		"P95": 4.7,
		"P97": 4.8,
		"P99": 5,
		"P999": 5.4
	},
	{
		"Length": 53.5,
		"L": -0.3833,
		"M": 4.1591,
		"S": 0.09098,
		"P01": 3.2,
		"P1": 3.4,
		"P3": 3.5,
		"P5": 3.6,
		"P10": 3.7,
		"P15": 3.8,
		"P25": 3.9,
		"P50": 4.2,
		"P75": 4.4,
		"P85": 4.6,
		"P90": 4.7,
		"P95": 4.9,
		"P97": 5,
		"P99": 5.2,
		"P999": 5.6
	},
	{
		"Length": 54,
		"L": -0.3833,
		"M": 4.2875,
		"S": 0.09102,
		"P01": 3.3,
		"P1": 3.5,
		"P3": 3.6,
		"P5": 3.7,
		"P10": 3.8,
		"P15": 3.9,
		"P25": 4,
		"P50": 4.3,
		"P75": 4.6,
		"P85": 4.7,
		"P90": 4.8,
		"P95": 5,
		"P97": 5.1,
		"P99": 5.3,
		"P999": 5.8
	},
	{
		"Length": 54.5,
		"L": -0.3833,
		"M": 4.4179,
		"S": 0.09106,
		"P01": 3.4,
		"P1": 3.6,
		"P3": 3.7,
		"P5": 3.8,
		"P10": 3.9,
		"P15": 4,
		"P25": 4.2,
		"P50": 4.4,
		"P75": 4.7,
		"P85": 4.9,
		"P90": 5,
		"P95": 5.2,
		"P97": 5.3,
		"P99": 5.5,
		"P999": 6
	},
	{
		"Length": 55,
		"L": -0.3833,
		"M": 4.5498,
		"S": 0.0911,
		"P01": 3.5,
		"P1": 3.7,
		"P3": 3.9,
		"P5": 3.9,
		"P10": 4.1,
		"P15": 4.1,
		"P25": 4.3,
		"P50": 4.5,
		"P75": 4.8,
		"P85": 5,
		"P90": 5.1,
		"P95": 5.3,
		"P97": 5.4,
		"P99": 5.7,
		"P999": 6.1
	},
	{
		"Length": 55.5,
		"L": -0.3833,
		"M": 4.6827,
		"S": 0.09114,
		"P01": 3.6,
		"P1": 3.8,
		"P3": 4,
		"P5": 4,
		"P10": 4.2,
		"P15": 4.3,
		"P25": 4.4,
		"P50": 4.7,
		"P75": 5,
		"P85": 5.2,
		"P90": 5.3,
		"P95": 5.5,
		"P97": 5.6,
		"P99": 5.8,
		"P999": 6.3
	},
	{
		"Length": 56,
		"L": -0.3833,
		"M": 4.8162,
		"S": 0.09118,
		"P01": 3.7,
		"P1": 3.9,
		"P3": 4.1,
		"P5": 4.2,
		"P10": 4.3,
		"P15": 4.4,
		"P25": 4.5,
		"P50": 4.8,
		"P75": 5.1,
		"P85": 5.3,
		"P90": 5.4,
		"P95": 5.6,
		"P97": 5.8,
		"P99": 6,
		"P999": 6.5
	},
	{
		"Length": 56.5,
		"L": -0.3833,
		"M": 4.95,
		"S": 0.09121,
		"P01": 3.8,
		"P1": 4,
		"P3": 4.2,
		"P5": 4.3,
		"P10": 4.4,
		"P15": 4.5,
		"P25": 4.7,
		"P50": 5,
		"P75": 5.3,
		"P85": 5.5,
		"P90": 5.6,
		"P95": 5.8,
		"P97": 5.9,
		"P99": 6.2,
		"P999": 6.7
	},
	{
		"Length": 57,
		"L": -0.3833,
		"M": 5.0837,
		"S": 0.09125,
		"P01": 3.9,
		"P1": 4.1,
		"P3": 4.3,
		"P5": 4.4,
		"P10": 4.5,
		"P15": 4.6,
		"P25": 4.8,
		"P50": 5.1,
		"P75": 5.4,
		"P85": 5.6,
		"P90": 5.7,
		"P95": 5.9,
		"P97": 6.1,
		"P99": 6.3,
		"P999": 6.9
	},
	{
		"Length": 57.5,
		"L": -0.3833,
		"M": 5.2173,
		"S": 0.09128,
		"P01": 4,
		"P1": 4.3,
		"P3": 4.4,
		"P5": 4.5,
		"P10": 4.7,
		"P15": 4.8,
		"P25": 4.9,
		"P50": 5.2,
		"P75": 5.6,
		"P85": 5.7,
		"P90": 5.9,
		"P95": 6.1,
		"P97": 6.2,
		"P99": 6.5,
		"P999": 7
	},
	{
		"Length": 58,
		"L": -0.3833,
		"M": 5.3507,
		"S": 0.0913,
		"P01": 4.1,
		"P1": 4.4,
		"P3": 4.5,
		"P5": 4.6,
		"P10": 4.8,
		"P15": 4.9,
		"P25": 5,
		"P50": 5.4,
		"P75": 5.7,
		"P85": 5.9,
		"P90": 6,
		"P95": 6.2,
		"P97": 6.4,
		"P99": 6.7,
		"P999": 7.2
	},
	{
		"Length": 58.5,
		"L": -0.3833,
		"M": 5.4834,
		"S": 0.09132,
		"P01": 4.2,
		"P1": 4.5,
		"P3": 4.6,
		"P5": 4.7,
		"P10": 4.9,
		"P15": 5,
		"P25": 5.2,
		"P50": 5.5,
		"P75": 5.8,
		"P85": 6,
		"P90": 6.2,
		"P95": 6.4,
		"P97": 6.5,
		"P99": 6.8,
		"P999": 7.4
	},
	{
		"Length": 59,
		"L": -0.3833,
		"M": 5.6151,
		"S": 0.09134,
		"P01": 4.3,
		"P1": 4.6,
		"P3": 4.8,
		"P5": 4.9,
		"P10": 5,
		"P15": 5.1,
		"P25": 5.3,
		"P50": 5.6,
		"P75": 6,
		"P85": 6.2,
		"P90": 6.3,
		"P95": 6.6,
		"P97": 6.7,
		"P99": 7,
		"P999": 7.6
	},
	{
		"Length": 59.5,
		"L": -0.3833,
		"M": 5.7454,
		"S": 0.09135,
		"P01": 4.4,
		"P1": 4.7,
		"P3": 4.9,
		"P5": 5,
		"P10": 5.1,
		"P15": 5.2,
		"P25": 5.4,
		"P50": 5.7,
		"P75": 6.1,
		"P85": 6.3,
		"P90": 6.5,
		"P95": 6.7,
		"P97": 6.9,
		"P99": 7.2,
		"P999": 7.7
	},
	{
		"Length": 60,
		"L": -0.3833,
		"M": 5.8742,
		"S": 0.09136,
		"P01": 4.5,
		"P1": 4.8,
		"P3": 5,
		"P5": 5.1,
		"P10": 5.2,
		"P15": 5.4,
		"P25": 5.5,
		"P50": 5.9,
		"P75": 6.3,
		"P85": 6.5,
		"P90": 6.6,
		"P95": 6.9,
		"P97": 7,
		"P99": 7.3,
		"P999": 7.9
	},
	{
		"Length": 60.5,
		"L": -0.3833,
		"M": 6.0014,
		"S": 0.09137,
		"P01": 4.6,
		"P1": 4.9,
		"P3": 5.1,
		"P5": 5.2,
		"P10": 5.4,
		"P15": 5.5,
		"P25": 5.6,
		"P50": 6,
		"P75": 6.4,
		"P85": 6.6,
		"P90": 6.8,
		"P95": 7,
		"P97": 7.2,
		"P99": 7.5,
		"P999": 8.1
	},
	{
		"Length": 61,
		"L": -0.3833,
		"M": 6.127,
		"S": 0.09137,
		"P01": 4.7,
		"P1": 5,
		"P3": 5.2,
		"P5": 5.3,
		"P10": 5.5,
		"P15": 5.6,
		"P25": 5.8,
		"P50": 6.1,
		"P75": 6.5,
		"P85": 6.7,
		"P90": 6.9,
		"P95": 7.2,
		"P97": 7.3,
		"P99": 7.6,
		"P999": 8.3
	},
	{
		"Length": 61.5,
		"L": -0.3833,
		"M": 6.2511,
		"S": 0.09136,
		"P01": 4.8,
		"P1": 5.1,
		"P3": 5.3,
		"P5": 5.4,
		"P10": 5.6,
		"P15": 5.7,
		"P25": 5.9,
		"P50": 6.3,
		"P75": 6.7,
		"P85": 6.9,
		"P90": 7,
		"P95": 7.3,
		"P97": 7.5,
		"P99": 7.8,
		"P999": 8.4
	},
	{
		"Length": 62,
		"L": -0.3833,
		"M": 6.3738,
		"S": 0.09135,
		"P01": 4.9,
		"P1": 5.2,
		"P3": 5.4,
		"P5": 5.5,
		"P10": 5.7,
		"P15": 5.8,
		"P25": 6,
		"P50": 6.4,
		"P75": 6.8,
		"P85": 7,
		"P90": 7.2,
		"P95": 7.4,
		"P97": 7.6,
		"P99": 8,
		"P999": 8.6
	},
	{
		"Length": 62.5,
		"L": -0.3833,
		"M": 6.4948,
		"S": 0.09133,
		"P01": 5,
		"P1": 5.3,
		"P3": 5.5,
		"P5": 5.6,
		"P10": 5.8,
		"P15": 5.9,
		"P25": 6.1,
		"P50": 6.5,
		"P75": 6.9,
		"P85": 7.2,
		"P90": 7.3,
		"P95": 7.6,
		"P97": 7.8,
		"P99": 8.1,
		"P999": 8.8
	},
	{
		"Length": 63,
		"L": -0.3833,
		"M": 6.6144,
		"S": 0.09131,
		"P01": 5.1,
		"P1": 5.4,
		"P3": 5.6,
		"P5": 5.7,
		"P10": 5.9,
		"P15": 6,
		"P25": 6.2,
		"P50": 6.6,
		"P75": 7,
		"P85": 7.3,
		"P90": 7.5,
		"P95": 7.7,
		"P97": 7.9,
		"P99": 8.3,
		"P999": 8.9
	},
	{
		"Length": 63.5,
		"L": -0.3833,
		"M": 6.7328,
		"S": 0.09129,
		"P01": 5.2,
		"P1": 5.5,
		"P3": 5.7,
		"P5": 5.8,
		"P10": 6,
		"P15": 6.1,
		"P25": 6.3,
		"P50": 6.7,
		"P75": 7.2,
		"P85": 7.4,
		"P90": 7.6,
		"P95": 7.9,
		"P97": 8,
		"P99": 8.4,
		"P999": 9.1
	},
	{
		"Length": 64,
		"L": -0.3833,
		"M": 6.8501,
		"S": 0.09126,
		"P01": 5.2,
		"P1": 5.6,
		"P3": 5.8,
		"P5": 5.9,
		"P10": 6.1,
		"P15": 6.2,
		"P25": 6.4,
		"P50": 6.9,
		"P75": 7.3,
		"P85": 7.5,
		"P90": 7.7,
		"P95": 8,
		"P97": 8.2,
		"P99": 8.5,
		"P999": 9.2
	},
	{
		"Length": 64.5,
		"L": -0.3833,
		"M": 6.9662,
		"S": 0.09123,
		"P01": 5.3,
		"P1": 5.7,
		"P3": 5.9,
		"P5": 6,
		"P10": 6.2,
		"P15": 6.3,
		"P25": 6.6,
		"P50": 7,
		"P75": 7.4,
		"P85": 7.7,
		"P90": 7.9,
		"P95": 8.1,
		"P97": 8.3,
		"P99": 8.7,
		"P999": 9.4
	},
	{
		"Length": 65,
		"L": -0.3833,
		"M": 7.0812,
		"S": 0.09119,
		"P01": 5.4,
		"P1": 5.8,
		"P3": 6,
		"P5": 6.1,
		"P10": 6.3,
		"P15": 6.5,
		"P25": 6.7,
		"P50": 7.1,
		"P75": 7.5,
		"P85": 7.8,
		"P90": 8,
		"P95": 8.3,
		"P97": 8.5,
		"P99": 8.8,
		"P999": 9.5
	},
	{
		"Length": 65.5,
		"L": -0.3833,
		"M": 7.195,
		"S": 0.09115,
		"P01": 5.5,
		"P1": 5.9,
		"P3": 6.1,
		"P5": 6.2,
		"P10": 6.4,
		"P15": 6.6,
		"P25": 6.8,
		"P50": 7.2,
		"P75": 7.7,
		"P85": 7.9,
		"P90": 8.1,
		"P95": 8.4,
		"P97": 8.6,
		"P99": 9,
		"P999": 9.7
	},
	{
		"Length": 66,
		"L": -0.3833,
		"M": 7.3076,
		"S": 0.0911,
		"P01": 5.6,
		"P1": 6,
		"P3": 6.2,
		"P5": 6.3,
		"P10": 6.5,
		"P15": 6.7,
		"P25": 6.9,
		"P50": 7.3,
		"P75": 7.8,
		"P85": 8,
		"P90": 8.2,
		"P95": 8.5,
		"P97": 8.7,
		"P99": 9.1,
		"P999": 9.8
	},
	{
		"Length": 66.5,
		"L": -0.3833,
		"M": 7.4189,
		"S": 0.09106,
		"P01": 5.7,
		"P1": 6.1,
		"P3": 6.3,
		"P5": 6.4,
		"P10": 6.6,
		"P15": 6.8,
		"P25": 7,
		"P50": 7.4,
		"P75": 7.9,
		"P85": 8.2,
		"P90": 8.4,
		"P95": 8.7,
		"P97": 8.9,
		"P99": 9.3,
		"P999": 10
	},
	{
		"Length": 67,
		"L": -0.3833,
		"M": 7.5288,
		"S": 0.09101,
		"P01": 5.8,
		"P1": 6.1,
		"P3": 6.4,
		"P5": 6.5,
		"P10": 6.7,
		"P15": 6.9,
		"P25": 7.1,
		"P50": 7.5,
		"P75": 8,
		"P85": 8.3,
		"P90": 8.5,
		"P95": 8.8,
		"P97": 9,
		"P99": 9.4,
		"P999": 10.1
	},
	{
		"Length": 67.5,
		"L": -0.3833,
		"M": 7.6375,
		"S": 0.09096,
		"P01": 5.8,
		"P1": 6.2,
		"P3": 6.5,
		"P5": 6.6,
		"P10": 6.8,
		"P15": 7,
		"P25": 7.2,
		"P50": 7.6,
		"P75": 8.1,
		"P85": 8.4,
		"P90": 8.6,
		"P95": 8.9,
		"P97": 9.1,
		"P99": 9.5,
		"P999": 10.3
	},
	{
		"Length": 68,
		"L": -0.3833,
		"M": 7.7448,
		"S": 0.0909,
		"P01": 5.9,
		"P1": 6.3,
		"P3": 6.6,
		"P5": 6.7,
		"P10": 6.9,
		"P15": 7.1,
		"P25": 7.3,
		"P50": 7.7,
		"P75": 8.2,
		"P85": 8.5,
		"P90": 8.7,
		"P95": 9,
		"P97": 9.2,
		"P99": 9.7,
		"P999": 10.4
	},
	{
		"Length": 68.5,
		"L": -0.3833,
		"M": 7.8509,
		"S": 0.09085,
		"P01": 6,
		"P1": 6.4,
		"P3": 6.7,
		"P5": 6.8,
		"P10": 7,
		"P15": 7.2,
		"P25": 7.4,
		"P50": 7.9,
		"P75": 8.4,
		"P85": 8.6,
		"P90": 8.8,
		"P95": 9.2,
		"P97": 9.4,
		"P99": 9.8,
		"P999": 10.6
	},
	{
		"Length": 69,
		"L": -0.3833,
		"M": 7.9559,
		"S": 0.09079,
		"P01": 6.1,
		"P1": 6.5,
		"P3": 6.7,
		"P5": 6.9,
		"P10": 7.1,
		"P15": 7.3,
		"P25": 7.5,
		"P50": 8,
		"P75": 8.5,
		"P85": 8.8,
		"P90": 9,
		"P95": 9.3,
		"P97": 9.5,
		"P99": 9.9,
		"P999": 10.7
	},
	{
		"Length": 69.5,
		"L": -0.3833,
		"M": 8.0599,
		"S": 0.09074,
		"P01": 6.2,
		"P1": 6.6,
		"P3": 6.8,
		"P5": 7,
		"P10": 7.2,
		"P15": 7.3,
		"P25": 7.6,
		"P50": 8.1,
		"P75": 8.6,
		"P85": 8.9,
		"P90": 9.1,
		"P95": 9.4,
		"P97": 9.6,
		"P99": 10,
		"P999": 10.8
	},
	{
		"Length": 70,
		"L": -0.3833,
		"M": 8.163,
		"S": 0.09068,
		"P01": 6.3,
		"P1": 6.7,
		"P3": 6.9,
		"P5": 7.1,
		"P10": 7.3,
		"P15": 7.4,
		"P25": 7.7,
		"P50": 8.2,
		"P75": 8.7,
		"P85": 9,
		"P90": 9.2,
		"P95": 9.5,
		"P97": 9.7,
		"P99": 10.2,
		"P999": 11
	},
	{
		"Length": 70.5,
		"L": -0.3833,
		"M": 8.2651,
		"S": 0.09062,
		"P01": 6.3,
		"P1": 6.7,
		"P3": 7,
		"P5": 7.1,
		"P10": 7.4,
		"P15": 7.5,
		"P25": 7.8,
		"P50": 8.3,
		"P75": 8.8,
		"P85": 9.1,
		"P90": 9.3,
		"P95": 9.6,
		"P97": 9.9,
		"P99": 10.3,
		"P999": 11.1
	},
	{
		"Length": 71,
		"L": -0.3833,
		"M": 8.3666,
		"S": 0.09056,
		"P01": 6.4,
		"P1": 6.8,
		"P3": 7.1,
		"P5": 7.2,
		"P10": 7.5,
		"P15": 7.6,
		"P25": 7.9,
		"P50": 8.4,
		"P75": 8.9,
		"P85": 9.2,
		"P90": 9.4,
		"P95": 9.8,
		"P97": 10,
		"P99": 10.4,
		"P999": 11.2
	},
	{
		"Length": 71.5,
		"L": -0.3833,
		"M": 8.4676,
		"S": 0.0905,
		"P01": 6.5,
		"P1": 6.9,
		"P3": 7.2,
		"P5": 7.3,
		"P10": 7.6,
		"P15": 7.7,
		"P25": 8,
		"P50": 8.5,
		"P75": 9,
		"P85": 9.3,
		"P90": 9.5,
		"P95": 9.9,
		"P97": 10.1,
		"P99": 10.5,
		"P999": 11.4
	},
	{
		"Length": 72,
		"L": -0.3833,
		"M": 8.5679,
		"S": 0.09043,
		"P01": 6.6,
		"P1": 7,
		"P3": 7.3,
		"P5": 7.4,
		"P10": 7.6,
		"P15": 7.8,
		"P25": 8.1,
		"P50": 8.6,
		"P75": 9.1,
		"P85": 9.4,
		"P90": 9.6,
		"P95": 10,
		"P97": 10.2,
		"P99": 10.7,
		"P999": 11.5
	},
	{
		"Length": 72.5,
		"L": -0.3833,
		"M": 8.6674,
		"S": 0.09037,
		"P01": 6.6,
		"P1": 7.1,
		"P3": 7.4,
		"P5": 7.5,
		"P10": 7.7,
		"P15": 7.9,
		"P25": 8.2,
		"P50": 8.7,
		"P75": 9.2,
		"P85": 9.5,
		"P90": 9.8,
		"P95": 10.1,
		"P97": 10.3,
		"P99": 10.8,
		"P999": 11.6
	},
	{
		"Length": 73,
		"L": -0.3833,
		"M": 8.7661,
		"S": 0.09031,
		"P01": 6.7,
		"P1": 7.2,
		"P3": 7.4,
		"P5": 7.6,
		"P10": 7.8,
		"P15": 8,
		"P25": 8.3,
		"P50": 8.8,
		"P75": 9.3,
		"P85": 9.6,
		"P90": 9.9,
		"P95": 10.2,
		"P97": 10.4,
		"P99": 10.9,
		"P999": 11.8
	},
	{
		"Length": 73.5,
		"L": -0.3833,
		"M": 8.8638,
		"S": 0.09025,
		"P01": 6.8,
		"P1": 7.2,
		"P3": 7.5,
		"P5": 7.7,
		"P10": 7.9,
		"P15": 8.1,
		"P25": 8.3,
		"P50": 8.9,
		"P75": 9.4,
		"P85": 9.7,
		"P90": 10,
		"P95": 10.3,
		"P97": 10.6,
		"P99": 11,
		"P999": 11.9
	},
	{
		"Length": 74,
		"L": -0.3833,
		"M": 8.9601,
		"S": 0.09018,
		"P01": 6.9,
		"P1": 7.3,
		"P3": 7.6,
		"P5": 7.8,
		"P10": 8,
		"P15": 8.2,
		"P25": 8.4,
		"P50": 9,
		"P75": 9.5,
		"P85": 9.9,
		"P90": 10.1,
		"P95": 10.4,
		"P97": 10.7,
		"P99": 11.2,
		"P999": 12
	},
	{
		"Length": 74.5,
		"L": -0.3833,
		"M": 9.0552,
		"S": 0.09012,
		"P01": 6.9,
		"P1": 7.4,
		"P3": 7.7,
		"P5": 7.8,
		"P10": 8.1,
		"P15": 8.3,
		"P25": 8.5,
		"P50": 9.1,
		"P75": 9.6,
		"P85": 10,
		"P90": 10.2,
		"P95": 10.5,
		"P97": 10.8,
		"P99": 11.3,
		"P999": 12.2
	},
	{
		"Length": 75,
		"L": -0.3833,
		"M": 9.149,
		"S": 0.09005,
		"P01": 7,
		"P1": 7.5,
		"P3": 7.8,
		"P5": 7.9,
		"P10": 8.2,
		"P15": 8.3,
		"P25": 8.6,
		"P50": 9.1,
		"P75": 9.7,
		"P85": 10.1,
		"P90": 10.3,
		"P95": 10.7,
		"P97": 10.9,
		"P99": 11.4,
		"P999": 12.3
	},
	{
		"Length": 75.5,
		"L": -0.3833,
		"M": 9.2418,
		"S": 0.08999,
		"P01": 7.1,
		"P1": 7.6,
		"P3": 7.8,
		"P5": 8,
		"P10": 8.3,
		"P15": 8.4,
		"P25": 8.7,
		"P50": 9.2,
		"P75": 9.8,
		"P85": 10.2,
		"P90": 10.4,
		"P95": 10.8,
		"P97": 11,
		"P99": 11.5,
		"P999": 12.4
	},
	{
		"Length": 76,
		"L": -0.3833,
		"M": 9.3337,
		"S": 0.08992,
		"P01": 7.2,
		"P1": 7.6,
		"P3": 7.9,
		"P5": 8.1,
		"P10": 8.3,
		"P15": 8.5,
		"P25": 8.8,
		"P50": 9.3,
		"P75": 9.9,
		"P85": 10.3,
		"P90": 10.5,
		"P95": 10.9,
		"P97": 11.1,
		"P99": 11.6,
		"P999": 12.5
	},
	{
		"Length": 76.5,
		"L": -0.3833,
		"M": 9.4252,
		"S": 0.08985,
		"P01": 7.2,
		"P1": 7.7,
		"P3": 8,
		"P5": 8.2,
		"P10": 8.4,
		"P15": 8.6,
		"P25": 8.9,
		"P50": 9.4,
		"P75": 10,
		"P85": 10.4,
		"P90": 10.6,
		"P95": 11,
		"P97": 11.2,
		"P99": 11.7,
		"P999": 12.6
	},
	{
		"Length": 77,
		"L": -0.3833,
		"M": 9.5166,
		"S": 0.08979,
		"P01": 7.3,
		"P1": 7.8,
		"P3": 8.1,
		"P5": 8.2,
		"P10": 8.5,
		"P15": 8.7,
		"P25": 9,
		"P50": 9.5,
		"P75": 10.1,
		"P85": 10.5,
		"P90": 10.7,
		"P95": 11.1,
		"P97": 11.3,
		"P99": 11.8,
		"P999": 12.8
	},
	{
		"Length": 77.5,
		"L": -0.3833,
		"M": 9.6086,
		"S": 0.08972,
		"P01": 7.4,
		"P1": 7.9,
		"P3": 8.2,
		"P5": 8.3,
		"P10": 8.6,
		"P15": 8.8,
		"P25": 9.1,
		"P50": 9.6,
		"P75": 10.2,
		"P85": 10.6,
		"P90": 10.8,
		"P95": 11.2,
		"P97": 11.4,
		"P99": 11.9,
		"P999": 12.9
	},
	{
		"Length": 78,
		"L": -0.3833,
		"M": 9.7015,
		"S": 0.08965,
		"P01": 7.5,
		"P1": 7.9,
		"P3": 8.2,
		"P5": 8.4,
		"P10": 8.7,
		"P15": 8.9,
		"P25": 9.1,
		"P50": 9.7,
		"P75": 10.3,
		"P85": 10.7,
		"P90": 10.9,
		"P95": 11.3,
		"P97": 11.5,
		"P99": 12.1,
		"P999": 13
	},
	{
		"Length": 78.5,
		"L": -0.3833,
		"M": 9.7957,
		"S": 0.08959,
		"P01": 7.5,
		"P1": 8,
		"P3": 8.3,
		"P5": 8.5,
		"P10": 8.8,
		"P15": 8.9,
		"P25": 9.2,
		"P50": 9.8,
		"P75": 10.4,
		"P85": 10.8,
		"P90": 11,
		"P95": 11.4,
		"P97": 11.7,
		"P99": 12.2,
		"P999": 13.1
	},
	{
		"Length": 79,
		"L": -0.3833,
		"M": 9.8915,
		"S": 0.08952,
		"P01": 7.6,
		"P1": 8.1,
		"P3": 8.4,
		"P5": 8.6,
		"P10": 8.8,
		"P15": 9,
		"P25": 9.3,
		"P50": 9.9,
		"P75": 10.5,
		"P85": 10.9,
		"P90": 11.1,
		"P95": 11.5,
		"P97": 11.8,
		"P99": 12.3,
		"P999": 13.3
	},
	{
		"Length": 79.5,
		"L": -0.3833,
		"M": 9.9892,
		"S": 0.08946,
		"P01": 7.7,
		"P1": 8.2,
		"P3": 8.5,
		"P5": 8.7,
		"P10": 8.9,
		"P15": 9.1,
		"P25": 9.4,
		"P50": 10,
		"P75": 10.6,
		"P85": 11,
		"P90": 11.2,
		"P95": 11.6,
		"P97": 11.9,
		"P99": 12.4,
		"P999": 13.4
	},
	{
		"Length": 80,
		"L": -0.3833,
		"M": 10.0891,
		"S": 0.0894,
		"P01": 7.8,
		"P1": 8.3,
		"P3": 8.6,
		"P5": 8.7,
		"P10": 9,
		"P15": 9.2,
		"P25": 9.5,
		"P50": 10.1,
		"P75": 10.7,
		"P85": 11.1,
		"P90": 11.3,
		"P95": 11.7,
		"P97": 12,
		"P99": 12.5,
		"P999": 13.5
	},
	{
		"Length": 80.5,
		"L": -0.3833,
		"M": 10.1916,
		"S": 0.08934,
		"P01": 7.8,
		"P1": 8.3,
		"P3": 8.7,
		"P5": 8.8,
		"P10": 9.1,
		"P15": 9.3,
		"P25": 9.6,
		"P50": 10.2,
		"P75": 10.8,
		"P85": 11.2,
		"P90": 11.5,
		"P95": 11.9,
		"P97": 12.1,
		"P99": 12.7,
		"P999": 13.6
	},
	{
		"Length": 81,
		"L": -0.3833,
		"M": 10.2965,
		"S": 0.08928,
		"P01": 7.9,
		"P1": 8.4,
		"P3": 8.8,
		"P5": 8.9,
		"P10": 9.2,
		"P15": 9.4,
		"P25": 9.7,
		"P50": 10.3,
		"P75": 10.9,
		"P85": 11.3,
		"P90": 11.6,
		"P95": 12,
		"P97": 12.2,
		"P99": 12.8,
		"P999": 13.8
	},
	{
		"Length": 81.5,
		"L": -0.3833,
		"M": 10.4041,
		"S": 0.08923,
		"P01": 8,
		"P1": 8.5,
		"P3": 8.8,
		"P5": 9,
		"P10": 9.3,
		"P15": 9.5,
		"P25": 9.8,
		"P50": 10.4,
		"P75": 11.1,
		"P85": 11.4,
		"P90": 11.7,
		"P95": 12.1,
		"P97": 12.4,
		"P99": 12.9,
		"P999": 13.9
	},
	{
		"Length": 82,
		"L": -0.3833,
		"M": 10.514,
		"S": 0.08918,
		"P01": 8.1,
		"P1": 8.6,
		"P3": 8.9,
		"P5": 9.1,
		"P10": 9.4,
		"P15": 9.6,
		"P25": 9.9,
		"P50": 10.5,
		"P75": 11.2,
		"P85": 11.6,
		"P90": 11.8,
		"P95": 12.2,
		"P97": 12.5,
		"P99": 13.1,
		"P999": 14.1
	},
	{
		"Length": 82.5,
		"L": -0.3833,
		"M": 10.6263,
		"S": 0.08914,
		"P01": 8.2,
		"P1": 8.7,
		"P3": 9,
		"P5": 9.2,
		"P10": 9.5,
		"P15": 9.7,
		"P25": 10,
		"P50": 10.6,
		"P75": 11.3,
		"P85": 11.7,
		"P90": 11.9,
		"P95": 12.4,
		"P97": 12.6,
		"P99": 13.2,
		"P999": 14.2
	},
	{
		"Length": 83,
		"L": -0.3833,
		"M": 10.741,
		"S": 0.0891,
		"P01": 8.3,
		"P1": 8.8,
		"P3": 9.1,
		"P5": 9.3,
		"P10": 9.6,
		"P15": 9.8,
		"P25": 10.1,
		"P50": 10.7,
		"P75": 11.4,
		"P85": 11.8,
		"P90": 12.1,
		"P95": 12.5,
		"P97": 12.8,
		"P99": 13.3,
		"P999": 14.4
	},
	{
		"Length": 83.5,
		"L": -0.3833,
		"M": 10.8578,
		"S": 0.08906,
		"P01": 8.4,
		"P1": 8.9,
		"P3": 9.2,
		"P5": 9.4,
		"P10": 9.7,
		"P15": 9.9,
		"P25": 10.2,
		"P50": 10.9,
		"P75": 11.5,
		"P85": 11.9,
		"P90": 12.2,
		"P95": 12.6,
		"P97": 12.9,
		"P99": 13.5,
		"P999": 14.5
	},
	{
		"Length": 84,
		"L": -0.3833,
		"M": 10.9767,
		"S": 0.08903,
		"P01": 8.5,
		"P1": 9,
		"P3": 9.3,
		"P5": 9.5,
		"P10": 9.8,
		"P15": 10,
		"P25": 10.3,
		"P50": 11,
		"P75": 11.7,
		"P85": 12.1,
		"P90": 12.3,
		"P95": 12.8,
		"P97": 13.1,
		"P99": 13.6,
		"P999": 14.7
	},
	{
		"Length": 84.5,
		"L": -0.3833,
		"M": 11.0974,
		"S": 0.089,
		"P01": 8.5,
		"P1": 9.1,
		"P3": 9.4,
		"P5": 9.6,
		"P10": 9.9,
		"P15": 10.1,
		"P25": 10.5,
		"P50": 11.1,
		"P75": 11.8,
		"P85": 12.2,
		"P90": 12.5,
		"P95": 12.9,
		"P97": 13.2,
		"P99": 13.8,
		"P999": 14.8
	},
	{
		"Length": 85,
		"L": -0.3833,
		"M": 11.2198,
		"S": 0.08898,
		"P01": 8.6,
		"P1": 9.2,
		"P3": 9.5,
		"P5": 9.7,
		"P10": 10,
		"P15": 10.2,
		"P25": 10.6,
		"P50": 11.2,
		"P75": 11.9,
		"P85": 12.3,
		"P90": 12.6,
		"P95": 13,
		"P97": 13.3,
		"P99": 13.9,
		"P999": 15
	},
	{
		"Length": 85.5,
		"L": -0.3833,
		"M": 11.3435,
		"S": 0.08897,
		"P01": 8.7,
		"P1": 9.3,
		"P3": 9.6,
		"P5": 9.8,
		"P10": 10.1,
		"P15": 10.4,
		"P25": 10.7,
		"P50": 11.3,
		"P75": 12.1,
		"P85": 12.5,
		"P90": 12.7,
		"P95": 13.2,
		"P97": 13.5,
		"P99": 14.1,
		"P999": 15.2
	},
	{
		"Length": 86,
		"L": -0.3833,
		"M": 11.4684,
		"S": 0.08895,
		"P01": 8.8,
		"P1": 9.4,
		"P3": 9.8,
		"P5": 9.9,
		"P10": 10.3,
		"P15": 10.5,
		"P25": 10.8,
		"P50": 11.5,
		"P75": 12.2,
		"P85": 12.6,
		"P90": 12.9,
		"P95": 13.3,
		"P97": 13.6,
		"P99": 14.2,
		"P999": 15.3
	},
	{
		"Length": 86.5,
		"L": -0.3833,
		"M": 11.594,
		"S": 0.08895,
		"P01": 8.9,
		"P1": 9.5,
		"P3": 9.9,
		"P5": 10.1,
		"P10": 10.4,
		"P15": 10.6,
		"P25": 10.9,
		"P50": 11.6,
		"P75": 12.3,
		"P85": 12.7,
		"P90": 13,
		"P95": 13.5,
		"P97": 13.8,
		"P99": 14.4,
		"P999": 15.5
	},
	{
		"Length": 87,
		"L": -0.3833,
		"M": 11.7201,
		"S": 0.08895,
		"P01": 9,
		"P1": 9.6,
		"P3": 10,
		"P5": 10.2,
		"P10": 10.5,
		"P15": 10.7,
		"P25": 11,
		"P50": 11.7,
		"P75": 12.5,
		"P85": 12.9,
		"P90": 13.2,
		"P95": 13.6,
		"P97": 13.9,
		"P99": 14.5,
		"P999": 15.7
	},
	{
		"Length": 87.5,
		"L": -0.3833,
		"M": 11.8461,
		"S": 0.08895,
		"P01": 9.1,
		"P1": 9.7,
		"P3": 10.1,
		"P5": 10.3,
		"P10": 10.6,
		"P15": 10.8,
		"P25": 11.2,
		"P50": 11.8,
		"P75": 12.6,
		"P85": 13,
		"P90": 13.3,
		"P95": 13.8,
		"P97": 14.1,
		"P99": 14.7,
		"P999": 15.8
	},
	{
		"Length": 88,
		"L": -0.3833,
		"M": 11.972,
		"S": 0.08896,
		"P01": 9.2,
		"P1": 9.8,
		"P3": 10.2,
		"P5": 10.4,
		"P10": 10.7,
		"P15": 10.9,
		"P25": 11.3,
		"P50": 12,
		"P75": 12.7,
		"P85": 13.2,
		"P90": 13.5,
		"P95": 13.9,
		"P97": 14.2,
		"P99": 14.9,
		"P999": 16
	},
	{
		"Length": 88.5,
		"L": -0.3833,
		"M": 12.0976,
		"S": 0.08898,
		"P01": 9.3,
		"P1": 9.9,
		"P3": 10.3,
		"P5": 10.5,
		"P10": 10.8,
		"P15": 11,
		"P25": 11.4,
		"P50": 12.1,
		"P75": 12.9,
		"P85": 13.3,
		"P90": 13.6,
		"P95": 14.1,
		"P97": 14.4,
		"P99": 15,
		"P999": 16.2
	},
	{
		"Length": 89,
		"L": -0.3833,
		"M": 12.2229,
		"S": 0.089,
		"P01": 9.4,
		"P1": 10,
		"P3": 10.4,
		"P5": 10.6,
		"P10": 10.9,
		"P15": 11.2,
		"P25": 11.5,
		"P50": 12.2,
		"P75": 13,
		"P85": 13.4,
		"P90": 13.7,
		"P95": 14.2,
		"P97": 14.5,
		"P99": 15.2,
		"P999": 16.3
	},
	{
		"Length": 89.5,
		"L": -0.3833,
		"M": 12.3477,
		"S": 0.08903,
		"P01": 9.5,
		"P1": 10.1,
		"P3": 10.5,
		"P5": 10.7,
		"P10": 11,
		"P15": 11.3,
		"P25": 11.6,
		"P50": 12.3,
		"P75": 13.1,
		"P85": 13.6,
		"P90": 13.9,
		"P95": 14.4,
		"P97": 14.7,
		"P99": 15.3,
		"P999": 16.5
	},
	{
		"Length": 90,
		"L": -0.3833,
		"M": 12.4723,
		"S": 0.08906,
		"P01": 9.6,
		"P1": 10.2,
		"P3": 10.6,
		"P5": 10.8,
		"P10": 11.2,
		"P15": 11.4,
		"P25": 11.8,
		"P50": 12.5,
		"P75": 13.3,
		"P85": 13.7,
		"P90": 14,
		"P95": 14.5,
		"P97": 14.8,
		"P99": 15.5,
		"P999": 16.7
	},
	{
		"Length": 90.5,
		"L": -0.3833,
		"M": 12.5965,
		"S": 0.08909,
		"P01": 9.7,
		"P1": 10.3,
		"P3": 10.7,
		"P5": 10.9,
		"P10": 11.3,
		"P15": 11.5,
		"P25": 11.9,
		"P50": 12.6,
		"P75": 13.4,
		"P85": 13.8,
		"P90": 14.2,
		"P95": 14.6,
		"P97": 15,
		"P99": 15.6,
		"P999": 16.9
	},
	{
		"Length": 91,
		"L": -0.3833,
		"M": 12.7205,
		"S": 0.08913,
		"P01": 9.8,
		"P1": 10.4,
		"P3": 10.8,
		"P5": 11,
		"P10": 11.4,
		"P15": 11.6,
		"P25": 12,
		"P50": 12.7,
		"P75": 13.5,
		"P85": 14,
		"P90": 14.3,
		"P95": 14.8,
		"P97": 15.1,
		"P99": 15.8,
		"P999": 17
	},
	{
		"Length": 91.5,
		"L": -0.3833,
		"M": 12.8443,
		"S": 0.08918,
		"P01": 9.9,
		"P1": 10.5,
		"P3": 10.9,
		"P5": 11.1,
		"P10": 11.5,
		"P15": 11.7,
		"P25": 12.1,
		"P50": 12.8,
		"P75": 13.7,
		"P85": 14.1,
		"P90": 14.4,
		"P95": 14.9,
		"P97": 15.3,
		"P99": 15.9,
		"P999": 17.2
	},
	{
		"Length": 92,
		"L": -0.3833,
		"M": 12.9681,
		"S": 0.08923,
		"P01": 10,
		"P1": 10.6,
		"P3": 11,
		"P5": 11.2,
		"P10": 11.6,
		"P15": 11.8,
		"P25": 12.2,
		"P50": 13,
		"P75": 13.8,
		"P85": 14.2,
		"P90": 14.6,
		"P95": 15.1,
		"P97": 15.4,
		"P99": 16.1,
		"P999": 17.4
	},
	{
		"Length": 92.5,
		"L": -0.3833,
		"M": 13.092,
		"S": 0.08928,
		"P01": 10.1,
		"P1": 10.7,
		"P3": 11.1,
		"P5": 11.3,
		"P10": 11.7,
		"P15": 12,
		"P25": 12.3,
		"P50": 13.1,
		"P75": 13.9,
		"P85": 14.4,
		"P90": 14.7,
		"P95": 15.2,
		"P97": 15.6,
		"P99": 16.3,
		"P999": 17.5
	},
	{
		"Length": 93,
		"L": -0.3833,
		"M": 13.2158,
		"S": 0.08934,
		"P01": 10.2,
		"P1": 10.8,
		"P3": 11.2,
		"P5": 11.5,
		"P10": 11.8,
		"P15": 12.1,
		"P25": 12.5,
		"P50": 13.2,
		"P75": 14,
		"P85": 14.5,
		"P90": 14.9,
		"P95": 15.4,
		"P97": 15.7,
		"P99": 16.4,
		"P999": 17.7
	},
	{
		"Length": 93.5,
		"L": -0.3833,
		"M": 13.3399,
		"S": 0.08941,
		"P01": 10.3,
		"P1": 10.9,
		"P3": 11.3,
		"P5": 11.6,
		"P10": 11.9,
		"P15": 12.2,
		"P25": 12.6,
		"P50": 13.3,
		"P75": 14.2,
		"P85": 14.7,
		"P90": 15,
		"P95": 15.5,
		"P97": 15.9,
		"P99": 16.6,
		"P999": 17.9
	},
	{
		"Length": 94,
		"L": -0.3833,
		"M": 13.4643,
		"S": 0.08948,
		"P01": 10.4,
		"P1": 11,
		"P3": 11.4,
		"P5": 11.7,
		"P10": 12,
		"P15": 12.3,
		"P25": 12.7,
		"P50": 13.5,
		"P75": 14.3,
		"P85": 14.8,
		"P90": 15.1,
		"P95": 15.7,
		"P97": 16,
		"P99": 16.7,
		"P999": 18
	},
	{
		"Length": 94.5,
		"L": -0.3833,
		"M": 13.5892,
		"S": 0.08955,
		"P01": 10.4,
		"P1": 11.1,
		"P3": 11.5,
		"P5": 11.8,
		"P10": 12.1,
		"P15": 12.4,
		"P25": 12.8,
		"P50": 13.6,
		"P75": 14.4,
		"P85": 14.9,
		"P90": 15.3,
		"P95": 15.8,
		"P97": 16.2,
		"P99": 16.9,
		"P999": 18.2
	},
	{
		"Length": 95,
		"L": -0.3833,
		"M": 13.7146,
		"S": 0.08963,
		"P01": 10.5,
		"P1": 11.2,
		"P3": 11.6,
		"P5": 11.9,
		"P10": 12.3,
		"P15": 12.5,
		"P25": 12.9,
		"P50": 13.7,
		"P75": 14.6,
		"P85": 15.1,
		"P90": 15.4,
		"P95": 16,
		"P97": 16.3,
		"P99": 17,
		"P999": 18.4
	},
	{
		"Length": 95.5,
		"L": -0.3833,
		"M": 13.8408,
		"S": 0.08972,
		"P01": 10.6,
		"P1": 11.3,
		"P3": 11.8,
		"P5": 12,
		"P10": 12.4,
		"P15": 12.6,
		"P25": 13,
		"P50": 13.8,
		"P75": 14.7,
		"P85": 15.2,
		"P90": 15.6,
		"P95": 16.1,
		"P97": 16.5,
		"P99": 17.2,
		"P999": 18.6
	},
	{
		"Length": 96,
		"L": -0.3833,
		"M": 13.9676,
		"S": 0.08981,
		"P01": 10.7,
		"P1": 11.4,
		"P3": 11.9,
		"P5": 12.1,
		"P10": 12.5,
		"P15": 12.7,
		"P25": 13.2,
		"P50": 14,
		"P75": 14.9,
		"P85": 15.4,
		"P90": 15.7,
		"P95": 16.3,
		"P97": 16.6,
		"P99": 17.4,
		"P999": 18.7
	},
	{
		"Length": 96.5,
		"L": -0.3833,
		"M": 14.0953,
		"S": 0.0899,
		"P01": 10.8,
		"P1": 11.5,
		"P3": 12,
		"P5": 12.2,
		"P10": 12.6,
		"P15": 12.9,
		"P25": 13.3,
		"P50": 14.1,
		"P75": 15,
		"P85": 15.5,
		"P90": 15.9,
		"P95": 16.4,
		"P97": 16.8,
		"P99": 17.5,
		"P999": 18.9
	},
	{
		"Length": 97,
		"L": -0.3833,
		"M": 14.2239,
		"S": 0.09,
		"P01": 10.9,
		"P1": 11.6,
		"P3": 12.1,
		"P5": 12.3,
		"P10": 12.7,
		"P15": 13,
		"P25": 13.4,
		"P50": 14.2,
		"P75": 15.1,
		"P85": 15.6,
		"P90": 16,
		"P95": 16.6,
		"P97": 16.9,
		"P99": 17.7,
		"P999": 19.1
	},
	{
		"Length": 97.5,
		"L": -0.3833,
		"M": 14.3537,
		"S": 0.0901,
		"P01": 11,
		"P1": 11.7,
		"P3": 12.2,
		"P5": 12.4,
		"P10": 12.8,
		"P15": 13.1,
		"P25": 13.5,
		"P50": 14.4,
		"P75": 15.3,
		"P85": 15.8,
		"P90": 16.2,
		"P95": 16.7,
		"P97": 17.1,
		"P99": 17.9,
		"P999": 19.3
	},
	{
		"Length": 98,
		"L": -0.3833,
		"M": 14.4848,
		"S": 0.09021,
		"P01": 11.1,
		"P1": 11.8,
		"P3": 12.3,
		"P5": 12.5,
		"P10": 12.9,
		"P15": 13.2,
		"P25": 13.6,
		"P50": 14.5,
		"P75": 15.4,
		"P85": 15.9,
		"P90": 16.3,
		"P95": 16.9,
		"P97": 17.3,
		"P99": 18,
		"P999": 19.5
	},
	{
		"Length": 98.5,
		"L": -0.3833,
		"M": 14.6174,
		"S": 0.09033,
		"P01": 11.2,
		"P1": 11.9,
		"P3": 12.4,
		"P5": 12.7,
		"P10": 13.1,
		"P15": 13.3,
		"P25": 13.8,
		"P50": 14.6,
		"P75": 15.5,
		"P85": 16.1,
		"P90": 16.5,
		"P95": 17,
		"P97": 17.4,
		"P99": 18.2,
		"P999": 19.6
	},
	{
		"Length": 99,
		"L": -0.3833,
		"M": 14.7519,
		"S": 0.09044,
		"P01": 11.3,
		"P1": 12,
		"P3": 12.5,
		"P5": 12.8,
		"P10": 13.2,
		"P15": 13.5,
		"P25": 13.9,
		"P50": 14.8,
		"P75": 15.7,
		"P85": 16.2,
		"P90": 16.6,
		"P95": 17.2,
		"P97": 17.6,
		"P99": 18.4,
		"P999": 19.8
	},
	{
		"Length": 99.5,
		"L": -0.3833,
		"M": 14.8882,
		"S": 0.09057,
		"P01": 11.4,
		"P1": 12.2,
		"P3": 12.6,
		"P5": 12.9,
		"P10": 13.3,
		"P15": 13.6,
		"P25": 14,
		"P50": 14.9,
		"P75": 15.8,
		"P85": 16.4,
		"P90": 16.8,
		"P95": 17.4,
		"P97": 17.8,
		"P99": 18.5,
		"P999": 20
	},
	{
		"Length": 100,
		"L": -0.3833,
		"M": 15.0267,
		"S": 0.09069,
		"P01": 11.5,
		"P1": 12.3,
		"P3": 12.7,
		"P5": 13,
		"P10": 13.4,
		"P15": 13.7,
		"P25": 14.1,
		"P50": 15,
		"P75": 16,
		"P85": 16.5,
		"P90": 16.9,
		"P95": 17.5,
		"P97": 17.9,
		"P99": 18.7,
		"P999": 20.2
	},
	{
		"Length": 100.5,
		"L": -0.3833,
		"M": 15.1676,
		"S": 0.09083,
		"P01": 11.6,
		"P1": 12.4,
		"P3": 12.9,
		"P5": 13.1,
		"P10": 13.5,
		"P15": 13.8,
		"P25": 14.3,
		"P50": 15.2,
		"P75": 16.1,
		"P85": 16.7,
		"P90": 17.1,
		"P95": 17.7,
		"P97": 18.1,
		"P99": 18.9,
		"P999": 20.4
	},
	{
		"Length": 101,
		"L": -0.3833,
		"M": 15.3108,
		"S": 0.09096,
		"P01": 11.7,
		"P1": 12.5,
		"P3": 13,
		"P5": 13.2,
		"P10": 13.7,
		"P15": 14,
		"P25": 14.4,
		"P50": 15.3,
		"P75": 16.3,
		"P85": 16.9,
		"P90": 17.3,
		"P95": 17.9,
		"P97": 18.3,
		"P99": 19.1,
		"P999": 20.6
	},
	{
		"Length": 101.5,
		"L": -0.3833,
		"M": 15.4564,
		"S": 0.0911,
		"P01": 11.8,
		"P1": 12.6,
		"P3": 13.1,
		"P5": 13.4,
		"P10": 13.8,
		"P15": 14.1,
		"P25": 14.5,
		"P50": 15.5,
		"P75": 16.4,
		"P85": 17,
		"P90": 17.4,
		"P95": 18,
		"P97": 18.5,
		"P99": 19.3,
		"P999": 20.8
	},
	{
		"Length": 102,
		"L": -0.3833,
		"M": 15.6046,
		"S": 0.09125,
		"P01": 11.9,
		"P1": 12.7,
		"P3": 13.2,
		"P5": 13.5,
		"P10": 13.9,
		"P15": 14.2,
		"P25": 14.7,
		"P50": 15.6,
		"P75": 16.6,
		"P85": 17.2,
		"P90": 17.6,
		"P95": 18.2,
		"P97": 18.6,
		"P99": 19.5,
		"P999": 21
	},
	{
		"Length": 102.5,
		"L": -0.3833,
		"M": 15.7553,
		"S": 0.09139,
		"P01": 12,
		"P1": 12.8,
		"P3": 13.3,
		"P5": 13.6,
		"P10": 14,
		"P15": 14.4,
		"P25": 14.8,
		"P50": 15.8,
		"P75": 16.8,
		"P85": 17.4,
		"P90": 17.8,
		"P95": 18.4,
		"P97": 18.8,
		"P99": 19.7,
		"P999": 21.2
	},
	{
		"Length": 103,
		"L": -0.3833,
		"M": 15.9087,
		"S": 0.09155,
		"P01": 12.2,
		"P1": 13,
		"P3": 13.5,
		"P5": 13.7,
		"P10": 14.2,
		"P15": 14.5,
		"P25": 15,
		"P50": 15.9,
		"P75": 16.9,
		"P85": 17.5,
		"P90": 17.9,
		"P95": 18.6,
		"P97": 19,
		"P99": 19.9,
		"P999": 21.5
	},
	{
		"Length": 103.5,
		"L": -0.3833,
		"M": 16.0645,
		"S": 0.0917,
		"P01": 12.3,
		"P1": 13.1,
		"P3": 13.6,
		"P5": 13.9,
		"P10": 14.3,
		"P15": 14.6,
		"P25": 15.1,
		"P50": 16.1,
		"P75": 17.1,
		"P85": 17.7,
		"P90": 18.1,
		"P95": 18.8,
		"P97": 19.2,
		"P99": 20.1,
		"P999": 21.7
	},
	{
		"Length": 104,
		"L": -0.3833,
		"M": 16.2229,
		"S": 0.09186,
		"P01": 12.4,
		"P1": 13.2,
		"P3": 13.7,
		"P5": 14,
		"P10": 14.5,
		"P15": 14.8,
		"P25": 15.3,
		"P50": 16.2,
		"P75": 17.3,
		"P85": 17.9,
		"P90": 18.3,
		"P95": 19,
		"P97": 19.4,
		"P99": 20.3,
		"P999": 21.9
	},
	{
		"Length": 104.5,
		"L": -0.3833,
		"M": 16.3837,
		"S": 0.09203,
		"P01": 12.5,
		"P1": 13.3,
		"P3": 13.9,
		"P5": 14.1,
		"P10": 14.6,
		"P15": 14.9,
		"P25": 15.4,
		"P50": 16.4,
		"P75": 17.4,
		"P85": 18.1,
		"P90": 18.5,
		"P95": 19.1,
		"P97": 19.6,
		"P99": 20.5,
		"P999": 22.1
	},
	{
		"Length": 105,
		"L": -0.3833,
		"M": 16.547,
		"S": 0.09219,
		"P01": 12.6,
		"P1": 13.5,
		"P3": 14,
		"P5": 14.3,
		"P10": 14.7,
		"P15": 15.1,
		"P25": 15.6,
		"P50": 16.5,
		"P75": 17.6,
		"P85": 18.2,
		"P90": 18.7,
		"P95": 19.3,
		"P97": 19.8,
		"P99": 20.7,
		"P999": 22.4
	},
	{
		"Length": 105.5,
		"L": -0.3833,
		"M": 16.7129,
		"S": 0.09236,
		"P01": 12.7,
		"P1": 13.6,
		"P3": 14.1,
		"P5": 14.4,
		"P10": 14.9,
		"P15": 15.2,
		"P25": 15.7,
		"P50": 16.7,
		"P75": 17.8,
		"P85": 18.4,
		"P90": 18.9,
		"P95": 19.5,
		"P97": 20,
		"P99": 20.9,
		"P999": 22.6
	},
	{
		"Length": 106,
		"L": -0.3833,
		"M": 16.8814,
		"S": 0.09254,
		"P01": 12.9,
		"P1": 13.7,
		"P3": 14.3,
		"P5": 14.6,
		"P10": 15,
		"P15": 15.4,
		"P25": 15.9,
		"P50": 16.9,
		"P75": 18,
		"P85": 18.6,
		"P90": 19.1,
		"P95": 19.7,
		"P97": 20.2,
		"P99": 21.1,
		"P999": 22.9
	},
	{
		"Length": 106.5,
		"L": -0.3833,
		"M": 17.0527,
		"S": 0.09271,
		"P01": 13,
		"P1": 13.9,
		"P3": 14.4,
		"P5": 14.7,
		"P10": 15.2,
		"P15": 15.5,
		"P25": 16,
		"P50": 17.1,
		"P75": 18.2,
		"P85": 18.8,
		"P90": 19.3,
		"P95": 20,
		"P97": 20.4,
		"P99": 21.4,
		"P999": 23.1
	},
	{
		"Length": 107,
		"L": -0.3833,
		"M": 17.2269,
		"S": 0.09289,
		"P01": 13.1,
		"P1": 14,
		"P3": 14.5,
		"P5": 14.8,
		"P10": 15.3,
		"P15": 15.7,
		"P25": 16.2,
		"P50": 17.2,
		"P75": 18.4,
		"P85": 19,
		"P90": 19.5,
		"P95": 20.2,
		"P97": 20.6,
		"P99": 21.6,
		"P999": 23.3
	},
	{
		"Length": 107.5,
		"L": -0.3833,
		"M": 17.4039,
		"S": 0.09307,
		"P01": 13.2,
		"P1": 14.1,
		"P3": 14.7,
		"P5": 15,
		"P10": 15.5,
		"P15": 15.8,
		"P25": 16.4,
		"P50": 17.4,
		"P75": 18.5,
		"P85": 19.2,
		"P90": 19.7,
		"P95": 20.4,
		"P97": 20.9,
		"P99": 21.8,
		"P999": 23.6
	},
	{
		"Length": 108,
		"L": -0.3833,
		"M": 17.5839,
		"S": 0.09326,
		"P01": 13.4,
		"P1": 14.3,
		"P3": 14.8,
		"P5": 15.1,
		"P10": 15.6,
		"P15": 16,
		"P25": 16.5,
		"P50": 17.6,
		"P75": 18.7,
		"P85": 19.4,
		"P90": 19.9,
		"P95": 20.6,
		"P97": 21.1,
		"P99": 22.1,
		"P999": 23.9
	},
	{
		"Length": 108.5,
		"L": -0.3833,
		"M": 17.7668,
		"S": 0.09344,
		"P01": 13.5,
		"P1": 14.4,
		"P3": 15,
		"P5": 15.3,
		"P10": 15.8,
		"P15": 16.2,
		"P25": 16.7,
		"P50": 17.8,
		"P75": 18.9,
		"P85": 19.6,
		"P90": 20.1,
		"P95": 20.8,
		"P97": 21.3,
		"P99": 22.3,
		"P999": 24.1
	},
	{
		"Length": 109,
		"L": -0.3833,
		"M": 17.9526,
		"S": 0.09363,
		"P01": 13.6,
		"P1": 14.6,
		"P3": 15.1,
		"P5": 15.5,
		"P10": 16,
		"P15": 16.3,
		"P25": 16.9,
		"P50": 18,
		"P75": 19.1,
		"P85": 19.8,
		"P90": 20.3,
		"P95": 21,
		"P97": 21.5,
		"P99": 22.5,
		"P999": 24.4
	},
	{
		"Length": 109.5,
		"L": -0.3833,
		"M": 18.1412,
		"S": 0.09382,
		"P01": 13.8,
		"P1": 14.7,
		"P3": 15.3,
		"P5": 15.6,
		"P10": 16.1,
		"P15": 16.5,
		"P25": 17,
		"P50": 18.1,
		"P75": 19.3,
		"P85": 20,
		"P90": 20.5,
		"P95": 21.3,
		"P97": 21.8,
		"P99": 22.8,
		"P999": 24.7
	},
	{
		"Length": 110,
		"L": -0.3833,
		"M": 18.3324,
		"S": 0.09401,
		"P01": 13.9,
		"P1": 14.9,
		"P3": 15.4,
		"P5": 15.8,
		"P10": 16.3,
		"P15": 16.7,
		"P25": 17.2,
		"P50": 18.3,
		"P75": 19.5,
		"P85": 20.2,
		"P90": 20.7,
		"P95": 21.5,
		"P97": 22,
		"P99": 23,
		"P999": 24.9
	}
];

/***/ }),
/* 18 */
/***/ (function(module, exports) {

module.exports = [
	{
		"Height": 65,
		"L": -0.3833,
		"M": 7.2402,
		"S": 0.09113,
		"P01": 5.5,
		"P1": 5.9,
		"P3": 6.1,
		"P5": 6.3,
		"P10": 6.5,
		"P15": 6.6,
		"P25": 6.8,
		"P50": 7.2,
		"P75": 7.7,
		"P85": 8,
		"P90": 8.2,
		"P95": 8.4,
		"P97": 8.6,
		"P99": 9,
		"P999": 9.8
	},
	{
		"Height": 65.5,
		"L": -0.3833,
		"M": 7.3523,
		"S": 0.09109,
		"P01": 5.6,
		"P1": 6,
		"P3": 6.2,
		"P5": 6.4,
		"P10": 6.6,
		"P15": 6.7,
		"P25": 6.9,
		"P50": 7.4,
		"P75": 7.8,
		"P85": 8.1,
		"P90": 8.3,
		"P95": 8.6,
		"P97": 8.8,
		"P99": 9.2,
		"P999": 9.9
	},
	{
		"Height": 66,
		"L": -0.3833,
		"M": 7.463,
		"S": 0.09104,
		"P01": 5.7,
		"P1": 6.1,
		"P3": 6.3,
		"P5": 6.5,
		"P10": 6.7,
		"P15": 6.8,
		"P25": 7,
		"P50": 7.5,
		"P75": 7.9,
		"P85": 8.2,
		"P90": 8.4,
		"P95": 8.7,
		"P97": 8.9,
		"P99": 9.3,
		"P999": 10.1
	},
	{
		"Height": 66.5,
		"L": -0.3833,
		"M": 7.5724,
		"S": 0.09099,
		"P01": 5.8,
		"P1": 6.2,
		"P3": 6.4,
		"P5": 6.5,
		"P10": 6.8,
		"P15": 6.9,
		"P25": 7.1,
		"P50": 7.6,
		"P75": 8.1,
		"P85": 8.3,
		"P90": 8.5,
		"P95": 8.8,
		"P97": 9,
		"P99": 9.4,
		"P999": 10.2
	},
	{
		"Height": 67,
		"L": -0.3833,
		"M": 7.6806,
		"S": 0.09094,
		"P01": 5.9,
		"P1": 6.3,
		"P3": 6.5,
		"P5": 6.6,
		"P10": 6.9,
		"P15": 7,
		"P25": 7.2,
		"P50": 7.7,
		"P75": 8.2,
		"P85": 8.5,
		"P90": 8.7,
		"P95": 9,
		"P97": 9.2,
		"P99": 9.6,
		"P999": 10.3
	},
	{
		"Height": 67.5,
		"L": -0.3833,
		"M": 7.7874,
		"S": 0.09088,
		"P01": 6,
		"P1": 6.4,
		"P3": 6.6,
		"P5": 6.7,
		"P10": 6.9,
		"P15": 7.1,
		"P25": 7.3,
		"P50": 7.8,
		"P75": 8.3,
		"P85": 8.6,
		"P90": 8.8,
		"P95": 9.1,
		"P97": 9.3,
		"P99": 9.7,
		"P999": 10.5
	},
	{
		"Height": 68,
		"L": -0.3833,
		"M": 7.893,
		"S": 0.09083,
		"P01": 6,
		"P1": 6.4,
		"P3": 6.7,
		"P5": 6.8,
		"P10": 7,
		"P15": 7.2,
		"P25": 7.4,
		"P50": 7.9,
		"P75": 8.4,
		"P85": 8.7,
		"P90": 8.9,
		"P95": 9.2,
		"P97": 9.4,
		"P99": 9.8,
		"P999": 10.6
	},
	{
		"Height": 68.5,
		"L": -0.3833,
		"M": 7.9976,
		"S": 0.09077,
		"P01": 6.1,
		"P1": 6.5,
		"P3": 6.8,
		"P5": 6.9,
		"P10": 7.1,
		"P15": 7.3,
		"P25": 7.5,
		"P50": 8,
		"P75": 8.5,
		"P85": 8.8,
		"P90": 9,
		"P95": 9.3,
		"P97": 9.5,
		"P99": 10,
		"P999": 10.8
	},
	{
		"Height": 69,
		"L": -0.3833,
		"M": 8.1012,
		"S": 0.09071,
		"P01": 6.2,
		"P1": 6.6,
		"P3": 6.9,
		"P5": 7,
		"P10": 7.2,
		"P15": 7.4,
		"P25": 7.6,
		"P50": 8.1,
		"P75": 8.6,
		"P85": 8.9,
		"P90": 9.1,
		"P95": 9.4,
		"P97": 9.7,
		"P99": 10.1,
		"P999": 10.9
	},
	{
		"Height": 69.5,
		"L": -0.3833,
		"M": 8.2039,
		"S": 0.09065,
		"P01": 6.3,
		"P1": 6.7,
		"P3": 7,
		"P5": 7.1,
		"P10": 7.3,
		"P15": 7.5,
		"P25": 7.7,
		"P50": 8.2,
		"P75": 8.7,
		"P85": 9,
		"P90": 9.2,
		"P95": 9.6,
		"P97": 9.8,
		"P99": 10.2,
		"P999": 11
	},
	{
		"Height": 70,
		"L": -0.3833,
		"M": 8.3058,
		"S": 0.09059,
		"P01": 6.4,
		"P1": 6.8,
		"P3": 7,
		"P5": 7.2,
		"P10": 7.4,
		"P15": 7.6,
		"P25": 7.8,
		"P50": 8.3,
		"P75": 8.8,
		"P85": 9.1,
		"P90": 9.4,
		"P95": 9.7,
		"P97": 9.9,
		"P99": 10.3,
		"P999": 11.2
	},
	{
		"Height": 70.5,
		"L": -0.3833,
		"M": 8.4071,
		"S": 0.09053,
		"P01": 6.4,
		"P1": 6.9,
		"P3": 7.1,
		"P5": 7.3,
		"P10": 7.5,
		"P15": 7.7,
		"P25": 7.9,
		"P50": 8.4,
		"P75": 8.9,
		"P85": 9.3,
		"P90": 9.5,
		"P95": 9.8,
		"P97": 10,
		"P99": 10.5,
		"P999": 11.3
	},
	{
		"Height": 71,
		"L": -0.3833,
		"M": 8.5078,
		"S": 0.09047,
		"P01": 6.5,
		"P1": 6.9,
		"P3": 7.2,
		"P5": 7.4,
		"P10": 7.6,
		"P15": 7.8,
		"P25": 8,
		"P50": 8.5,
		"P75": 9,
		"P85": 9.4,
		"P90": 9.6,
		"P95": 9.9,
		"P97": 10.1,
		"P99": 10.6,
		"P999": 11.4
	},
	{
		"Height": 71.5,
		"L": -0.3833,
		"M": 8.6078,
		"S": 0.09041,
		"P01": 6.6,
		"P1": 7,
		"P3": 7.3,
		"P5": 7.4,
		"P10": 7.7,
		"P15": 7.9,
		"P25": 8.1,
		"P50": 8.6,
		"P75": 9.2,
		"P85": 9.5,
		"P90": 9.7,
		"P95": 10,
		"P97": 10.3,
		"P99": 10.7,
		"P999": 11.6
	},
	{
		"Height": 72,
		"L": -0.3833,
		"M": 8.707,
		"S": 0.09035,
		"P01": 6.7,
		"P1": 7.1,
		"P3": 7.4,
		"P5": 7.5,
		"P10": 7.8,
		"P15": 7.9,
		"P25": 8.2,
		"P50": 8.7,
		"P75": 9.3,
		"P85": 9.6,
		"P90": 9.8,
		"P95": 10.1,
		"P97": 10.4,
		"P99": 10.8,
		"P999": 11.7
	},
	{
		"Height": 72.5,
		"L": -0.3833,
		"M": 8.8053,
		"S": 0.09028,
		"P01": 6.8,
		"P1": 7.2,
		"P3": 7.5,
		"P5": 7.6,
		"P10": 7.9,
		"P15": 8,
		"P25": 8.3,
		"P50": 8.8,
		"P75": 9.4,
		"P85": 9.7,
		"P90": 9.9,
		"P95": 10.3,
		"P97": 10.5,
		"P99": 11,
		"P999": 11.8
	},
	{
		"Height": 73,
		"L": -0.3833,
		"M": 8.9025,
		"S": 0.09022,
		"P01": 6.8,
		"P1": 7.3,
		"P3": 7.6,
		"P5": 7.7,
		"P10": 8,
		"P15": 8.1,
		"P25": 8.4,
		"P50": 8.9,
		"P75": 9.5,
		"P85": 9.8,
		"P90": 10,
		"P95": 10.4,
		"P97": 10.6,
		"P99": 11.1,
		"P999": 12
	},
	{
		"Height": 73.5,
		"L": -0.3833,
		"M": 8.9983,
		"S": 0.09016,
		"P01": 6.9,
		"P1": 7.4,
		"P3": 7.6,
		"P5": 7.8,
		"P10": 8,
		"P15": 8.2,
		"P25": 8.5,
		"P50": 9,
		"P75": 9.6,
		"P85": 9.9,
		"P90": 10.1,
		"P95": 10.5,
		"P97": 10.7,
		"P99": 11.2,
		"P999": 12.1
	},
	{
		"Height": 74,
		"L": -0.3833,
		"M": 9.0928,
		"S": 0.09009,
		"P01": 7,
		"P1": 7.4,
		"P3": 7.7,
		"P5": 7.9,
		"P10": 8.1,
		"P15": 8.3,
		"P25": 8.6,
		"P50": 9.1,
		"P75": 9.7,
		"P85": 10,
		"P90": 10.2,
		"P95": 10.6,
		"P97": 10.8,
		"P99": 11.3,
		"P999": 12.2
	},
	{
		"Height": 74.5,
		"L": -0.3833,
		"M": 9.1862,
		"S": 0.09003,
		"P01": 7.1,
		"P1": 7.5,
		"P3": 7.8,
		"P5": 8,
		"P10": 8.2,
		"P15": 8.4,
		"P25": 8.7,
		"P50": 9.2,
		"P75": 9.8,
		"P85": 10.1,
		"P90": 10.3,
		"P95": 10.7,
		"P97": 10.9,
		"P99": 11.4,
		"P999": 12.3
	},
	{
		"Height": 75,
		"L": -0.3833,
		"M": 9.2786,
		"S": 0.08996,
		"P01": 7.1,
		"P1": 7.6,
		"P3": 7.9,
		"P5": 8,
		"P10": 8.3,
		"P15": 8.5,
		"P25": 8.7,
		"P50": 9.3,
		"P75": 9.9,
		"P85": 10.2,
		"P90": 10.4,
		"P95": 10.8,
		"P97": 11.1,
		"P99": 11.5,
		"P999": 12.4
	},
	{
		"Height": 75.5,
		"L": -0.3833,
		"M": 9.3703,
		"S": 0.08989,
		"P01": 7.2,
		"P1": 7.7,
		"P3": 8,
		"P5": 8.1,
		"P10": 8.4,
		"P15": 8.6,
		"P25": 8.8,
		"P50": 9.4,
		"P75": 10,
		"P85": 10.3,
		"P90": 10.5,
		"P95": 10.9,
		"P97": 11.2,
		"P99": 11.7,
		"P999": 12.6
	},
	{
		"Height": 76,
		"L": -0.3833,
		"M": 9.4617,
		"S": 0.08983,
		"P01": 7.3,
		"P1": 7.7,
		"P3": 8,
		"P5": 8.2,
		"P10": 8.5,
		"P15": 8.6,
		"P25": 8.9,
		"P50": 9.5,
		"P75": 10.1,
		"P85": 10.4,
		"P90": 10.6,
		"P95": 11,
		"P97": 11.3,
		"P99": 11.8,
		"P999": 12.7
	},
	{
		"Height": 76.5,
		"L": -0.3833,
		"M": 9.5533,
		"S": 0.08976,
		"P01": 7.3,
		"P1": 7.8,
		"P3": 8.1,
		"P5": 8.3,
		"P10": 8.5,
		"P15": 8.7,
		"P25": 9,
		"P50": 9.6,
		"P75": 10.2,
		"P85": 10.5,
		"P90": 10.7,
		"P95": 11.1,
		"P97": 11.4,
		"P99": 11.9,
		"P999": 12.8
	},
	{
		"Height": 77,
		"L": -0.3833,
		"M": 9.6456,
		"S": 0.08969,
		"P01": 7.4,
		"P1": 7.9,
		"P3": 8.2,
		"P5": 8.4,
		"P10": 8.6,
		"P15": 8.8,
		"P25": 9.1,
		"P50": 9.6,
		"P75": 10.3,
		"P85": 10.6,
		"P90": 10.8,
		"P95": 11.2,
		"P97": 11.5,
		"P99": 12,
		"P999": 12.9
	},
	{
		"Height": 77.5,
		"L": -0.3833,
		"M": 9.739,
		"S": 0.08963,
		"P01": 7.5,
		"P1": 8,
		"P3": 8.3,
		"P5": 8.4,
		"P10": 8.7,
		"P15": 8.9,
		"P25": 9.2,
		"P50": 9.7,
		"P75": 10.4,
		"P85": 10.7,
		"P90": 11,
		"P95": 11.3,
		"P97": 11.6,
		"P99": 12.1,
		"P999": 13.1
	},
	{
		"Height": 78,
		"L": -0.3833,
		"M": 9.8338,
		"S": 0.08956,
		"P01": 7.6,
		"P1": 8,
		"P3": 8.4,
		"P5": 8.5,
		"P10": 8.8,
		"P15": 9,
		"P25": 9.3,
		"P50": 9.8,
		"P75": 10.5,
		"P85": 10.8,
		"P90": 11.1,
		"P95": 11.4,
		"P97": 11.7,
		"P99": 12.2,
		"P999": 13.2
	},
	{
		"Height": 78.5,
		"L": -0.3833,
		"M": 9.9303,
		"S": 0.0895,
		"P01": 7.6,
		"P1": 8.1,
		"P3": 8.4,
		"P5": 8.6,
		"P10": 8.9,
		"P15": 9.1,
		"P25": 9.4,
		"P50": 9.9,
		"P75": 10.6,
		"P85": 10.9,
		"P90": 11.2,
		"P95": 11.6,
		"P97": 11.8,
		"P99": 12.3,
		"P999": 13.3
	},
	{
		"Height": 79,
		"L": -0.3833,
		"M": 10.0289,
		"S": 0.08943,
		"P01": 7.7,
		"P1": 8.2,
		"P3": 8.5,
		"P5": 8.7,
		"P10": 9,
		"P15": 9.2,
		"P25": 9.4,
		"P50": 10,
		"P75": 10.7,
		"P85": 11,
		"P90": 11.3,
		"P95": 11.7,
		"P97": 11.9,
		"P99": 12.5,
		"P999": 13.4
	},
	{
		"Height": 79.5,
		"L": -0.3833,
		"M": 10.1298,
		"S": 0.08937,
		"P01": 7.8,
		"P1": 8.3,
		"P3": 8.6,
		"P5": 8.8,
		"P10": 9.1,
		"P15": 9.2,
		"P25": 9.5,
		"P50": 10.1,
		"P75": 10.8,
		"P85": 11.1,
		"P90": 11.4,
		"P95": 11.8,
		"P97": 12.1,
		"P99": 12.6,
		"P999": 13.6
	},
	{
		"Height": 80,
		"L": -0.3833,
		"M": 10.2332,
		"S": 0.08932,
		"P01": 7.9,
		"P1": 8.4,
		"P3": 8.7,
		"P5": 8.9,
		"P10": 9.1,
		"P15": 9.3,
		"P25": 9.6,
		"P50": 10.2,
		"P75": 10.9,
		"P85": 11.2,
		"P90": 11.5,
		"P95": 11.9,
		"P97": 12.2,
		"P99": 12.7,
		"P999": 13.7
	},
	{
		"Height": 80.5,
		"L": -0.3833,
		"M": 10.3393,
		"S": 0.08926,
		"P01": 8,
		"P1": 8.5,
		"P3": 8.8,
		"P5": 9,
		"P10": 9.2,
		"P15": 9.4,
		"P25": 9.7,
		"P50": 10.3,
		"P75": 11,
		"P85": 11.4,
		"P90": 11.6,
		"P95": 12,
		"P97": 12.3,
		"P99": 12.8,
		"P999": 13.8
	},
	{
		"Height": 81,
		"L": -0.3833,
		"M": 10.4477,
		"S": 0.08921,
		"P01": 8,
		"P1": 8.6,
		"P3": 8.9,
		"P5": 9.1,
		"P10": 9.3,
		"P15": 9.5,
		"P25": 9.8,
		"P50": 10.4,
		"P75": 11.1,
		"P85": 11.5,
		"P90": 11.7,
		"P95": 12.2,
		"P97": 12.4,
		"P99": 13,
		"P999": 14
	},
	{
		"Height": 81.5,
		"L": -0.3833,
		"M": 10.5586,
		"S": 0.08916,
		"P01": 8.1,
		"P1": 8.6,
		"P3": 9,
		"P5": 9.2,
		"P10": 9.4,
		"P15": 9.6,
		"P25": 9.9,
		"P50": 10.6,
		"P75": 11.2,
		"P85": 11.6,
		"P90": 11.9,
		"P95": 12.3,
		"P97": 12.6,
		"P99": 13.1,
		"P999": 14.1
	},
	{
		"Height": 82,
		"L": -0.3833,
		"M": 10.6719,
		"S": 0.08912,
		"P01": 8.2,
		"P1": 8.7,
		"P3": 9.1,
		"P5": 9.3,
		"P10": 9.5,
		"P15": 9.7,
		"P25": 10.1,
		"P50": 10.7,
		"P75": 11.3,
		"P85": 11.7,
		"P90": 12,
		"P95": 12.4,
		"P97": 12.7,
		"P99": 13.2,
		"P999": 14.3
	},
	{
		"Height": 82.5,
		"L": -0.3833,
		"M": 10.7874,
		"S": 0.08908,
		"P01": 8.3,
		"P1": 8.8,
		"P3": 9.2,
		"P5": 9.4,
		"P10": 9.6,
		"P15": 9.9,
		"P25": 10.2,
		"P50": 10.8,
		"P75": 11.5,
		"P85": 11.9,
		"P90": 12.1,
		"P95": 12.5,
		"P97": 12.8,
		"P99": 13.4,
		"P999": 14.4
	},
	{
		"Height": 83,
		"L": -0.3833,
		"M": 10.9051,
		"S": 0.08905,
		"P01": 8.4,
		"P1": 8.9,
		"P3": 9.3,
		"P5": 9.5,
		"P10": 9.8,
		"P15": 10,
		"P25": 10.3,
		"P50": 10.9,
		"P75": 11.6,
		"P85": 12,
		"P90": 12.3,
		"P95": 12.7,
		"P97": 13,
		"P99": 13.5,
		"P999": 14.6
	},
	{
		"Height": 83.5,
		"L": -0.3833,
		"M": 11.0248,
		"S": 0.08902,
		"P01": 8.5,
		"P1": 9,
		"P3": 9.4,
		"P5": 9.6,
		"P10": 9.9,
		"P15": 10.1,
		"P25": 10.4,
		"P50": 11,
		"P75": 11.7,
		"P85": 12.1,
		"P90": 12.4,
		"P95": 12.8,
		"P97": 13.1,
		"P99": 13.7,
		"P999": 14.7
	},
	{
		"Height": 84,
		"L": -0.3833,
		"M": 11.1462,
		"S": 0.08899,
		"P01": 8.6,
		"P1": 9.1,
		"P3": 9.5,
		"P5": 9.7,
		"P10": 10,
		"P15": 10.2,
		"P25": 10.5,
		"P50": 11.1,
		"P75": 11.8,
		"P85": 12.2,
		"P90": 12.5,
		"P95": 13,
		"P97": 13.3,
		"P99": 13.8,
		"P999": 14.9
	},
	{
		"Height": 84.5,
		"L": -0.3833,
		"M": 11.2691,
		"S": 0.08897,
		"P01": 8.7,
		"P1": 9.2,
		"P3": 9.6,
		"P5": 9.8,
		"P10": 10.1,
		"P15": 10.3,
		"P25": 10.6,
		"P50": 11.3,
		"P75": 12,
		"P85": 12.4,
		"P90": 12.7,
		"P95": 13.1,
		"P97": 13.4,
		"P99": 14,
		"P999": 15.1
	},
	{
		"Height": 85,
		"L": -0.3833,
		"M": 11.3934,
		"S": 0.08896,
		"P01": 8.8,
		"P1": 9.3,
		"P3": 9.7,
		"P5": 9.9,
		"P10": 10.2,
		"P15": 10.4,
		"P25": 10.7,
		"P50": 11.4,
		"P75": 12.1,
		"P85": 12.5,
		"P90": 12.8,
		"P95": 13.2,
		"P97": 13.5,
		"P99": 14.1,
		"P999": 15.2
	},
	{
		"Height": 85.5,
		"L": -0.3833,
		"M": 11.5186,
		"S": 0.08895,
		"P01": 8.9,
		"P1": 9.4,
		"P3": 9.8,
		"P5": 10,
		"P10": 10.3,
		"P15": 10.5,
		"P25": 10.9,
		"P50": 11.5,
		"P75": 12.2,
		"P85": 12.7,
		"P90": 12.9,
		"P95": 13.4,
		"P97": 13.7,
		"P99": 14.3,
		"P999": 15.4
	},
	{
		"Height": 86,
		"L": -0.3833,
		"M": 11.6444,
		"S": 0.08895,
		"P01": 9,
		"P1": 9.5,
		"P3": 9.9,
		"P5": 10.1,
		"P10": 10.4,
		"P15": 10.6,
		"P25": 11,
		"P50": 11.6,
		"P75": 12.4,
		"P85": 12.8,
		"P90": 13.1,
		"P95": 13.5,
		"P97": 13.8,
		"P99": 14.4,
		"P999": 15.6
	},
	{
		"Height": 86.5,
		"L": -0.3833,
		"M": 11.7705,
		"S": 0.08895,
		"P01": 9.1,
		"P1": 9.6,
		"P3": 10,
		"P5": 10.2,
		"P10": 10.5,
		"P15": 10.8,
		"P25": 11.1,
		"P50": 11.8,
		"P75": 12.5,
		"P85": 12.9,
		"P90": 13.2,
		"P95": 13.7,
		"P97": 14,
		"P99": 14.6,
		"P999": 15.7
	},
	{
		"Height": 87,
		"L": -0.3833,
		"M": 11.8965,
		"S": 0.08896,
		"P01": 9.2,
		"P1": 9.7,
		"P3": 10.1,
		"P5": 10.3,
		"P10": 10.6,
		"P15": 10.9,
		"P25": 11.2,
		"P50": 11.9,
		"P75": 12.6,
		"P85": 13.1,
		"P90": 13.4,
		"P95": 13.8,
		"P97": 14.1,
		"P99": 14.8,
		"P999": 15.9
	},
	{
		"Height": 87.5,
		"L": -0.3833,
		"M": 12.0223,
		"S": 0.08897,
		"P01": 9.3,
		"P1": 9.9,
		"P3": 10.2,
		"P5": 10.4,
		"P10": 10.8,
		"P15": 11,
		"P25": 11.3,
		"P50": 12,
		"P75": 12.8,
		"P85": 13.2,
		"P90": 13.5,
		"P95": 14,
		"P97": 14.3,
		"P99": 14.9,
		"P999": 16.1
	},
	{
		"Height": 88,
		"L": -0.3833,
		"M": 12.1478,
		"S": 0.08899,
		"P01": 9.4,
		"P1": 10,
		"P3": 10.3,
		"P5": 10.5,
		"P10": 10.9,
		"P15": 11.1,
		"P25": 11.4,
		"P50": 12.1,
		"P75": 12.9,
		"P85": 13.3,
		"P90": 13.7,
		"P95": 14.1,
		"P97": 14.4,
		"P99": 15.1,
		"P999": 16.2
	},
	{
		"Height": 88.5,
		"L": -0.3833,
		"M": 12.2729,
		"S": 0.08901,
		"P01": 9.4,
		"P1": 10.1,
		"P3": 10.4,
		"P5": 10.6,
		"P10": 11,
		"P15": 11.2,
		"P25": 11.6,
		"P50": 12.3,
		"P75": 13,
		"P85": 13.5,
		"P90": 13.8,
		"P95": 14.3,
		"P97": 14.6,
		"P99": 15.2,
		"P999": 16.4
	},
	{
		"Height": 89,
		"L": -0.3833,
		"M": 12.3976,
		"S": 0.08904,
		"P01": 9.5,
		"P1": 10.2,
		"P3": 10.5,
		"P5": 10.8,
		"P10": 11.1,
		"P15": 11.3,
		"P25": 11.7,
		"P50": 12.4,
		"P75": 13.2,
		"P85": 13.6,
		"P90": 13.9,
		"P95": 14.4,
		"P97": 14.7,
		"P99": 15.4,
		"P999": 16.6
	},
	{
		"Height": 89.5,
		"L": -0.3833,
		"M": 12.522,
		"S": 0.08907,
		"P01": 9.6,
		"P1": 10.3,
		"P3": 10.6,
		"P5": 10.9,
		"P10": 11.2,
		"P15": 11.4,
		"P25": 11.8,
		"P50": 12.5,
		"P75": 13.3,
		"P85": 13.8,
		"P90": 14.1,
		"P95": 14.6,
		"P97": 14.9,
		"P99": 15.5,
		"P999": 16.7
	},
	{
		"Height": 90,
		"L": -0.3833,
		"M": 12.6461,
		"S": 0.08911,
		"P01": 9.7,
		"P1": 10.4,
		"P3": 10.8,
		"P5": 11,
		"P10": 11.3,
		"P15": 11.5,
		"P25": 11.9,
		"P50": 12.6,
		"P75": 13.4,
		"P85": 13.9,
		"P90": 14.2,
		"P95": 14.7,
		"P97": 15,
		"P99": 15.7,
		"P999": 16.9
	},
	{
		"Height": 90.5,
		"L": -0.3833,
		"M": 12.77,
		"S": 0.08915,
		"P01": 9.8,
		"P1": 10.5,
		"P3": 10.9,
		"P5": 11.1,
		"P10": 11.4,
		"P15": 11.7,
		"P25": 12,
		"P50": 12.8,
		"P75": 13.6,
		"P85": 14,
		"P90": 14.4,
		"P95": 14.9,
		"P97": 15.2,
		"P99": 15.9,
		"P999": 17.1
	},
	{
		"Height": 91,
		"L": -0.3833,
		"M": 12.8939,
		"S": 0.0892,
		"P01": 9.9,
		"P1": 10.6,
		"P3": 11,
		"P5": 11.2,
		"P10": 11.5,
		"P15": 11.8,
		"P25": 12.1,
		"P50": 12.9,
		"P75": 13.7,
		"P85": 14.2,
		"P90": 14.5,
		"P95": 15,
		"P97": 15.3,
		"P99": 16,
		"P999": 17.3
	},
	{
		"Height": 91.5,
		"L": -0.3833,
		"M": 13.0177,
		"S": 0.08925,
		"P01": 10,
		"P1": 10.7,
		"P3": 11.1,
		"P5": 11.3,
		"P10": 11.6,
		"P15": 11.9,
		"P25": 12.3,
		"P50": 13,
		"P75": 13.8,
		"P85": 14.3,
		"P90": 14.6,
		"P95": 15.1,
		"P97": 15.5,
		"P99": 16.2,
		"P999": 17.4
	},
	{
		"Height": 92,
		"L": -0.3833,
		"M": 13.1415,
		"S": 0.08931,
		"P01": 10.1,
		"P1": 10.8,
		"P3": 11.2,
		"P5": 11.4,
		"P10": 11.7,
		"P15": 12,
		"P25": 12.4,
		"P50": 13.1,
		"P75": 14,
		"P85": 14.4,
		"P90": 14.8,
		"P95": 15.3,
		"P97": 15.6,
		"P99": 16.3,
		"P999": 17.6
	},
	{
		"Height": 92.5,
		"L": -0.3833,
		"M": 13.2654,
		"S": 0.08937,
		"P01": 10.2,
		"P1": 10.9,
		"P3": 11.3,
		"P5": 11.5,
		"P10": 11.9,
		"P15": 12.1,
		"P25": 12.5,
		"P50": 13.3,
		"P75": 14.1,
		"P85": 14.6,
		"P90": 14.9,
		"P95": 15.4,
		"P97": 15.8,
		"P99": 16.5,
		"P999": 17.8
	},
	{
		"Height": 93,
		"L": -0.3833,
		"M": 13.3896,
		"S": 0.08944,
		"P01": 10.3,
		"P1": 11,
		"P3": 11.4,
		"P5": 11.6,
		"P10": 12,
		"P15": 12.2,
		"P25": 12.6,
		"P50": 13.4,
		"P75": 14.2,
		"P85": 14.7,
		"P90": 15.1,
		"P95": 15.6,
		"P97": 15.9,
		"P99": 16.6,
		"P999": 17.9
	},
	{
		"Height": 93.5,
		"L": -0.3833,
		"M": 13.5142,
		"S": 0.08951,
		"P01": 10.4,
		"P1": 11.1,
		"P3": 11.5,
		"P5": 11.7,
		"P10": 12.1,
		"P15": 12.3,
		"P25": 12.7,
		"P50": 13.5,
		"P75": 14.4,
		"P85": 14.9,
		"P90": 15.2,
		"P95": 15.7,
		"P97": 16.1,
		"P99": 16.8,
		"P999": 18.1
	},
	{
		"Height": 94,
		"L": -0.3833,
		"M": 13.6393,
		"S": 0.08959,
		"P01": 10.5,
		"P1": 11.2,
		"P3": 11.6,
		"P5": 11.8,
		"P10": 12.2,
		"P15": 12.4,
		"P25": 12.8,
		"P50": 13.6,
		"P75": 14.5,
		"P85": 15,
		"P90": 15.3,
		"P95": 15.9,
		"P97": 16.2,
		"P99": 16.9,
		"P999": 18.3
	},
	{
		"Height": 94.5,
		"L": -0.3833,
		"M": 13.765,
		"S": 0.08967,
		"P01": 10.6,
		"P1": 11.3,
		"P3": 11.7,
		"P5": 11.9,
		"P10": 12.3,
		"P15": 12.6,
		"P25": 13,
		"P50": 13.8,
		"P75": 14.6,
		"P85": 15.1,
		"P90": 15.5,
		"P95": 16,
		"P97": 16.4,
		"P99": 17.1,
		"P999": 18.5
	},
	{
		"Height": 95,
		"L": -0.3833,
		"M": 13.8914,
		"S": 0.08975,
		"P01": 10.7,
		"P1": 11.4,
		"P3": 11.8,
		"P5": 12,
		"P10": 12.4,
		"P15": 12.7,
		"P25": 13.1,
		"P50": 13.9,
		"P75": 14.8,
		"P85": 15.3,
		"P90": 15.6,
		"P95": 16.2,
		"P97": 16.5,
		"P99": 17.3,
		"P999": 18.6
	},
	{
		"Height": 95.5,
		"L": -0.3833,
		"M": 14.0186,
		"S": 0.08984,
		"P01": 10.8,
		"P1": 11.5,
		"P3": 11.9,
		"P5": 12.1,
		"P10": 12.5,
		"P15": 12.8,
		"P25": 13.2,
		"P50": 14,
		"P75": 14.9,
		"P85": 15.4,
		"P90": 15.8,
		"P95": 16.3,
		"P97": 16.7,
		"P99": 17.4,
		"P999": 18.8
	},
	{
		"Height": 96,
		"L": -0.3833,
		"M": 14.1466,
		"S": 0.08994,
		"P01": 10.9,
		"P1": 11.6,
		"P3": 12,
		"P5": 12.3,
		"P10": 12.6,
		"P15": 12.9,
		"P25": 13.3,
		"P50": 14.1,
		"P75": 15,
		"P85": 15.6,
		"P90": 15.9,
		"P95": 16.5,
		"P97": 16.9,
		"P99": 17.6,
		"P999": 19
	},
	{
		"Height": 96.5,
		"L": -0.3833,
		"M": 14.2757,
		"S": 0.09004,
		"P01": 11,
		"P1": 11.7,
		"P3": 12.1,
		"P5": 12.4,
		"P10": 12.8,
		"P15": 13,
		"P25": 13.4,
		"P50": 14.3,
		"P75": 15.2,
		"P85": 15.7,
		"P90": 16.1,
		"P95": 16.6,
		"P97": 17,
		"P99": 17.8,
		"P999": 19.2
	},
	{
		"Height": 97,
		"L": -0.3833,
		"M": 14.4059,
		"S": 0.09015,
		"P01": 11.1,
		"P1": 11.8,
		"P3": 12.2,
		"P5": 12.5,
		"P10": 12.9,
		"P15": 13.1,
		"P25": 13.6,
		"P50": 14.4,
		"P75": 15.3,
		"P85": 15.8,
		"P90": 16.2,
		"P95": 16.8,
		"P97": 17.2,
		"P99": 17.9,
		"P999": 19.3
	},
	{
		"Height": 97.5,
		"L": -0.3833,
		"M": 14.5376,
		"S": 0.09026,
		"P01": 11.2,
		"P1": 11.9,
		"P3": 12.3,
		"P5": 12.6,
		"P10": 13,
		"P15": 13.3,
		"P25": 13.7,
		"P50": 14.5,
		"P75": 15.5,
		"P85": 16,
		"P90": 16.4,
		"P95": 16.9,
		"P97": 17.3,
		"P99": 18.1,
		"P999": 19.5
	},
	{
		"Height": 98,
		"L": -0.3833,
		"M": 14.671,
		"S": 0.09037,
		"P01": 11.3,
		"P1": 12,
		"P3": 12.4,
		"P5": 12.7,
		"P10": 13.1,
		"P15": 13.4,
		"P25": 13.8,
		"P50": 14.7,
		"P75": 15.6,
		"P85": 16.1,
		"P90": 16.5,
		"P95": 17.1,
		"P97": 17.5,
		"P99": 18.3,
		"P999": 19.7
	},
	{
		"Height": 98.5,
		"L": -0.3833,
		"M": 14.8062,
		"S": 0.09049,
		"P01": 11.4,
		"P1": 12.1,
		"P3": 12.6,
		"P5": 12.8,
		"P10": 13.2,
		"P15": 13.5,
		"P25": 13.9,
		"P50": 14.8,
		"P75": 15.7,
		"P85": 16.3,
		"P90": 16.7,
		"P95": 17.3,
		"P97": 17.7,
		"P99": 18.4,
		"P999": 19.9
	},
	{
		"Height": 99,
		"L": -0.3833,
		"M": 14.9434,
		"S": 0.09062,
		"P01": 11.5,
		"P1": 12.2,
		"P3": 12.7,
		"P5": 12.9,
		"P10": 13.3,
		"P15": 13.6,
		"P25": 14.1,
		"P50": 14.9,
		"P75": 15.9,
		"P85": 16.4,
		"P90": 16.8,
		"P95": 17.4,
		"P97": 17.8,
		"P99": 18.6,
		"P999": 20.1
	},
	{
		"Height": 99.5,
		"L": -0.3833,
		"M": 15.0828,
		"S": 0.09075,
		"P01": 11.6,
		"P1": 12.3,
		"P3": 12.8,
		"P5": 13,
		"P10": 13.5,
		"P15": 13.8,
		"P25": 14.2,
		"P50": 15.1,
		"P75": 16,
		"P85": 16.6,
		"P90": 17,
		"P95": 17.6,
		"P97": 18,
		"P99": 18.8,
		"P999": 20.3
	},
	{
		"Height": 100,
		"L": -0.3833,
		"M": 15.2246,
		"S": 0.09088,
		"P01": 11.7,
		"P1": 12.4,
		"P3": 12.9,
		"P5": 13.2,
		"P10": 13.6,
		"P15": 13.9,
		"P25": 14.3,
		"P50": 15.2,
		"P75": 16.2,
		"P85": 16.8,
		"P90": 17.2,
		"P95": 17.8,
		"P97": 18.2,
		"P99": 19,
		"P999": 20.5
	},
	{
		"Height": 100.5,
		"L": -0.3833,
		"M": 15.3687,
		"S": 0.09102,
		"P01": 11.8,
		"P1": 12.5,
		"P3": 13,
		"P5": 13.3,
		"P10": 13.7,
		"P15": 14,
		"P25": 14.5,
		"P50": 15.4,
		"P75": 16.4,
		"P85": 16.9,
		"P90": 17.3,
		"P95": 17.9,
		"P97": 18.3,
		"P99": 19.2,
		"P999": 20.7
	},
	{
		"Height": 101,
		"L": -0.3833,
		"M": 15.5154,
		"S": 0.09116,
		"P01": 11.9,
		"P1": 12.7,
		"P3": 13.1,
		"P5": 13.4,
		"P10": 13.8,
		"P15": 14.1,
		"P25": 14.6,
		"P50": 15.5,
		"P75": 16.5,
		"P85": 17.1,
		"P90": 17.5,
		"P95": 18.1,
		"P97": 18.5,
		"P99": 19.4,
		"P999": 20.9
	},
	{
		"Height": 101.5,
		"L": -0.3833,
		"M": 15.6646,
		"S": 0.09131,
		"P01": 12,
		"P1": 12.8,
		"P3": 13.3,
		"P5": 13.5,
		"P10": 14,
		"P15": 14.3,
		"P25": 14.7,
		"P50": 15.7,
		"P75": 16.7,
		"P85": 17.2,
		"P90": 17.7,
		"P95": 18.3,
		"P97": 18.7,
		"P99": 19.5,
		"P999": 21.1
	},
	{
		"Height": 102,
		"L": -0.3833,
		"M": 15.8164,
		"S": 0.09146,
		"P01": 12.1,
		"P1": 12.9,
		"P3": 13.4,
		"P5": 13.7,
		"P10": 14.1,
		"P15": 14.4,
		"P25": 14.9,
		"P50": 15.8,
		"P75": 16.8,
		"P85": 17.4,
		"P90": 17.8,
		"P95": 18.5,
		"P97": 18.9,
		"P99": 19.7,
		"P999": 21.3
	},
	{
		"Height": 102.5,
		"L": -0.3833,
		"M": 15.9707,
		"S": 0.09161,
		"P01": 12.2,
		"P1": 13,
		"P3": 13.5,
		"P5": 13.8,
		"P10": 14.2,
		"P15": 14.5,
		"P25": 15,
		"P50": 16,
		"P75": 17,
		"P85": 17.6,
		"P90": 18,
		"P95": 18.7,
		"P97": 19.1,
		"P99": 19.9,
		"P999": 21.6
	},
	{
		"Height": 103,
		"L": -0.3833,
		"M": 16.1276,
		"S": 0.09177,
		"P01": 12.3,
		"P1": 13.1,
		"P3": 13.6,
		"P5": 13.9,
		"P10": 14.4,
		"P15": 14.7,
		"P25": 15.2,
		"P50": 16.1,
		"P75": 17.2,
		"P85": 17.8,
		"P90": 18.2,
		"P95": 18.8,
		"P97": 19.3,
		"P99": 20.2,
		"P999": 21.8
	},
	{
		"Height": 103.5,
		"L": -0.3833,
		"M": 16.287,
		"S": 0.09193,
		"P01": 12.4,
		"P1": 13.3,
		"P3": 13.8,
		"P5": 14.1,
		"P10": 14.5,
		"P15": 14.8,
		"P25": 15.3,
		"P50": 16.3,
		"P75": 17.3,
		"P85": 17.9,
		"P90": 18.4,
		"P95": 19,
		"P97": 19.5,
		"P99": 20.4,
		"P999": 22
	},
	{
		"Height": 104,
		"L": -0.3833,
		"M": 16.4488,
		"S": 0.09209,
		"P01": 12.6,
		"P1": 13.4,
		"P3": 13.9,
		"P5": 14.2,
		"P10": 14.7,
		"P15": 15,
		"P25": 15.5,
		"P50": 16.4,
		"P75": 17.5,
		"P85": 18.1,
		"P90": 18.6,
		"P95": 19.2,
		"P97": 19.7,
		"P99": 20.6,
		"P999": 22.2
	},
	{
		"Height": 104.5,
		"L": -0.3833,
		"M": 16.6131,
		"S": 0.09226,
		"P01": 12.7,
		"P1": 13.5,
		"P3": 14,
		"P5": 14.3,
		"P10": 14.8,
		"P15": 15.1,
		"P25": 15.6,
		"P50": 16.6,
		"P75": 17.7,
		"P85": 18.3,
		"P90": 18.7,
		"P95": 19.4,
		"P97": 19.9,
		"P99": 20.8,
		"P999": 22.5
	},
	{
		"Height": 105,
		"L": -0.3833,
		"M": 16.78,
		"S": 0.09243,
		"P01": 12.8,
		"P1": 13.6,
		"P3": 14.2,
		"P5": 14.5,
		"P10": 14.9,
		"P15": 15.3,
		"P25": 15.8,
		"P50": 16.8,
		"P75": 17.9,
		"P85": 18.5,
		"P90": 18.9,
		"P95": 19.6,
		"P97": 20.1,
		"P99": 21,
		"P999": 22.7
	},
	{
		"Height": 105.5,
		"L": -0.3833,
		"M": 16.9496,
		"S": 0.09261,
		"P01": 12.9,
		"P1": 13.8,
		"P3": 14.3,
		"P5": 14.6,
		"P10": 15.1,
		"P15": 15.4,
		"P25": 15.9,
		"P50": 16.9,
		"P75": 18.1,
		"P85": 18.7,
		"P90": 19.1,
		"P95": 19.8,
		"P97": 20.3,
		"P99": 21.2,
		"P999": 23
	},
	{
		"Height": 106,
		"L": -0.3833,
		"M": 17.122,
		"S": 0.09278,
		"P01": 13,
		"P1": 13.9,
		"P3": 14.5,
		"P5": 14.8,
		"P10": 15.2,
		"P15": 15.6,
		"P25": 16.1,
		"P50": 17.1,
		"P75": 18.2,
		"P85": 18.9,
		"P90": 19.3,
		"P95": 20,
		"P97": 20.5,
		"P99": 21.4,
		"P999": 23.2
	},
	{
		"Height": 106.5,
		"L": -0.3833,
		"M": 17.2973,
		"S": 0.09296,
		"P01": 13.2,
		"P1": 14.1,
		"P3": 14.6,
		"P5": 14.9,
		"P10": 15.4,
		"P15": 15.7,
		"P25": 16.3,
		"P50": 17.3,
		"P75": 18.4,
		"P85": 19.1,
		"P90": 19.5,
		"P95": 20.2,
		"P97": 20.7,
		"P99": 21.7,
		"P999": 23.5
	},
	{
		"Height": 107,
		"L": -0.3833,
		"M": 17.4755,
		"S": 0.09315,
		"P01": 13.3,
		"P1": 14.2,
		"P3": 14.7,
		"P5": 15.1,
		"P10": 15.6,
		"P15": 15.9,
		"P25": 16.4,
		"P50": 17.5,
		"P75": 18.6,
		"P85": 19.3,
		"P90": 19.7,
		"P95": 20.5,
		"P97": 21,
		"P99": 21.9,
		"P999": 23.7
	},
	{
		"Height": 107.5,
		"L": -0.3833,
		"M": 17.6567,
		"S": 0.09333,
		"P01": 13.4,
		"P1": 14.3,
		"P3": 14.9,
		"P5": 15.2,
		"P10": 15.7,
		"P15": 16.1,
		"P25": 16.6,
		"P50": 17.7,
		"P75": 18.8,
		"P85": 19.5,
		"P90": 20,
		"P95": 20.7,
		"P97": 21.2,
		"P99": 22.1,
		"P999": 24
	},
	{
		"Height": 108,
		"L": -0.3833,
		"M": 17.8407,
		"S": 0.09352,
		"P01": 13.6,
		"P1": 14.5,
		"P3": 15,
		"P5": 15.4,
		"P10": 15.9,
		"P15": 16.2,
		"P25": 16.8,
		"P50": 17.8,
		"P75": 19,
		"P85": 19.7,
		"P90": 20.2,
		"P95": 20.9,
		"P97": 21.4,
		"P99": 22.4,
		"P999": 24.2
	},
	{
		"Height": 108.5,
		"L": -0.3833,
		"M": 18.0277,
		"S": 0.09371,
		"P01": 13.7,
		"P1": 14.6,
		"P3": 15.2,
		"P5": 15.5,
		"P10": 16,
		"P15": 16.4,
		"P25": 16.9,
		"P50": 18,
		"P75": 19.2,
		"P85": 19.9,
		"P90": 20.4,
		"P95": 21.1,
		"P97": 21.6,
		"P99": 22.6,
		"P999": 24.5
	},
	{
		"Height": 109,
		"L": -0.3833,
		"M": 18.2174,
		"S": 0.0939,
		"P01": 13.8,
		"P1": 14.8,
		"P3": 15.4,
		"P5": 15.7,
		"P10": 16.2,
		"P15": 16.6,
		"P25": 17.1,
		"P50": 18.2,
		"P75": 19.4,
		"P85": 20.1,
		"P90": 20.6,
		"P95": 21.4,
		"P97": 21.9,
		"P99": 22.9,
		"P999": 24.8
	},
	{
		"Height": 109.5,
		"L": -0.3833,
		"M": 18.4096,
		"S": 0.09409,
		"P01": 14,
		"P1": 14.9,
		"P3": 15.5,
		"P5": 15.8,
		"P10": 16.4,
		"P15": 16.7,
		"P25": 17.3,
		"P50": 18.4,
		"P75": 19.6,
		"P85": 20.3,
		"P90": 20.8,
		"P95": 21.6,
		"P97": 22.1,
		"P99": 23.1,
		"P999": 25.1
	},
	{
		"Height": 110,
		"L": -0.3833,
		"M": 18.6043,
		"S": 0.09428,
		"P01": 14.1,
		"P1": 15.1,
		"P3": 15.7,
		"P5": 16,
		"P10": 16.5,
		"P15": 16.9,
		"P25": 17.5,
		"P50": 18.6,
		"P75": 19.8,
		"P85": 20.6,
		"P90": 21.1,
		"P95": 21.8,
		"P97": 22.4,
		"P99": 23.4,
		"P999": 25.3
	},
	{
		"Height": 110.5,
		"L": -0.3833,
		"M": 18.8015,
		"S": 0.09448,
		"P01": 14.3,
		"P1": 15.2,
		"P3": 15.8,
		"P5": 16.2,
		"P10": 16.7,
		"P15": 17.1,
		"P25": 17.7,
		"P50": 18.8,
		"P75": 20.1,
		"P85": 20.8,
		"P90": 21.3,
		"P95": 22.1,
		"P97": 22.6,
		"P99": 23.7,
		"P999": 25.6
	},
	{
		"Height": 111,
		"L": -0.3833,
		"M": 19.0009,
		"S": 0.09467,
		"P01": 14.4,
		"P1": 15.4,
		"P3": 16,
		"P5": 16.3,
		"P10": 16.9,
		"P15": 17.3,
		"P25": 17.8,
		"P50": 19,
		"P75": 20.3,
		"P85": 21,
		"P90": 21.5,
		"P95": 22.3,
		"P97": 22.8,
		"P99": 23.9,
		"P999": 25.9
	},
	{
		"Height": 111.5,
		"L": -0.3833,
		"M": 19.2024,
		"S": 0.09487,
		"P01": 14.5,
		"P1": 15.5,
		"P3": 16.2,
		"P5": 16.5,
		"P10": 17.1,
		"P15": 17.4,
		"P25": 18,
		"P50": 19.2,
		"P75": 20.5,
		"P85": 21.2,
		"P90": 21.7,
		"P95": 22.6,
		"P97": 23.1,
		"P99": 24.2,
		"P999": 26.2
	},
	{
		"Height": 112,
		"L": -0.3833,
		"M": 19.406,
		"S": 0.09507,
		"P01": 14.7,
		"P1": 15.7,
		"P3": 16.3,
		"P5": 16.7,
		"P10": 17.2,
		"P15": 17.6,
		"P25": 18.2,
		"P50": 19.4,
		"P75": 20.7,
		"P85": 21.5,
		"P90": 22,
		"P95": 22.8,
		"P97": 23.4,
		"P99": 24.5,
		"P999": 26.5
	},
	{
		"Height": 112.5,
		"L": -0.3833,
		"M": 19.6116,
		"S": 0.09527,
		"P01": 14.8,
		"P1": 15.9,
		"P3": 16.5,
		"P5": 16.8,
		"P10": 17.4,
		"P15": 17.8,
		"P25": 18.4,
		"P50": 19.6,
		"P75": 20.9,
		"P85": 21.7,
		"P90": 22.2,
		"P95": 23.1,
		"P97": 23.6,
		"P99": 24.7,
		"P999": 26.8
	},
	{
		"Height": 113,
		"L": -0.3833,
		"M": 19.819,
		"S": 0.09546,
		"P01": 15,
		"P1": 16,
		"P3": 16.7,
		"P5": 17,
		"P10": 17.6,
		"P15": 18,
		"P25": 18.6,
		"P50": 19.8,
		"P75": 21.2,
		"P85": 21.9,
		"P90": 22.5,
		"P95": 23.3,
		"P97": 23.9,
		"P99": 25,
		"P999": 27.1
	},
	{
		"Height": 113.5,
		"L": -0.3833,
		"M": 20.028,
		"S": 0.09566,
		"P01": 15.1,
		"P1": 16.2,
		"P3": 16.8,
		"P5": 17.2,
		"P10": 17.8,
		"P15": 18.2,
		"P25": 18.8,
		"P50": 20,
		"P75": 21.4,
		"P85": 22.2,
		"P90": 22.7,
		"P95": 23.6,
		"P97": 24.1,
		"P99": 25.3,
		"P999": 27.4
	},
	{
		"Height": 114,
		"L": -0.3833,
		"M": 20.2385,
		"S": 0.09586,
		"P01": 15.3,
		"P1": 16.3,
		"P3": 17,
		"P5": 17.4,
		"P10": 17.9,
		"P15": 18.4,
		"P25": 19,
		"P50": 20.2,
		"P75": 21.6,
		"P85": 22.4,
		"P90": 23,
		"P95": 23.8,
		"P97": 24.4,
		"P99": 25.6,
		"P999": 27.7
	},
	{
		"Height": 114.5,
		"L": -0.3833,
		"M": 20.4502,
		"S": 0.09606,
		"P01": 15.4,
		"P1": 16.5,
		"P3": 17.2,
		"P5": 17.5,
		"P10": 18.1,
		"P15": 18.5,
		"P25": 19.2,
		"P50": 20.5,
		"P75": 21.8,
		"P85": 22.6,
		"P90": 23.2,
		"P95": 24.1,
		"P97": 24.7,
		"P99": 25.8,
		"P999": 28
	},
	{
		"Height": 115,
		"L": -0.3833,
		"M": 20.6629,
		"S": 0.09626,
		"P01": 15.6,
		"P1": 16.7,
		"P3": 17.3,
		"P5": 17.7,
		"P10": 18.3,
		"P15": 18.7,
		"P25": 19.4,
		"P50": 20.7,
		"P75": 22.1,
		"P85": 22.9,
		"P90": 23.4,
		"P95": 24.3,
		"P97": 24.9,
		"P99": 26.1,
		"P999": 28.3
	},
	{
		"Height": 115.5,
		"L": -0.3833,
		"M": 20.8766,
		"S": 0.09646,
		"P01": 15.7,
		"P1": 16.8,
		"P3": 17.5,
		"P5": 17.9,
		"P10": 18.5,
		"P15": 18.9,
		"P25": 19.6,
		"P50": 20.9,
		"P75": 22.3,
		"P85": 23.1,
		"P90": 23.7,
		"P95": 24.6,
		"P97": 25.2,
		"P99": 26.4,
		"P999": 28.7
	},
	{
		"Height": 116,
		"L": -0.3833,
		"M": 21.0909,
		"S": 0.09666,
		"P01": 15.9,
		"P1": 17,
		"P3": 17.7,
		"P5": 18.1,
		"P10": 18.7,
		"P15": 19.1,
		"P25": 19.8,
		"P50": 21.1,
		"P75": 22.5,
		"P85": 23.4,
		"P90": 23.9,
		"P95": 24.9,
		"P97": 25.5,
		"P99": 26.7,
		"P999": 29
	},
	{
		"Height": 116.5,
		"L": -0.3833,
		"M": 21.3059,
		"S": 0.09686,
		"P01": 16,
		"P1": 17.2,
		"P3": 17.9,
		"P5": 18.3,
		"P10": 18.9,
		"P15": 19.3,
		"P25": 20,
		"P50": 21.3,
		"P75": 22.8,
		"P85": 23.6,
		"P90": 24.2,
		"P95": 25.1,
		"P97": 25.7,
		"P99": 27,
		"P999": 29.3
	},
	{
		"Height": 117,
		"L": -0.3833,
		"M": 21.5213,
		"S": 0.09707,
		"P01": 16.2,
		"P1": 17.3,
		"P3": 18,
		"P5": 18.4,
		"P10": 19.1,
		"P15": 19.5,
		"P25": 20.2,
		"P50": 21.5,
		"P75": 23,
		"P85": 23.8,
		"P90": 24.4,
		"P95": 25.4,
		"P97": 26,
		"P99": 27.3,
		"P999": 29.6
	},
	{
		"Height": 117.5,
		"L": -0.3833,
		"M": 21.737,
		"S": 0.09727,
		"P01": 16.4,
		"P1": 17.5,
		"P3": 18.2,
		"P5": 18.6,
		"P10": 19.2,
		"P15": 19.7,
		"P25": 20.4,
		"P50": 21.7,
		"P75": 23.2,
		"P85": 24.1,
		"P90": 24.7,
		"P95": 25.6,
		"P97": 26.3,
		"P99": 27.5,
		"P999": 29.9
	},
	{
		"Height": 118,
		"L": -0.3833,
		"M": 21.9529,
		"S": 0.09747,
		"P01": 16.5,
		"P1": 17.7,
		"P3": 18.4,
		"P5": 18.8,
		"P10": 19.4,
		"P15": 19.9,
		"P25": 20.6,
		"P50": 22,
		"P75": 23.5,
		"P85": 24.3,
		"P90": 25,
		"P95": 25.9,
		"P97": 26.5,
		"P99": 27.8,
		"P999": 30.2
	},
	{
		"Height": 118.5,
		"L": -0.3833,
		"M": 22.169,
		"S": 0.09767,
		"P01": 16.7,
		"P1": 17.8,
		"P3": 18.6,
		"P5": 19,
		"P10": 19.6,
		"P15": 20.1,
		"P25": 20.8,
		"P50": 22.2,
		"P75": 23.7,
		"P85": 24.6,
		"P90": 25.2,
		"P95": 26.2,
		"P97": 26.8,
		"P99": 28.1,
		"P999": 30.6
	},
	{
		"Height": 119,
		"L": -0.3833,
		"M": 22.3851,
		"S": 0.09788,
		"P01": 16.8,
		"P1": 18,
		"P3": 18.7,
		"P5": 19.1,
		"P10": 19.8,
		"P15": 20.3,
		"P25": 21,
		"P50": 22.4,
		"P75": 23.9,
		"P85": 24.8,
		"P90": 25.5,
		"P95": 26.4,
		"P97": 27.1,
		"P99": 28.4,
		"P999": 30.9
	},
	{
		"Height": 119.5,
		"L": -0.3833,
		"M": 22.6012,
		"S": 0.09808,
		"P01": 17,
		"P1": 18.2,
		"P3": 18.9,
		"P5": 19.3,
		"P10": 20,
		"P15": 20.5,
		"P25": 21.2,
		"P50": 22.6,
		"P75": 24.2,
		"P85": 25.1,
		"P90": 25.7,
		"P95": 26.7,
		"P97": 27.4,
		"P99": 28.7,
		"P999": 31.2
	},
	{
		"Height": 120,
		"L": -0.3833,
		"M": 22.8173,
		"S": 0.09828,
		"P01": 17.1,
		"P1": 18.3,
		"P3": 19.1,
		"P5": 19.5,
		"P10": 20.2,
		"P15": 20.6,
		"P25": 21.4,
		"P50": 22.8,
		"P75": 24.4,
		"P85": 25.3,
		"P90": 26,
		"P95": 27,
		"P97": 27.6,
		"P99": 29,
		"P999": 31.5
	}
];

/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var programConfigExports = {};
programConfigExports.Child = __webpack_require__(1);

var observationRulesExports = {};
observationRulesExports.Mother = __webpack_require__(2);

var config = function config(programName) {
    if (!programName) {
        return programConfigExports;
    }

    return programConfigExports[programName];
};

var observationRules = function observationRules(programName) {
    if (!programName) {
        return observationRulesExports;
    }

    var observationRules = observationRulesExports[programName];
    return observationRules ? observationRules : [];
};

module.exports = {
    config: config,
    observationRules: observationRules
};

/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global, module) {var __WEBPACK_AMD_DEFINE_RESULT__;var _typeof=typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"?function(obj){return typeof obj;}:function(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj;};/**
 * @license
 * Lodash <https://lodash.com/>
 * Copyright JS Foundation and other contributors <https://js.foundation/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */;(function(){/** Used as a safe reference for `undefined` in pre-ES5 environments. */var undefined;/** Used as the semantic version number. */var VERSION='4.17.4';/** Used as the size to enable large array optimizations. */var LARGE_ARRAY_SIZE=200;/** Error message constants. */var CORE_ERROR_TEXT='Unsupported core-js use. Try https://npms.io/search?q=ponyfill.',FUNC_ERROR_TEXT='Expected a function';/** Used to stand-in for `undefined` hash values. */var HASH_UNDEFINED='__lodash_hash_undefined__';/** Used as the maximum memoize cache size. */var MAX_MEMOIZE_SIZE=500;/** Used as the internal argument placeholder. */var PLACEHOLDER='__lodash_placeholder__';/** Used to compose bitmasks for cloning. */var CLONE_DEEP_FLAG=1,CLONE_FLAT_FLAG=2,CLONE_SYMBOLS_FLAG=4;/** Used to compose bitmasks for value comparisons. */var COMPARE_PARTIAL_FLAG=1,COMPARE_UNORDERED_FLAG=2;/** Used to compose bitmasks for function metadata. */var WRAP_BIND_FLAG=1,WRAP_BIND_KEY_FLAG=2,WRAP_CURRY_BOUND_FLAG=4,WRAP_CURRY_FLAG=8,WRAP_CURRY_RIGHT_FLAG=16,WRAP_PARTIAL_FLAG=32,WRAP_PARTIAL_RIGHT_FLAG=64,WRAP_ARY_FLAG=128,WRAP_REARG_FLAG=256,WRAP_FLIP_FLAG=512;/** Used as default options for `_.truncate`. */var DEFAULT_TRUNC_LENGTH=30,DEFAULT_TRUNC_OMISSION='...';/** Used to detect hot functions by number of calls within a span of milliseconds. */var HOT_COUNT=800,HOT_SPAN=16;/** Used to indicate the type of lazy iteratees. */var LAZY_FILTER_FLAG=1,LAZY_MAP_FLAG=2,LAZY_WHILE_FLAG=3;/** Used as references for various `Number` constants. */var INFINITY=1/0,MAX_SAFE_INTEGER=9007199254740991,MAX_INTEGER=1.7976931348623157e+308,NAN=0/0;/** Used as references for the maximum length and index of an array. */var MAX_ARRAY_LENGTH=4294967295,MAX_ARRAY_INDEX=MAX_ARRAY_LENGTH-1,HALF_MAX_ARRAY_LENGTH=MAX_ARRAY_LENGTH>>>1;/** Used to associate wrap methods with their bit flags. */var wrapFlags=[['ary',WRAP_ARY_FLAG],['bind',WRAP_BIND_FLAG],['bindKey',WRAP_BIND_KEY_FLAG],['curry',WRAP_CURRY_FLAG],['curryRight',WRAP_CURRY_RIGHT_FLAG],['flip',WRAP_FLIP_FLAG],['partial',WRAP_PARTIAL_FLAG],['partialRight',WRAP_PARTIAL_RIGHT_FLAG],['rearg',WRAP_REARG_FLAG]];/** `Object#toString` result references. */var argsTag='[object Arguments]',arrayTag='[object Array]',asyncTag='[object AsyncFunction]',boolTag='[object Boolean]',dateTag='[object Date]',domExcTag='[object DOMException]',errorTag='[object Error]',funcTag='[object Function]',genTag='[object GeneratorFunction]',mapTag='[object Map]',numberTag='[object Number]',nullTag='[object Null]',objectTag='[object Object]',promiseTag='[object Promise]',proxyTag='[object Proxy]',regexpTag='[object RegExp]',setTag='[object Set]',stringTag='[object String]',symbolTag='[object Symbol]',undefinedTag='[object Undefined]',weakMapTag='[object WeakMap]',weakSetTag='[object WeakSet]';var arrayBufferTag='[object ArrayBuffer]',dataViewTag='[object DataView]',float32Tag='[object Float32Array]',float64Tag='[object Float64Array]',int8Tag='[object Int8Array]',int16Tag='[object Int16Array]',int32Tag='[object Int32Array]',uint8Tag='[object Uint8Array]',uint8ClampedTag='[object Uint8ClampedArray]',uint16Tag='[object Uint16Array]',uint32Tag='[object Uint32Array]';/** Used to match empty string literals in compiled template source. */var reEmptyStringLeading=/\b__p \+= '';/g,reEmptyStringMiddle=/\b(__p \+=) '' \+/g,reEmptyStringTrailing=/(__e\(.*?\)|\b__t\)) \+\n'';/g;/** Used to match HTML entities and HTML characters. */var reEscapedHtml=/&(?:amp|lt|gt|quot|#39);/g,reUnescapedHtml=/[&<>"']/g,reHasEscapedHtml=RegExp(reEscapedHtml.source),reHasUnescapedHtml=RegExp(reUnescapedHtml.source);/** Used to match template delimiters. */var reEscape=/<%-([\s\S]+?)%>/g,reEvaluate=/<%([\s\S]+?)%>/g,reInterpolate=/<%=([\s\S]+?)%>/g;/** Used to match property names within property paths. */var reIsDeepProp=/\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,reIsPlainProp=/^\w*$/,reLeadingDot=/^\./,rePropName=/[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;/**
   * Used to match `RegExp`
   * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
   */var reRegExpChar=/[\\^$.*+?()[\]{}|]/g,reHasRegExpChar=RegExp(reRegExpChar.source);/** Used to match leading and trailing whitespace. */var reTrim=/^\s+|\s+$/g,reTrimStart=/^\s+/,reTrimEnd=/\s+$/;/** Used to match wrap detail comments. */var reWrapComment=/\{(?:\n\/\* \[wrapped with .+\] \*\/)?\n?/,reWrapDetails=/\{\n\/\* \[wrapped with (.+)\] \*/,reSplitDetails=/,? & /;/** Used to match words composed of alphanumeric characters. */var reAsciiWord=/[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;/** Used to match backslashes in property paths. */var reEscapeChar=/\\(\\)?/g;/**
   * Used to match
   * [ES template delimiters](http://ecma-international.org/ecma-262/7.0/#sec-template-literal-lexical-components).
   */var reEsTemplate=/\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;/** Used to match `RegExp` flags from their coerced string values. */var reFlags=/\w*$/;/** Used to detect bad signed hexadecimal string values. */var reIsBadHex=/^[-+]0x[0-9a-f]+$/i;/** Used to detect binary string values. */var reIsBinary=/^0b[01]+$/i;/** Used to detect host constructors (Safari). */var reIsHostCtor=/^\[object .+?Constructor\]$/;/** Used to detect octal string values. */var reIsOctal=/^0o[0-7]+$/i;/** Used to detect unsigned integer values. */var reIsUint=/^(?:0|[1-9]\d*)$/;/** Used to match Latin Unicode letters (excluding mathematical operators). */var reLatin=/[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;/** Used to ensure capturing order of template delimiters. */var reNoMatch=/($^)/;/** Used to match unescaped characters in compiled string literals. */var reUnescapedString=/['\n\r\u2028\u2029\\]/g;/** Used to compose unicode character classes. */var rsAstralRange='\\ud800-\\udfff',rsComboMarksRange='\\u0300-\\u036f',reComboHalfMarksRange='\\ufe20-\\ufe2f',rsComboSymbolsRange='\\u20d0-\\u20ff',rsComboRange=rsComboMarksRange+reComboHalfMarksRange+rsComboSymbolsRange,rsDingbatRange='\\u2700-\\u27bf',rsLowerRange='a-z\\xdf-\\xf6\\xf8-\\xff',rsMathOpRange='\\xac\\xb1\\xd7\\xf7',rsNonCharRange='\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf',rsPunctuationRange='\\u2000-\\u206f',rsSpaceRange=' \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000',rsUpperRange='A-Z\\xc0-\\xd6\\xd8-\\xde',rsVarRange='\\ufe0e\\ufe0f',rsBreakRange=rsMathOpRange+rsNonCharRange+rsPunctuationRange+rsSpaceRange;/** Used to compose unicode capture groups. */var rsApos='[\'\u2019]',rsAstral='['+rsAstralRange+']',rsBreak='['+rsBreakRange+']',rsCombo='['+rsComboRange+']',rsDigits='\\d+',rsDingbat='['+rsDingbatRange+']',rsLower='['+rsLowerRange+']',rsMisc='[^'+rsAstralRange+rsBreakRange+rsDigits+rsDingbatRange+rsLowerRange+rsUpperRange+']',rsFitz='\\ud83c[\\udffb-\\udfff]',rsModifier='(?:'+rsCombo+'|'+rsFitz+')',rsNonAstral='[^'+rsAstralRange+']',rsRegional='(?:\\ud83c[\\udde6-\\uddff]){2}',rsSurrPair='[\\ud800-\\udbff][\\udc00-\\udfff]',rsUpper='['+rsUpperRange+']',rsZWJ='\\u200d';/** Used to compose unicode regexes. */var rsMiscLower='(?:'+rsLower+'|'+rsMisc+')',rsMiscUpper='(?:'+rsUpper+'|'+rsMisc+')',rsOptContrLower='(?:'+rsApos+'(?:d|ll|m|re|s|t|ve))?',rsOptContrUpper='(?:'+rsApos+'(?:D|LL|M|RE|S|T|VE))?',reOptMod=rsModifier+'?',rsOptVar='['+rsVarRange+']?',rsOptJoin='(?:'+rsZWJ+'(?:'+[rsNonAstral,rsRegional,rsSurrPair].join('|')+')'+rsOptVar+reOptMod+')*',rsOrdLower='\\d*(?:(?:1st|2nd|3rd|(?![123])\\dth)\\b)',rsOrdUpper='\\d*(?:(?:1ST|2ND|3RD|(?![123])\\dTH)\\b)',rsSeq=rsOptVar+reOptMod+rsOptJoin,rsEmoji='(?:'+[rsDingbat,rsRegional,rsSurrPair].join('|')+')'+rsSeq,rsSymbol='(?:'+[rsNonAstral+rsCombo+'?',rsCombo,rsRegional,rsSurrPair,rsAstral].join('|')+')';/** Used to match apostrophes. */var reApos=RegExp(rsApos,'g');/**
   * Used to match [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks) and
   * [combining diacritical marks for symbols](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks_for_Symbols).
   */var reComboMark=RegExp(rsCombo,'g');/** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */var reUnicode=RegExp(rsFitz+'(?='+rsFitz+')|'+rsSymbol+rsSeq,'g');/** Used to match complex or compound words. */var reUnicodeWord=RegExp([rsUpper+'?'+rsLower+'+'+rsOptContrLower+'(?='+[rsBreak,rsUpper,'$'].join('|')+')',rsMiscUpper+'+'+rsOptContrUpper+'(?='+[rsBreak,rsUpper+rsMiscLower,'$'].join('|')+')',rsUpper+'?'+rsMiscLower+'+'+rsOptContrLower,rsUpper+'+'+rsOptContrUpper,rsOrdUpper,rsOrdLower,rsDigits,rsEmoji].join('|'),'g');/** Used to detect strings with [zero-width joiners or code points from the astral planes](http://eev.ee/blog/2015/09/12/dark-corners-of-unicode/). */var reHasUnicode=RegExp('['+rsZWJ+rsAstralRange+rsComboRange+rsVarRange+']');/** Used to detect strings that need a more robust regexp to match words. */var reHasUnicodeWord=/[a-z][A-Z]|[A-Z]{2,}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;/** Used to assign default `context` object properties. */var contextProps=['Array','Buffer','DataView','Date','Error','Float32Array','Float64Array','Function','Int8Array','Int16Array','Int32Array','Map','Math','Object','Promise','RegExp','Set','String','Symbol','TypeError','Uint8Array','Uint8ClampedArray','Uint16Array','Uint32Array','WeakMap','_','clearTimeout','isFinite','parseInt','setTimeout'];/** Used to make template sourceURLs easier to identify. */var templateCounter=-1;/** Used to identify `toStringTag` values of typed arrays. */var typedArrayTags={};typedArrayTags[float32Tag]=typedArrayTags[float64Tag]=typedArrayTags[int8Tag]=typedArrayTags[int16Tag]=typedArrayTags[int32Tag]=typedArrayTags[uint8Tag]=typedArrayTags[uint8ClampedTag]=typedArrayTags[uint16Tag]=typedArrayTags[uint32Tag]=true;typedArrayTags[argsTag]=typedArrayTags[arrayTag]=typedArrayTags[arrayBufferTag]=typedArrayTags[boolTag]=typedArrayTags[dataViewTag]=typedArrayTags[dateTag]=typedArrayTags[errorTag]=typedArrayTags[funcTag]=typedArrayTags[mapTag]=typedArrayTags[numberTag]=typedArrayTags[objectTag]=typedArrayTags[regexpTag]=typedArrayTags[setTag]=typedArrayTags[stringTag]=typedArrayTags[weakMapTag]=false;/** Used to identify `toStringTag` values supported by `_.clone`. */var cloneableTags={};cloneableTags[argsTag]=cloneableTags[arrayTag]=cloneableTags[arrayBufferTag]=cloneableTags[dataViewTag]=cloneableTags[boolTag]=cloneableTags[dateTag]=cloneableTags[float32Tag]=cloneableTags[float64Tag]=cloneableTags[int8Tag]=cloneableTags[int16Tag]=cloneableTags[int32Tag]=cloneableTags[mapTag]=cloneableTags[numberTag]=cloneableTags[objectTag]=cloneableTags[regexpTag]=cloneableTags[setTag]=cloneableTags[stringTag]=cloneableTags[symbolTag]=cloneableTags[uint8Tag]=cloneableTags[uint8ClampedTag]=cloneableTags[uint16Tag]=cloneableTags[uint32Tag]=true;cloneableTags[errorTag]=cloneableTags[funcTag]=cloneableTags[weakMapTag]=false;/** Used to map Latin Unicode letters to basic Latin letters. */var deburredLetters={// Latin-1 Supplement block.
'\xc0':'A','\xc1':'A','\xc2':'A','\xc3':'A','\xc4':'A','\xc5':'A','\xe0':'a','\xe1':'a','\xe2':'a','\xe3':'a','\xe4':'a','\xe5':'a','\xc7':'C','\xe7':'c','\xd0':'D','\xf0':'d','\xc8':'E','\xc9':'E','\xca':'E','\xcb':'E','\xe8':'e','\xe9':'e','\xea':'e','\xeb':'e','\xcc':'I','\xcd':'I','\xce':'I','\xcf':'I','\xec':'i','\xed':'i','\xee':'i','\xef':'i','\xd1':'N','\xf1':'n','\xd2':'O','\xd3':'O','\xd4':'O','\xd5':'O','\xd6':'O','\xd8':'O','\xf2':'o','\xf3':'o','\xf4':'o','\xf5':'o','\xf6':'o','\xf8':'o','\xd9':'U','\xda':'U','\xdb':'U','\xdc':'U','\xf9':'u','\xfa':'u','\xfb':'u','\xfc':'u','\xdd':'Y','\xfd':'y','\xff':'y','\xc6':'Ae','\xe6':'ae','\xde':'Th','\xfe':'th','\xdf':'ss',// Latin Extended-A block.
'\u0100':'A','\u0102':'A','\u0104':'A','\u0101':'a','\u0103':'a','\u0105':'a','\u0106':'C','\u0108':'C','\u010A':'C','\u010C':'C','\u0107':'c','\u0109':'c','\u010B':'c','\u010D':'c','\u010E':'D','\u0110':'D','\u010F':'d','\u0111':'d','\u0112':'E','\u0114':'E','\u0116':'E','\u0118':'E','\u011A':'E','\u0113':'e','\u0115':'e','\u0117':'e','\u0119':'e','\u011B':'e','\u011C':'G','\u011E':'G','\u0120':'G','\u0122':'G','\u011D':'g','\u011F':'g','\u0121':'g','\u0123':'g','\u0124':'H','\u0126':'H','\u0125':'h','\u0127':'h','\u0128':'I','\u012A':'I','\u012C':'I','\u012E':'I','\u0130':'I','\u0129':'i','\u012B':'i','\u012D':'i','\u012F':'i','\u0131':'i','\u0134':'J','\u0135':'j','\u0136':'K','\u0137':'k','\u0138':'k','\u0139':'L','\u013B':'L','\u013D':'L','\u013F':'L','\u0141':'L','\u013A':'l','\u013C':'l','\u013E':'l','\u0140':'l','\u0142':'l','\u0143':'N','\u0145':'N','\u0147':'N','\u014A':'N','\u0144':'n','\u0146':'n','\u0148':'n','\u014B':'n','\u014C':'O','\u014E':'O','\u0150':'O','\u014D':'o','\u014F':'o','\u0151':'o','\u0154':'R','\u0156':'R','\u0158':'R','\u0155':'r','\u0157':'r','\u0159':'r','\u015A':'S','\u015C':'S','\u015E':'S','\u0160':'S','\u015B':'s','\u015D':'s','\u015F':'s','\u0161':'s','\u0162':'T','\u0164':'T','\u0166':'T','\u0163':'t','\u0165':'t','\u0167':'t','\u0168':'U','\u016A':'U','\u016C':'U','\u016E':'U','\u0170':'U','\u0172':'U','\u0169':'u','\u016B':'u','\u016D':'u','\u016F':'u','\u0171':'u','\u0173':'u','\u0174':'W','\u0175':'w','\u0176':'Y','\u0177':'y','\u0178':'Y','\u0179':'Z','\u017B':'Z','\u017D':'Z','\u017A':'z','\u017C':'z','\u017E':'z','\u0132':'IJ','\u0133':'ij','\u0152':'Oe','\u0153':'oe','\u0149':"'n",'\u017F':'s'};/** Used to map characters to HTML entities. */var htmlEscapes={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};/** Used to map HTML entities to characters. */var htmlUnescapes={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"};/** Used to escape characters for inclusion in compiled string literals. */var stringEscapes={'\\':'\\',"'":"'",'\n':'n','\r':'r','\u2028':'u2028','\u2029':'u2029'};/** Built-in method references without a dependency on `root`. */var freeParseFloat=parseFloat,freeParseInt=parseInt;/** Detect free variable `global` from Node.js. */var freeGlobal=(typeof global==='undefined'?'undefined':_typeof(global))=='object'&&global&&global.Object===Object&&global;/** Detect free variable `self`. */var freeSelf=(typeof self==='undefined'?'undefined':_typeof(self))=='object'&&self&&self.Object===Object&&self;/** Used as a reference to the global object. */var root=freeGlobal||freeSelf||Function('return this')();/** Detect free variable `exports`. */var freeExports=( false?'undefined':_typeof(exports))=='object'&&exports&&!exports.nodeType&&exports;/** Detect free variable `module`. */var freeModule=freeExports&&( false?'undefined':_typeof(module))=='object'&&module&&!module.nodeType&&module;/** Detect the popular CommonJS extension `module.exports`. */var moduleExports=freeModule&&freeModule.exports===freeExports;/** Detect free variable `process` from Node.js. */var freeProcess=moduleExports&&freeGlobal.process;/** Used to access faster Node.js helpers. */var nodeUtil=function(){try{return freeProcess&&freeProcess.binding&&freeProcess.binding('util');}catch(e){}}();/* Node.js helper references. */var nodeIsArrayBuffer=nodeUtil&&nodeUtil.isArrayBuffer,nodeIsDate=nodeUtil&&nodeUtil.isDate,nodeIsMap=nodeUtil&&nodeUtil.isMap,nodeIsRegExp=nodeUtil&&nodeUtil.isRegExp,nodeIsSet=nodeUtil&&nodeUtil.isSet,nodeIsTypedArray=nodeUtil&&nodeUtil.isTypedArray;/*--------------------------------------------------------------------------*//**
   * Adds the key-value `pair` to `map`.
   *
   * @private
   * @param {Object} map The map to modify.
   * @param {Array} pair The key-value pair to add.
   * @returns {Object} Returns `map`.
   */function addMapEntry(map,pair){// Don't return `map.set` because it's not chainable in IE 11.
map.set(pair[0],pair[1]);return map;}/**
   * Adds `value` to `set`.
   *
   * @private
   * @param {Object} set The set to modify.
   * @param {*} value The value to add.
   * @returns {Object} Returns `set`.
   */function addSetEntry(set,value){// Don't return `set.add` because it's not chainable in IE 11.
set.add(value);return set;}/**
   * A faster alternative to `Function#apply`, this function invokes `func`
   * with the `this` binding of `thisArg` and the arguments of `args`.
   *
   * @private
   * @param {Function} func The function to invoke.
   * @param {*} thisArg The `this` binding of `func`.
   * @param {Array} args The arguments to invoke `func` with.
   * @returns {*} Returns the result of `func`.
   */function apply(func,thisArg,args){switch(args.length){case 0:return func.call(thisArg);case 1:return func.call(thisArg,args[0]);case 2:return func.call(thisArg,args[0],args[1]);case 3:return func.call(thisArg,args[0],args[1],args[2]);}return func.apply(thisArg,args);}/**
   * A specialized version of `baseAggregator` for arrays.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} setter The function to set `accumulator` values.
   * @param {Function} iteratee The iteratee to transform keys.
   * @param {Object} accumulator The initial aggregated object.
   * @returns {Function} Returns `accumulator`.
   */function arrayAggregator(array,setter,iteratee,accumulator){var index=-1,length=array==null?0:array.length;while(++index<length){var value=array[index];setter(accumulator,value,iteratee(value),array);}return accumulator;}/**
   * A specialized version of `_.forEach` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns `array`.
   */function arrayEach(array,iteratee){var index=-1,length=array==null?0:array.length;while(++index<length){if(iteratee(array[index],index,array)===false){break;}}return array;}/**
   * A specialized version of `_.forEachRight` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns `array`.
   */function arrayEachRight(array,iteratee){var length=array==null?0:array.length;while(length--){if(iteratee(array[length],length,array)===false){break;}}return array;}/**
   * A specialized version of `_.every` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {boolean} Returns `true` if all elements pass the predicate check,
   *  else `false`.
   */function arrayEvery(array,predicate){var index=-1,length=array==null?0:array.length;while(++index<length){if(!predicate(array[index],index,array)){return false;}}return true;}/**
   * A specialized version of `_.filter` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {Array} Returns the new filtered array.
   */function arrayFilter(array,predicate){var index=-1,length=array==null?0:array.length,resIndex=0,result=[];while(++index<length){var value=array[index];if(predicate(value,index,array)){result[resIndex++]=value;}}return result;}/**
   * A specialized version of `_.includes` for arrays without support for
   * specifying an index to search from.
   *
   * @private
   * @param {Array} [array] The array to inspect.
   * @param {*} target The value to search for.
   * @returns {boolean} Returns `true` if `target` is found, else `false`.
   */function arrayIncludes(array,value){var length=array==null?0:array.length;return!!length&&baseIndexOf(array,value,0)>-1;}/**
   * This function is like `arrayIncludes` except that it accepts a comparator.
   *
   * @private
   * @param {Array} [array] The array to inspect.
   * @param {*} target The value to search for.
   * @param {Function} comparator The comparator invoked per element.
   * @returns {boolean} Returns `true` if `target` is found, else `false`.
   */function arrayIncludesWith(array,value,comparator){var index=-1,length=array==null?0:array.length;while(++index<length){if(comparator(value,array[index])){return true;}}return false;}/**
   * A specialized version of `_.map` for arrays without support for iteratee
   * shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the new mapped array.
   */function arrayMap(array,iteratee){var index=-1,length=array==null?0:array.length,result=Array(length);while(++index<length){result[index]=iteratee(array[index],index,array);}return result;}/**
   * Appends the elements of `values` to `array`.
   *
   * @private
   * @param {Array} array The array to modify.
   * @param {Array} values The values to append.
   * @returns {Array} Returns `array`.
   */function arrayPush(array,values){var index=-1,length=values.length,offset=array.length;while(++index<length){array[offset+index]=values[index];}return array;}/**
   * A specialized version of `_.reduce` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {*} [accumulator] The initial value.
   * @param {boolean} [initAccum] Specify using the first element of `array` as
   *  the initial value.
   * @returns {*} Returns the accumulated value.
   */function arrayReduce(array,iteratee,accumulator,initAccum){var index=-1,length=array==null?0:array.length;if(initAccum&&length){accumulator=array[++index];}while(++index<length){accumulator=iteratee(accumulator,array[index],index,array);}return accumulator;}/**
   * A specialized version of `_.reduceRight` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {*} [accumulator] The initial value.
   * @param {boolean} [initAccum] Specify using the last element of `array` as
   *  the initial value.
   * @returns {*} Returns the accumulated value.
   */function arrayReduceRight(array,iteratee,accumulator,initAccum){var length=array==null?0:array.length;if(initAccum&&length){accumulator=array[--length];}while(length--){accumulator=iteratee(accumulator,array[length],length,array);}return accumulator;}/**
   * A specialized version of `_.some` for arrays without support for iteratee
   * shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {boolean} Returns `true` if any element passes the predicate check,
   *  else `false`.
   */function arraySome(array,predicate){var index=-1,length=array==null?0:array.length;while(++index<length){if(predicate(array[index],index,array)){return true;}}return false;}/**
   * Gets the size of an ASCII `string`.
   *
   * @private
   * @param {string} string The string inspect.
   * @returns {number} Returns the string size.
   */var asciiSize=baseProperty('length');/**
   * Converts an ASCII `string` to an array.
   *
   * @private
   * @param {string} string The string to convert.
   * @returns {Array} Returns the converted array.
   */function asciiToArray(string){return string.split('');}/**
   * Splits an ASCII `string` into an array of its words.
   *
   * @private
   * @param {string} The string to inspect.
   * @returns {Array} Returns the words of `string`.
   */function asciiWords(string){return string.match(reAsciiWord)||[];}/**
   * The base implementation of methods like `_.findKey` and `_.findLastKey`,
   * without support for iteratee shorthands, which iterates over `collection`
   * using `eachFunc`.
   *
   * @private
   * @param {Array|Object} collection The collection to inspect.
   * @param {Function} predicate The function invoked per iteration.
   * @param {Function} eachFunc The function to iterate over `collection`.
   * @returns {*} Returns the found element or its key, else `undefined`.
   */function baseFindKey(collection,predicate,eachFunc){var result;eachFunc(collection,function(value,key,collection){if(predicate(value,key,collection)){result=key;return false;}});return result;}/**
   * The base implementation of `_.findIndex` and `_.findLastIndex` without
   * support for iteratee shorthands.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {Function} predicate The function invoked per iteration.
   * @param {number} fromIndex The index to search from.
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */function baseFindIndex(array,predicate,fromIndex,fromRight){var length=array.length,index=fromIndex+(fromRight?1:-1);while(fromRight?index--:++index<length){if(predicate(array[index],index,array)){return index;}}return-1;}/**
   * The base implementation of `_.indexOf` without `fromIndex` bounds checks.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {*} value The value to search for.
   * @param {number} fromIndex The index to search from.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */function baseIndexOf(array,value,fromIndex){return value===value?strictIndexOf(array,value,fromIndex):baseFindIndex(array,baseIsNaN,fromIndex);}/**
   * This function is like `baseIndexOf` except that it accepts a comparator.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {*} value The value to search for.
   * @param {number} fromIndex The index to search from.
   * @param {Function} comparator The comparator invoked per element.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */function baseIndexOfWith(array,value,fromIndex,comparator){var index=fromIndex-1,length=array.length;while(++index<length){if(comparator(array[index],value)){return index;}}return-1;}/**
   * The base implementation of `_.isNaN` without support for number objects.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
   */function baseIsNaN(value){return value!==value;}/**
   * The base implementation of `_.mean` and `_.meanBy` without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {number} Returns the mean.
   */function baseMean(array,iteratee){var length=array==null?0:array.length;return length?baseSum(array,iteratee)/length:NAN;}/**
   * The base implementation of `_.property` without support for deep paths.
   *
   * @private
   * @param {string} key The key of the property to get.
   * @returns {Function} Returns the new accessor function.
   */function baseProperty(key){return function(object){return object==null?undefined:object[key];};}/**
   * The base implementation of `_.propertyOf` without support for deep paths.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Function} Returns the new accessor function.
   */function basePropertyOf(object){return function(key){return object==null?undefined:object[key];};}/**
   * The base implementation of `_.reduce` and `_.reduceRight`, without support
   * for iteratee shorthands, which iterates over `collection` using `eachFunc`.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {*} accumulator The initial value.
   * @param {boolean} initAccum Specify using the first or last element of
   *  `collection` as the initial value.
   * @param {Function} eachFunc The function to iterate over `collection`.
   * @returns {*} Returns the accumulated value.
   */function baseReduce(collection,iteratee,accumulator,initAccum,eachFunc){eachFunc(collection,function(value,index,collection){accumulator=initAccum?(initAccum=false,value):iteratee(accumulator,value,index,collection);});return accumulator;}/**
   * The base implementation of `_.sortBy` which uses `comparer` to define the
   * sort order of `array` and replaces criteria objects with their corresponding
   * values.
   *
   * @private
   * @param {Array} array The array to sort.
   * @param {Function} comparer The function to define sort order.
   * @returns {Array} Returns `array`.
   */function baseSortBy(array,comparer){var length=array.length;array.sort(comparer);while(length--){array[length]=array[length].value;}return array;}/**
   * The base implementation of `_.sum` and `_.sumBy` without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {number} Returns the sum.
   */function baseSum(array,iteratee){var result,index=-1,length=array.length;while(++index<length){var current=iteratee(array[index]);if(current!==undefined){result=result===undefined?current:result+current;}}return result;}/**
   * The base implementation of `_.times` without support for iteratee shorthands
   * or max array length checks.
   *
   * @private
   * @param {number} n The number of times to invoke `iteratee`.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the array of results.
   */function baseTimes(n,iteratee){var index=-1,result=Array(n);while(++index<n){result[index]=iteratee(index);}return result;}/**
   * The base implementation of `_.toPairs` and `_.toPairsIn` which creates an array
   * of key-value pairs for `object` corresponding to the property names of `props`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array} props The property names to get values for.
   * @returns {Object} Returns the key-value pairs.
   */function baseToPairs(object,props){return arrayMap(props,function(key){return[key,object[key]];});}/**
   * The base implementation of `_.unary` without support for storing metadata.
   *
   * @private
   * @param {Function} func The function to cap arguments for.
   * @returns {Function} Returns the new capped function.
   */function baseUnary(func){return function(value){return func(value);};}/**
   * The base implementation of `_.values` and `_.valuesIn` which creates an
   * array of `object` property values corresponding to the property names
   * of `props`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array} props The property names to get values for.
   * @returns {Object} Returns the array of property values.
   */function baseValues(object,props){return arrayMap(props,function(key){return object[key];});}/**
   * Checks if a `cache` value for `key` exists.
   *
   * @private
   * @param {Object} cache The cache to query.
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */function cacheHas(cache,key){return cache.has(key);}/**
   * Used by `_.trim` and `_.trimStart` to get the index of the first string symbol
   * that is not found in the character symbols.
   *
   * @private
   * @param {Array} strSymbols The string symbols to inspect.
   * @param {Array} chrSymbols The character symbols to find.
   * @returns {number} Returns the index of the first unmatched string symbol.
   */function charsStartIndex(strSymbols,chrSymbols){var index=-1,length=strSymbols.length;while(++index<length&&baseIndexOf(chrSymbols,strSymbols[index],0)>-1){}return index;}/**
   * Used by `_.trim` and `_.trimEnd` to get the index of the last string symbol
   * that is not found in the character symbols.
   *
   * @private
   * @param {Array} strSymbols The string symbols to inspect.
   * @param {Array} chrSymbols The character symbols to find.
   * @returns {number} Returns the index of the last unmatched string symbol.
   */function charsEndIndex(strSymbols,chrSymbols){var index=strSymbols.length;while(index--&&baseIndexOf(chrSymbols,strSymbols[index],0)>-1){}return index;}/**
   * Gets the number of `placeholder` occurrences in `array`.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {*} placeholder The placeholder to search for.
   * @returns {number} Returns the placeholder count.
   */function countHolders(array,placeholder){var length=array.length,result=0;while(length--){if(array[length]===placeholder){++result;}}return result;}/**
   * Used by `_.deburr` to convert Latin-1 Supplement and Latin Extended-A
   * letters to basic Latin letters.
   *
   * @private
   * @param {string} letter The matched letter to deburr.
   * @returns {string} Returns the deburred letter.
   */var deburrLetter=basePropertyOf(deburredLetters);/**
   * Used by `_.escape` to convert characters to HTML entities.
   *
   * @private
   * @param {string} chr The matched character to escape.
   * @returns {string} Returns the escaped character.
   */var escapeHtmlChar=basePropertyOf(htmlEscapes);/**
   * Used by `_.template` to escape characters for inclusion in compiled string literals.
   *
   * @private
   * @param {string} chr The matched character to escape.
   * @returns {string} Returns the escaped character.
   */function escapeStringChar(chr){return'\\'+stringEscapes[chr];}/**
   * Gets the value at `key` of `object`.
   *
   * @private
   * @param {Object} [object] The object to query.
   * @param {string} key The key of the property to get.
   * @returns {*} Returns the property value.
   */function getValue(object,key){return object==null?undefined:object[key];}/**
   * Checks if `string` contains Unicode symbols.
   *
   * @private
   * @param {string} string The string to inspect.
   * @returns {boolean} Returns `true` if a symbol is found, else `false`.
   */function hasUnicode(string){return reHasUnicode.test(string);}/**
   * Checks if `string` contains a word composed of Unicode symbols.
   *
   * @private
   * @param {string} string The string to inspect.
   * @returns {boolean} Returns `true` if a word is found, else `false`.
   */function hasUnicodeWord(string){return reHasUnicodeWord.test(string);}/**
   * Converts `iterator` to an array.
   *
   * @private
   * @param {Object} iterator The iterator to convert.
   * @returns {Array} Returns the converted array.
   */function iteratorToArray(iterator){var data,result=[];while(!(data=iterator.next()).done){result.push(data.value);}return result;}/**
   * Converts `map` to its key-value pairs.
   *
   * @private
   * @param {Object} map The map to convert.
   * @returns {Array} Returns the key-value pairs.
   */function mapToArray(map){var index=-1,result=Array(map.size);map.forEach(function(value,key){result[++index]=[key,value];});return result;}/**
   * Creates a unary function that invokes `func` with its argument transformed.
   *
   * @private
   * @param {Function} func The function to wrap.
   * @param {Function} transform The argument transform.
   * @returns {Function} Returns the new function.
   */function overArg(func,transform){return function(arg){return func(transform(arg));};}/**
   * Replaces all `placeholder` elements in `array` with an internal placeholder
   * and returns an array of their indexes.
   *
   * @private
   * @param {Array} array The array to modify.
   * @param {*} placeholder The placeholder to replace.
   * @returns {Array} Returns the new array of placeholder indexes.
   */function replaceHolders(array,placeholder){var index=-1,length=array.length,resIndex=0,result=[];while(++index<length){var value=array[index];if(value===placeholder||value===PLACEHOLDER){array[index]=PLACEHOLDER;result[resIndex++]=index;}}return result;}/**
   * Converts `set` to an array of its values.
   *
   * @private
   * @param {Object} set The set to convert.
   * @returns {Array} Returns the values.
   */function setToArray(set){var index=-1,result=Array(set.size);set.forEach(function(value){result[++index]=value;});return result;}/**
   * Converts `set` to its value-value pairs.
   *
   * @private
   * @param {Object} set The set to convert.
   * @returns {Array} Returns the value-value pairs.
   */function setToPairs(set){var index=-1,result=Array(set.size);set.forEach(function(value){result[++index]=[value,value];});return result;}/**
   * A specialized version of `_.indexOf` which performs strict equality
   * comparisons of values, i.e. `===`.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {*} value The value to search for.
   * @param {number} fromIndex The index to search from.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */function strictIndexOf(array,value,fromIndex){var index=fromIndex-1,length=array.length;while(++index<length){if(array[index]===value){return index;}}return-1;}/**
   * A specialized version of `_.lastIndexOf` which performs strict equality
   * comparisons of values, i.e. `===`.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {*} value The value to search for.
   * @param {number} fromIndex The index to search from.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */function strictLastIndexOf(array,value,fromIndex){var index=fromIndex+1;while(index--){if(array[index]===value){return index;}}return index;}/**
   * Gets the number of symbols in `string`.
   *
   * @private
   * @param {string} string The string to inspect.
   * @returns {number} Returns the string size.
   */function stringSize(string){return hasUnicode(string)?unicodeSize(string):asciiSize(string);}/**
   * Converts `string` to an array.
   *
   * @private
   * @param {string} string The string to convert.
   * @returns {Array} Returns the converted array.
   */function stringToArray(string){return hasUnicode(string)?unicodeToArray(string):asciiToArray(string);}/**
   * Used by `_.unescape` to convert HTML entities to characters.
   *
   * @private
   * @param {string} chr The matched character to unescape.
   * @returns {string} Returns the unescaped character.
   */var unescapeHtmlChar=basePropertyOf(htmlUnescapes);/**
   * Gets the size of a Unicode `string`.
   *
   * @private
   * @param {string} string The string inspect.
   * @returns {number} Returns the string size.
   */function unicodeSize(string){var result=reUnicode.lastIndex=0;while(reUnicode.test(string)){++result;}return result;}/**
   * Converts a Unicode `string` to an array.
   *
   * @private
   * @param {string} string The string to convert.
   * @returns {Array} Returns the converted array.
   */function unicodeToArray(string){return string.match(reUnicode)||[];}/**
   * Splits a Unicode `string` into an array of its words.
   *
   * @private
   * @param {string} The string to inspect.
   * @returns {Array} Returns the words of `string`.
   */function unicodeWords(string){return string.match(reUnicodeWord)||[];}/*--------------------------------------------------------------------------*//**
   * Create a new pristine `lodash` function using the `context` object.
   *
   * @static
   * @memberOf _
   * @since 1.1.0
   * @category Util
   * @param {Object} [context=root] The context object.
   * @returns {Function} Returns a new `lodash` function.
   * @example
   *
   * _.mixin({ 'foo': _.constant('foo') });
   *
   * var lodash = _.runInContext();
   * lodash.mixin({ 'bar': lodash.constant('bar') });
   *
   * _.isFunction(_.foo);
   * // => true
   * _.isFunction(_.bar);
   * // => false
   *
   * lodash.isFunction(lodash.foo);
   * // => false
   * lodash.isFunction(lodash.bar);
   * // => true
   *
   * // Create a suped-up `defer` in Node.js.
   * var defer = _.runInContext({ 'setTimeout': setImmediate }).defer;
   */var runInContext=function runInContext(context){context=context==null?root:_.defaults(root.Object(),context,_.pick(root,contextProps));/** Built-in constructor references. */var Array=context.Array,Date=context.Date,Error=context.Error,Function=context.Function,Math=context.Math,Object=context.Object,RegExp=context.RegExp,String=context.String,TypeError=context.TypeError;/** Used for built-in method references. */var arrayProto=Array.prototype,funcProto=Function.prototype,objectProto=Object.prototype;/** Used to detect overreaching core-js shims. */var coreJsData=context['__core-js_shared__'];/** Used to resolve the decompiled source of functions. */var funcToString=funcProto.toString;/** Used to check objects for own properties. */var hasOwnProperty=objectProto.hasOwnProperty;/** Used to generate unique IDs. */var idCounter=0;/** Used to detect methods masquerading as native. */var maskSrcKey=function(){var uid=/[^.]+$/.exec(coreJsData&&coreJsData.keys&&coreJsData.keys.IE_PROTO||'');return uid?'Symbol(src)_1.'+uid:'';}();/**
     * Used to resolve the
     * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
     * of values.
     */var nativeObjectToString=objectProto.toString;/** Used to infer the `Object` constructor. */var objectCtorString=funcToString.call(Object);/** Used to restore the original `_` reference in `_.noConflict`. */var oldDash=root._;/** Used to detect if a method is native. */var reIsNative=RegExp('^'+funcToString.call(hasOwnProperty).replace(reRegExpChar,'\\$&').replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g,'$1.*?')+'$');/** Built-in value references. */var Buffer=moduleExports?context.Buffer:undefined,_Symbol=context.Symbol,Uint8Array=context.Uint8Array,allocUnsafe=Buffer?Buffer.allocUnsafe:undefined,getPrototype=overArg(Object.getPrototypeOf,Object),objectCreate=Object.create,propertyIsEnumerable=objectProto.propertyIsEnumerable,splice=arrayProto.splice,spreadableSymbol=_Symbol?_Symbol.isConcatSpreadable:undefined,symIterator=_Symbol?_Symbol.iterator:undefined,symToStringTag=_Symbol?_Symbol.toStringTag:undefined;var defineProperty=function(){try{var func=getNative(Object,'defineProperty');func({},'',{});return func;}catch(e){}}();/** Mocked built-ins. */var ctxClearTimeout=context.clearTimeout!==root.clearTimeout&&context.clearTimeout,ctxNow=Date&&Date.now!==root.Date.now&&Date.now,ctxSetTimeout=context.setTimeout!==root.setTimeout&&context.setTimeout;/* Built-in method references for those with the same name as other `lodash` methods. */var nativeCeil=Math.ceil,nativeFloor=Math.floor,nativeGetSymbols=Object.getOwnPropertySymbols,nativeIsBuffer=Buffer?Buffer.isBuffer:undefined,nativeIsFinite=context.isFinite,nativeJoin=arrayProto.join,nativeKeys=overArg(Object.keys,Object),nativeMax=Math.max,nativeMin=Math.min,nativeNow=Date.now,nativeParseInt=context.parseInt,nativeRandom=Math.random,nativeReverse=arrayProto.reverse;/* Built-in method references that are verified to be native. */var DataView=getNative(context,'DataView'),Map=getNative(context,'Map'),Promise=getNative(context,'Promise'),Set=getNative(context,'Set'),WeakMap=getNative(context,'WeakMap'),nativeCreate=getNative(Object,'create');/** Used to store function metadata. */var metaMap=WeakMap&&new WeakMap();/** Used to lookup unminified function names. */var realNames={};/** Used to detect maps, sets, and weakmaps. */var dataViewCtorString=toSource(DataView),mapCtorString=toSource(Map),promiseCtorString=toSource(Promise),setCtorString=toSource(Set),weakMapCtorString=toSource(WeakMap);/** Used to convert symbols to primitives and strings. */var symbolProto=_Symbol?_Symbol.prototype:undefined,symbolValueOf=symbolProto?symbolProto.valueOf:undefined,symbolToString=symbolProto?symbolProto.toString:undefined;/*------------------------------------------------------------------------*//**
     * Creates a `lodash` object which wraps `value` to enable implicit method
     * chain sequences. Methods that operate on and return arrays, collections,
     * and functions can be chained together. Methods that retrieve a single value
     * or may return a primitive value will automatically end the chain sequence
     * and return the unwrapped value. Otherwise, the value must be unwrapped
     * with `_#value`.
     *
     * Explicit chain sequences, which must be unwrapped with `_#value`, may be
     * enabled using `_.chain`.
     *
     * The execution of chained methods is lazy, that is, it's deferred until
     * `_#value` is implicitly or explicitly called.
     *
     * Lazy evaluation allows several methods to support shortcut fusion.
     * Shortcut fusion is an optimization to merge iteratee calls; this avoids
     * the creation of intermediate arrays and can greatly reduce the number of
     * iteratee executions. Sections of a chain sequence qualify for shortcut
     * fusion if the section is applied to an array and iteratees accept only
     * one argument. The heuristic for whether a section qualifies for shortcut
     * fusion is subject to change.
     *
     * Chaining is supported in custom builds as long as the `_#value` method is
     * directly or indirectly included in the build.
     *
     * In addition to lodash methods, wrappers have `Array` and `String` methods.
     *
     * The wrapper `Array` methods are:
     * `concat`, `join`, `pop`, `push`, `shift`, `sort`, `splice`, and `unshift`
     *
     * The wrapper `String` methods are:
     * `replace` and `split`
     *
     * The wrapper methods that support shortcut fusion are:
     * `at`, `compact`, `drop`, `dropRight`, `dropWhile`, `filter`, `find`,
     * `findLast`, `head`, `initial`, `last`, `map`, `reject`, `reverse`, `slice`,
     * `tail`, `take`, `takeRight`, `takeRightWhile`, `takeWhile`, and `toArray`
     *
     * The chainable wrapper methods are:
     * `after`, `ary`, `assign`, `assignIn`, `assignInWith`, `assignWith`, `at`,
     * `before`, `bind`, `bindAll`, `bindKey`, `castArray`, `chain`, `chunk`,
     * `commit`, `compact`, `concat`, `conforms`, `constant`, `countBy`, `create`,
     * `curry`, `debounce`, `defaults`, `defaultsDeep`, `defer`, `delay`,
     * `difference`, `differenceBy`, `differenceWith`, `drop`, `dropRight`,
     * `dropRightWhile`, `dropWhile`, `extend`, `extendWith`, `fill`, `filter`,
     * `flatMap`, `flatMapDeep`, `flatMapDepth`, `flatten`, `flattenDeep`,
     * `flattenDepth`, `flip`, `flow`, `flowRight`, `fromPairs`, `functions`,
     * `functionsIn`, `groupBy`, `initial`, `intersection`, `intersectionBy`,
     * `intersectionWith`, `invert`, `invertBy`, `invokeMap`, `iteratee`, `keyBy`,
     * `keys`, `keysIn`, `map`, `mapKeys`, `mapValues`, `matches`, `matchesProperty`,
     * `memoize`, `merge`, `mergeWith`, `method`, `methodOf`, `mixin`, `negate`,
     * `nthArg`, `omit`, `omitBy`, `once`, `orderBy`, `over`, `overArgs`,
     * `overEvery`, `overSome`, `partial`, `partialRight`, `partition`, `pick`,
     * `pickBy`, `plant`, `property`, `propertyOf`, `pull`, `pullAll`, `pullAllBy`,
     * `pullAllWith`, `pullAt`, `push`, `range`, `rangeRight`, `rearg`, `reject`,
     * `remove`, `rest`, `reverse`, `sampleSize`, `set`, `setWith`, `shuffle`,
     * `slice`, `sort`, `sortBy`, `splice`, `spread`, `tail`, `take`, `takeRight`,
     * `takeRightWhile`, `takeWhile`, `tap`, `throttle`, `thru`, `toArray`,
     * `toPairs`, `toPairsIn`, `toPath`, `toPlainObject`, `transform`, `unary`,
     * `union`, `unionBy`, `unionWith`, `uniq`, `uniqBy`, `uniqWith`, `unset`,
     * `unshift`, `unzip`, `unzipWith`, `update`, `updateWith`, `values`,
     * `valuesIn`, `without`, `wrap`, `xor`, `xorBy`, `xorWith`, `zip`,
     * `zipObject`, `zipObjectDeep`, and `zipWith`
     *
     * The wrapper methods that are **not** chainable by default are:
     * `add`, `attempt`, `camelCase`, `capitalize`, `ceil`, `clamp`, `clone`,
     * `cloneDeep`, `cloneDeepWith`, `cloneWith`, `conformsTo`, `deburr`,
     * `defaultTo`, `divide`, `each`, `eachRight`, `endsWith`, `eq`, `escape`,
     * `escapeRegExp`, `every`, `find`, `findIndex`, `findKey`, `findLast`,
     * `findLastIndex`, `findLastKey`, `first`, `floor`, `forEach`, `forEachRight`,
     * `forIn`, `forInRight`, `forOwn`, `forOwnRight`, `get`, `gt`, `gte`, `has`,
     * `hasIn`, `head`, `identity`, `includes`, `indexOf`, `inRange`, `invoke`,
     * `isArguments`, `isArray`, `isArrayBuffer`, `isArrayLike`, `isArrayLikeObject`,
     * `isBoolean`, `isBuffer`, `isDate`, `isElement`, `isEmpty`, `isEqual`,
     * `isEqualWith`, `isError`, `isFinite`, `isFunction`, `isInteger`, `isLength`,
     * `isMap`, `isMatch`, `isMatchWith`, `isNaN`, `isNative`, `isNil`, `isNull`,
     * `isNumber`, `isObject`, `isObjectLike`, `isPlainObject`, `isRegExp`,
     * `isSafeInteger`, `isSet`, `isString`, `isUndefined`, `isTypedArray`,
     * `isWeakMap`, `isWeakSet`, `join`, `kebabCase`, `last`, `lastIndexOf`,
     * `lowerCase`, `lowerFirst`, `lt`, `lte`, `max`, `maxBy`, `mean`, `meanBy`,
     * `min`, `minBy`, `multiply`, `noConflict`, `noop`, `now`, `nth`, `pad`,
     * `padEnd`, `padStart`, `parseInt`, `pop`, `random`, `reduce`, `reduceRight`,
     * `repeat`, `result`, `round`, `runInContext`, `sample`, `shift`, `size`,
     * `snakeCase`, `some`, `sortedIndex`, `sortedIndexBy`, `sortedLastIndex`,
     * `sortedLastIndexBy`, `startCase`, `startsWith`, `stubArray`, `stubFalse`,
     * `stubObject`, `stubString`, `stubTrue`, `subtract`, `sum`, `sumBy`,
     * `template`, `times`, `toFinite`, `toInteger`, `toJSON`, `toLength`,
     * `toLower`, `toNumber`, `toSafeInteger`, `toString`, `toUpper`, `trim`,
     * `trimEnd`, `trimStart`, `truncate`, `unescape`, `uniqueId`, `upperCase`,
     * `upperFirst`, `value`, and `words`
     *
     * @name _
     * @constructor
     * @category Seq
     * @param {*} value The value to wrap in a `lodash` instance.
     * @returns {Object} Returns the new `lodash` wrapper instance.
     * @example
     *
     * function square(n) {
     *   return n * n;
     * }
     *
     * var wrapped = _([1, 2, 3]);
     *
     * // Returns an unwrapped value.
     * wrapped.reduce(_.add);
     * // => 6
     *
     * // Returns a wrapped value.
     * var squares = wrapped.map(square);
     *
     * _.isArray(squares);
     * // => false
     *
     * _.isArray(squares.value());
     * // => true
     */function lodash(value){if(isObjectLike(value)&&!isArray(value)&&!(value instanceof LazyWrapper)){if(value instanceof LodashWrapper){return value;}if(hasOwnProperty.call(value,'__wrapped__')){return wrapperClone(value);}}return new LodashWrapper(value);}/**
     * The base implementation of `_.create` without support for assigning
     * properties to the created object.
     *
     * @private
     * @param {Object} proto The object to inherit from.
     * @returns {Object} Returns the new object.
     */var baseCreate=function(){function object(){}return function(proto){if(!isObject(proto)){return{};}if(objectCreate){return objectCreate(proto);}object.prototype=proto;var result=new object();object.prototype=undefined;return result;};}();/**
     * The function whose prototype chain sequence wrappers inherit from.
     *
     * @private
     */function baseLodash(){}// No operation performed.
/**
     * The base constructor for creating `lodash` wrapper objects.
     *
     * @private
     * @param {*} value The value to wrap.
     * @param {boolean} [chainAll] Enable explicit method chain sequences.
     */function LodashWrapper(value,chainAll){this.__wrapped__=value;this.__actions__=[];this.__chain__=!!chainAll;this.__index__=0;this.__values__=undefined;}/**
     * By default, the template delimiters used by lodash are like those in
     * embedded Ruby (ERB) as well as ES2015 template strings. Change the
     * following template settings to use alternative delimiters.
     *
     * @static
     * @memberOf _
     * @type {Object}
     */lodash.templateSettings={/**
       * Used to detect `data` property values to be HTML-escaped.
       *
       * @memberOf _.templateSettings
       * @type {RegExp}
       */'escape':reEscape,/**
       * Used to detect code to be evaluated.
       *
       * @memberOf _.templateSettings
       * @type {RegExp}
       */'evaluate':reEvaluate,/**
       * Used to detect `data` property values to inject.
       *
       * @memberOf _.templateSettings
       * @type {RegExp}
       */'interpolate':reInterpolate,/**
       * Used to reference the data object in the template text.
       *
       * @memberOf _.templateSettings
       * @type {string}
       */'variable':'',/**
       * Used to import variables into the compiled template.
       *
       * @memberOf _.templateSettings
       * @type {Object}
       */'imports':{/**
         * A reference to the `lodash` function.
         *
         * @memberOf _.templateSettings.imports
         * @type {Function}
         */'_':lodash}};// Ensure wrappers are instances of `baseLodash`.
lodash.prototype=baseLodash.prototype;lodash.prototype.constructor=lodash;LodashWrapper.prototype=baseCreate(baseLodash.prototype);LodashWrapper.prototype.constructor=LodashWrapper;/*------------------------------------------------------------------------*//**
     * Creates a lazy wrapper object which wraps `value` to enable lazy evaluation.
     *
     * @private
     * @constructor
     * @param {*} value The value to wrap.
     */function LazyWrapper(value){this.__wrapped__=value;this.__actions__=[];this.__dir__=1;this.__filtered__=false;this.__iteratees__=[];this.__takeCount__=MAX_ARRAY_LENGTH;this.__views__=[];}/**
     * Creates a clone of the lazy wrapper object.
     *
     * @private
     * @name clone
     * @memberOf LazyWrapper
     * @returns {Object} Returns the cloned `LazyWrapper` object.
     */function lazyClone(){var result=new LazyWrapper(this.__wrapped__);result.__actions__=copyArray(this.__actions__);result.__dir__=this.__dir__;result.__filtered__=this.__filtered__;result.__iteratees__=copyArray(this.__iteratees__);result.__takeCount__=this.__takeCount__;result.__views__=copyArray(this.__views__);return result;}/**
     * Reverses the direction of lazy iteration.
     *
     * @private
     * @name reverse
     * @memberOf LazyWrapper
     * @returns {Object} Returns the new reversed `LazyWrapper` object.
     */function lazyReverse(){if(this.__filtered__){var result=new LazyWrapper(this);result.__dir__=-1;result.__filtered__=true;}else{result=this.clone();result.__dir__*=-1;}return result;}/**
     * Extracts the unwrapped value from its lazy wrapper.
     *
     * @private
     * @name value
     * @memberOf LazyWrapper
     * @returns {*} Returns the unwrapped value.
     */function lazyValue(){var array=this.__wrapped__.value(),dir=this.__dir__,isArr=isArray(array),isRight=dir<0,arrLength=isArr?array.length:0,view=getView(0,arrLength,this.__views__),start=view.start,end=view.end,length=end-start,index=isRight?end:start-1,iteratees=this.__iteratees__,iterLength=iteratees.length,resIndex=0,takeCount=nativeMin(length,this.__takeCount__);if(!isArr||!isRight&&arrLength==length&&takeCount==length){return baseWrapperValue(array,this.__actions__);}var result=[];outer:while(length--&&resIndex<takeCount){index+=dir;var iterIndex=-1,value=array[index];while(++iterIndex<iterLength){var data=iteratees[iterIndex],iteratee=data.iteratee,type=data.type,computed=iteratee(value);if(type==LAZY_MAP_FLAG){value=computed;}else if(!computed){if(type==LAZY_FILTER_FLAG){continue outer;}else{break outer;}}}result[resIndex++]=value;}return result;}// Ensure `LazyWrapper` is an instance of `baseLodash`.
LazyWrapper.prototype=baseCreate(baseLodash.prototype);LazyWrapper.prototype.constructor=LazyWrapper;/*------------------------------------------------------------------------*//**
     * Creates a hash object.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */function Hash(entries){var index=-1,length=entries==null?0:entries.length;this.clear();while(++index<length){var entry=entries[index];this.set(entry[0],entry[1]);}}/**
     * Removes all key-value entries from the hash.
     *
     * @private
     * @name clear
     * @memberOf Hash
     */function hashClear(){this.__data__=nativeCreate?nativeCreate(null):{};this.size=0;}/**
     * Removes `key` and its value from the hash.
     *
     * @private
     * @name delete
     * @memberOf Hash
     * @param {Object} hash The hash to modify.
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */function hashDelete(key){var result=this.has(key)&&delete this.__data__[key];this.size-=result?1:0;return result;}/**
     * Gets the hash value for `key`.
     *
     * @private
     * @name get
     * @memberOf Hash
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */function hashGet(key){var data=this.__data__;if(nativeCreate){var result=data[key];return result===HASH_UNDEFINED?undefined:result;}return hasOwnProperty.call(data,key)?data[key]:undefined;}/**
     * Checks if a hash value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf Hash
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */function hashHas(key){var data=this.__data__;return nativeCreate?data[key]!==undefined:hasOwnProperty.call(data,key);}/**
     * Sets the hash `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf Hash
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the hash instance.
     */function hashSet(key,value){var data=this.__data__;this.size+=this.has(key)?0:1;data[key]=nativeCreate&&value===undefined?HASH_UNDEFINED:value;return this;}// Add methods to `Hash`.
Hash.prototype.clear=hashClear;Hash.prototype['delete']=hashDelete;Hash.prototype.get=hashGet;Hash.prototype.has=hashHas;Hash.prototype.set=hashSet;/*------------------------------------------------------------------------*//**
     * Creates an list cache object.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */function ListCache(entries){var index=-1,length=entries==null?0:entries.length;this.clear();while(++index<length){var entry=entries[index];this.set(entry[0],entry[1]);}}/**
     * Removes all key-value entries from the list cache.
     *
     * @private
     * @name clear
     * @memberOf ListCache
     */function listCacheClear(){this.__data__=[];this.size=0;}/**
     * Removes `key` and its value from the list cache.
     *
     * @private
     * @name delete
     * @memberOf ListCache
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */function listCacheDelete(key){var data=this.__data__,index=assocIndexOf(data,key);if(index<0){return false;}var lastIndex=data.length-1;if(index==lastIndex){data.pop();}else{splice.call(data,index,1);}--this.size;return true;}/**
     * Gets the list cache value for `key`.
     *
     * @private
     * @name get
     * @memberOf ListCache
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */function listCacheGet(key){var data=this.__data__,index=assocIndexOf(data,key);return index<0?undefined:data[index][1];}/**
     * Checks if a list cache value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf ListCache
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */function listCacheHas(key){return assocIndexOf(this.__data__,key)>-1;}/**
     * Sets the list cache `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf ListCache
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the list cache instance.
     */function listCacheSet(key,value){var data=this.__data__,index=assocIndexOf(data,key);if(index<0){++this.size;data.push([key,value]);}else{data[index][1]=value;}return this;}// Add methods to `ListCache`.
ListCache.prototype.clear=listCacheClear;ListCache.prototype['delete']=listCacheDelete;ListCache.prototype.get=listCacheGet;ListCache.prototype.has=listCacheHas;ListCache.prototype.set=listCacheSet;/*------------------------------------------------------------------------*//**
     * Creates a map cache object to store key-value pairs.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */function MapCache(entries){var index=-1,length=entries==null?0:entries.length;this.clear();while(++index<length){var entry=entries[index];this.set(entry[0],entry[1]);}}/**
     * Removes all key-value entries from the map.
     *
     * @private
     * @name clear
     * @memberOf MapCache
     */function mapCacheClear(){this.size=0;this.__data__={'hash':new Hash(),'map':new(Map||ListCache)(),'string':new Hash()};}/**
     * Removes `key` and its value from the map.
     *
     * @private
     * @name delete
     * @memberOf MapCache
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */function mapCacheDelete(key){var result=getMapData(this,key)['delete'](key);this.size-=result?1:0;return result;}/**
     * Gets the map value for `key`.
     *
     * @private
     * @name get
     * @memberOf MapCache
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */function mapCacheGet(key){return getMapData(this,key).get(key);}/**
     * Checks if a map value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf MapCache
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */function mapCacheHas(key){return getMapData(this,key).has(key);}/**
     * Sets the map `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf MapCache
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the map cache instance.
     */function mapCacheSet(key,value){var data=getMapData(this,key),size=data.size;data.set(key,value);this.size+=data.size==size?0:1;return this;}// Add methods to `MapCache`.
MapCache.prototype.clear=mapCacheClear;MapCache.prototype['delete']=mapCacheDelete;MapCache.prototype.get=mapCacheGet;MapCache.prototype.has=mapCacheHas;MapCache.prototype.set=mapCacheSet;/*------------------------------------------------------------------------*//**
     *
     * Creates an array cache object to store unique values.
     *
     * @private
     * @constructor
     * @param {Array} [values] The values to cache.
     */function SetCache(values){var index=-1,length=values==null?0:values.length;this.__data__=new MapCache();while(++index<length){this.add(values[index]);}}/**
     * Adds `value` to the array cache.
     *
     * @private
     * @name add
     * @memberOf SetCache
     * @alias push
     * @param {*} value The value to cache.
     * @returns {Object} Returns the cache instance.
     */function setCacheAdd(value){this.__data__.set(value,HASH_UNDEFINED);return this;}/**
     * Checks if `value` is in the array cache.
     *
     * @private
     * @name has
     * @memberOf SetCache
     * @param {*} value The value to search for.
     * @returns {number} Returns `true` if `value` is found, else `false`.
     */function setCacheHas(value){return this.__data__.has(value);}// Add methods to `SetCache`.
SetCache.prototype.add=SetCache.prototype.push=setCacheAdd;SetCache.prototype.has=setCacheHas;/*------------------------------------------------------------------------*//**
     * Creates a stack cache object to store key-value pairs.
     *
     * @private
     * @constructor
     * @param {Array} [entries] The key-value pairs to cache.
     */function Stack(entries){var data=this.__data__=new ListCache(entries);this.size=data.size;}/**
     * Removes all key-value entries from the stack.
     *
     * @private
     * @name clear
     * @memberOf Stack
     */function stackClear(){this.__data__=new ListCache();this.size=0;}/**
     * Removes `key` and its value from the stack.
     *
     * @private
     * @name delete
     * @memberOf Stack
     * @param {string} key The key of the value to remove.
     * @returns {boolean} Returns `true` if the entry was removed, else `false`.
     */function stackDelete(key){var data=this.__data__,result=data['delete'](key);this.size=data.size;return result;}/**
     * Gets the stack value for `key`.
     *
     * @private
     * @name get
     * @memberOf Stack
     * @param {string} key The key of the value to get.
     * @returns {*} Returns the entry value.
     */function stackGet(key){return this.__data__.get(key);}/**
     * Checks if a stack value for `key` exists.
     *
     * @private
     * @name has
     * @memberOf Stack
     * @param {string} key The key of the entry to check.
     * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
     */function stackHas(key){return this.__data__.has(key);}/**
     * Sets the stack `key` to `value`.
     *
     * @private
     * @name set
     * @memberOf Stack
     * @param {string} key The key of the value to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns the stack cache instance.
     */function stackSet(key,value){var data=this.__data__;if(data instanceof ListCache){var pairs=data.__data__;if(!Map||pairs.length<LARGE_ARRAY_SIZE-1){pairs.push([key,value]);this.size=++data.size;return this;}data=this.__data__=new MapCache(pairs);}data.set(key,value);this.size=data.size;return this;}// Add methods to `Stack`.
Stack.prototype.clear=stackClear;Stack.prototype['delete']=stackDelete;Stack.prototype.get=stackGet;Stack.prototype.has=stackHas;Stack.prototype.set=stackSet;/*------------------------------------------------------------------------*//**
     * Creates an array of the enumerable property names of the array-like `value`.
     *
     * @private
     * @param {*} value The value to query.
     * @param {boolean} inherited Specify returning inherited property names.
     * @returns {Array} Returns the array of property names.
     */function arrayLikeKeys(value,inherited){var isArr=isArray(value),isArg=!isArr&&isArguments(value),isBuff=!isArr&&!isArg&&isBuffer(value),isType=!isArr&&!isArg&&!isBuff&&isTypedArray(value),skipIndexes=isArr||isArg||isBuff||isType,result=skipIndexes?baseTimes(value.length,String):[],length=result.length;for(var key in value){if((inherited||hasOwnProperty.call(value,key))&&!(skipIndexes&&(// Safari 9 has enumerable `arguments.length` in strict mode.
key=='length'||// Node.js 0.10 has enumerable non-index properties on buffers.
isBuff&&(key=='offset'||key=='parent')||// PhantomJS 2 has enumerable non-index properties on typed arrays.
isType&&(key=='buffer'||key=='byteLength'||key=='byteOffset')||// Skip index properties.
isIndex(key,length)))){result.push(key);}}return result;}/**
     * A specialized version of `_.sample` for arrays.
     *
     * @private
     * @param {Array} array The array to sample.
     * @returns {*} Returns the random element.
     */function arraySample(array){var length=array.length;return length?array[baseRandom(0,length-1)]:undefined;}/**
     * A specialized version of `_.sampleSize` for arrays.
     *
     * @private
     * @param {Array} array The array to sample.
     * @param {number} n The number of elements to sample.
     * @returns {Array} Returns the random elements.
     */function arraySampleSize(array,n){return shuffleSelf(copyArray(array),baseClamp(n,0,array.length));}/**
     * A specialized version of `_.shuffle` for arrays.
     *
     * @private
     * @param {Array} array The array to shuffle.
     * @returns {Array} Returns the new shuffled array.
     */function arrayShuffle(array){return shuffleSelf(copyArray(array));}/**
     * This function is like `assignValue` except that it doesn't assign
     * `undefined` values.
     *
     * @private
     * @param {Object} object The object to modify.
     * @param {string} key The key of the property to assign.
     * @param {*} value The value to assign.
     */function assignMergeValue(object,key,value){if(value!==undefined&&!eq(object[key],value)||value===undefined&&!(key in object)){baseAssignValue(object,key,value);}}/**
     * Assigns `value` to `key` of `object` if the existing value is not equivalent
     * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * for equality comparisons.
     *
     * @private
     * @param {Object} object The object to modify.
     * @param {string} key The key of the property to assign.
     * @param {*} value The value to assign.
     */function assignValue(object,key,value){var objValue=object[key];if(!(hasOwnProperty.call(object,key)&&eq(objValue,value))||value===undefined&&!(key in object)){baseAssignValue(object,key,value);}}/**
     * Gets the index at which the `key` is found in `array` of key-value pairs.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {*} key The key to search for.
     * @returns {number} Returns the index of the matched value, else `-1`.
     */function assocIndexOf(array,key){var length=array.length;while(length--){if(eq(array[length][0],key)){return length;}}return-1;}/**
     * Aggregates elements of `collection` on `accumulator` with keys transformed
     * by `iteratee` and values set by `setter`.
     *
     * @private
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} setter The function to set `accumulator` values.
     * @param {Function} iteratee The iteratee to transform keys.
     * @param {Object} accumulator The initial aggregated object.
     * @returns {Function} Returns `accumulator`.
     */function baseAggregator(collection,setter,iteratee,accumulator){baseEach(collection,function(value,key,collection){setter(accumulator,value,iteratee(value),collection);});return accumulator;}/**
     * The base implementation of `_.assign` without support for multiple sources
     * or `customizer` functions.
     *
     * @private
     * @param {Object} object The destination object.
     * @param {Object} source The source object.
     * @returns {Object} Returns `object`.
     */function baseAssign(object,source){return object&&copyObject(source,keys(source),object);}/**
     * The base implementation of `_.assignIn` without support for multiple sources
     * or `customizer` functions.
     *
     * @private
     * @param {Object} object The destination object.
     * @param {Object} source The source object.
     * @returns {Object} Returns `object`.
     */function baseAssignIn(object,source){return object&&copyObject(source,keysIn(source),object);}/**
     * The base implementation of `assignValue` and `assignMergeValue` without
     * value checks.
     *
     * @private
     * @param {Object} object The object to modify.
     * @param {string} key The key of the property to assign.
     * @param {*} value The value to assign.
     */function baseAssignValue(object,key,value){if(key=='__proto__'&&defineProperty){defineProperty(object,key,{'configurable':true,'enumerable':true,'value':value,'writable':true});}else{object[key]=value;}}/**
     * The base implementation of `_.at` without support for individual paths.
     *
     * @private
     * @param {Object} object The object to iterate over.
     * @param {string[]} paths The property paths to pick.
     * @returns {Array} Returns the picked elements.
     */function baseAt(object,paths){var index=-1,length=paths.length,result=Array(length),skip=object==null;while(++index<length){result[index]=skip?undefined:get(object,paths[index]);}return result;}/**
     * The base implementation of `_.clamp` which doesn't coerce arguments.
     *
     * @private
     * @param {number} number The number to clamp.
     * @param {number} [lower] The lower bound.
     * @param {number} upper The upper bound.
     * @returns {number} Returns the clamped number.
     */function baseClamp(number,lower,upper){if(number===number){if(upper!==undefined){number=number<=upper?number:upper;}if(lower!==undefined){number=number>=lower?number:lower;}}return number;}/**
     * The base implementation of `_.clone` and `_.cloneDeep` which tracks
     * traversed objects.
     *
     * @private
     * @param {*} value The value to clone.
     * @param {boolean} bitmask The bitmask flags.
     *  1 - Deep clone
     *  2 - Flatten inherited properties
     *  4 - Clone symbols
     * @param {Function} [customizer] The function to customize cloning.
     * @param {string} [key] The key of `value`.
     * @param {Object} [object] The parent object of `value`.
     * @param {Object} [stack] Tracks traversed objects and their clone counterparts.
     * @returns {*} Returns the cloned value.
     */function baseClone(value,bitmask,customizer,key,object,stack){var result,isDeep=bitmask&CLONE_DEEP_FLAG,isFlat=bitmask&CLONE_FLAT_FLAG,isFull=bitmask&CLONE_SYMBOLS_FLAG;if(customizer){result=object?customizer(value,key,object,stack):customizer(value);}if(result!==undefined){return result;}if(!isObject(value)){return value;}var isArr=isArray(value);if(isArr){result=initCloneArray(value);if(!isDeep){return copyArray(value,result);}}else{var tag=getTag(value),isFunc=tag==funcTag||tag==genTag;if(isBuffer(value)){return cloneBuffer(value,isDeep);}if(tag==objectTag||tag==argsTag||isFunc&&!object){result=isFlat||isFunc?{}:initCloneObject(value);if(!isDeep){return isFlat?copySymbolsIn(value,baseAssignIn(result,value)):copySymbols(value,baseAssign(result,value));}}else{if(!cloneableTags[tag]){return object?value:{};}result=initCloneByTag(value,tag,baseClone,isDeep);}}// Check for circular references and return its corresponding clone.
stack||(stack=new Stack());var stacked=stack.get(value);if(stacked){return stacked;}stack.set(value,result);var keysFunc=isFull?isFlat?getAllKeysIn:getAllKeys:isFlat?keysIn:keys;var props=isArr?undefined:keysFunc(value);arrayEach(props||value,function(subValue,key){if(props){key=subValue;subValue=value[key];}// Recursively populate clone (susceptible to call stack limits).
assignValue(result,key,baseClone(subValue,bitmask,customizer,key,value,stack));});return result;}/**
     * The base implementation of `_.conforms` which doesn't clone `source`.
     *
     * @private
     * @param {Object} source The object of property predicates to conform to.
     * @returns {Function} Returns the new spec function.
     */function baseConforms(source){var props=keys(source);return function(object){return baseConformsTo(object,source,props);};}/**
     * The base implementation of `_.conformsTo` which accepts `props` to check.
     *
     * @private
     * @param {Object} object The object to inspect.
     * @param {Object} source The object of property predicates to conform to.
     * @returns {boolean} Returns `true` if `object` conforms, else `false`.
     */function baseConformsTo(object,source,props){var length=props.length;if(object==null){return!length;}object=Object(object);while(length--){var key=props[length],predicate=source[key],value=object[key];if(value===undefined&&!(key in object)||!predicate(value)){return false;}}return true;}/**
     * The base implementation of `_.delay` and `_.defer` which accepts `args`
     * to provide to `func`.
     *
     * @private
     * @param {Function} func The function to delay.
     * @param {number} wait The number of milliseconds to delay invocation.
     * @param {Array} args The arguments to provide to `func`.
     * @returns {number|Object} Returns the timer id or timeout object.
     */function baseDelay(func,wait,args){if(typeof func!='function'){throw new TypeError(FUNC_ERROR_TEXT);}return setTimeout(function(){func.apply(undefined,args);},wait);}/**
     * The base implementation of methods like `_.difference` without support
     * for excluding multiple arrays or iteratee shorthands.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {Array} values The values to exclude.
     * @param {Function} [iteratee] The iteratee invoked per element.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns the new array of filtered values.
     */function baseDifference(array,values,iteratee,comparator){var index=-1,includes=arrayIncludes,isCommon=true,length=array.length,result=[],valuesLength=values.length;if(!length){return result;}if(iteratee){values=arrayMap(values,baseUnary(iteratee));}if(comparator){includes=arrayIncludesWith;isCommon=false;}else if(values.length>=LARGE_ARRAY_SIZE){includes=cacheHas;isCommon=false;values=new SetCache(values);}outer:while(++index<length){var value=array[index],computed=iteratee==null?value:iteratee(value);value=comparator||value!==0?value:0;if(isCommon&&computed===computed){var valuesIndex=valuesLength;while(valuesIndex--){if(values[valuesIndex]===computed){continue outer;}}result.push(value);}else if(!includes(values,computed,comparator)){result.push(value);}}return result;}/**
     * The base implementation of `_.forEach` without support for iteratee shorthands.
     *
     * @private
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array|Object} Returns `collection`.
     */var baseEach=createBaseEach(baseForOwn);/**
     * The base implementation of `_.forEachRight` without support for iteratee shorthands.
     *
     * @private
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array|Object} Returns `collection`.
     */var baseEachRight=createBaseEach(baseForOwnRight,true);/**
     * The base implementation of `_.every` without support for iteratee shorthands.
     *
     * @private
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} predicate The function invoked per iteration.
     * @returns {boolean} Returns `true` if all elements pass the predicate check,
     *  else `false`
     */function baseEvery(collection,predicate){var result=true;baseEach(collection,function(value,index,collection){result=!!predicate(value,index,collection);return result;});return result;}/**
     * The base implementation of methods like `_.max` and `_.min` which accepts a
     * `comparator` to determine the extremum value.
     *
     * @private
     * @param {Array} array The array to iterate over.
     * @param {Function} iteratee The iteratee invoked per iteration.
     * @param {Function} comparator The comparator used to compare values.
     * @returns {*} Returns the extremum value.
     */function baseExtremum(array,iteratee,comparator){var index=-1,length=array.length;while(++index<length){var value=array[index],current=iteratee(value);if(current!=null&&(computed===undefined?current===current&&!isSymbol(current):comparator(current,computed))){var computed=current,result=value;}}return result;}/**
     * The base implementation of `_.fill` without an iteratee call guard.
     *
     * @private
     * @param {Array} array The array to fill.
     * @param {*} value The value to fill `array` with.
     * @param {number} [start=0] The start position.
     * @param {number} [end=array.length] The end position.
     * @returns {Array} Returns `array`.
     */function baseFill(array,value,start,end){var length=array.length;start=toInteger(start);if(start<0){start=-start>length?0:length+start;}end=end===undefined||end>length?length:toInteger(end);if(end<0){end+=length;}end=start>end?0:toLength(end);while(start<end){array[start++]=value;}return array;}/**
     * The base implementation of `_.filter` without support for iteratee shorthands.
     *
     * @private
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} predicate The function invoked per iteration.
     * @returns {Array} Returns the new filtered array.
     */function baseFilter(collection,predicate){var result=[];baseEach(collection,function(value,index,collection){if(predicate(value,index,collection)){result.push(value);}});return result;}/**
     * The base implementation of `_.flatten` with support for restricting flattening.
     *
     * @private
     * @param {Array} array The array to flatten.
     * @param {number} depth The maximum recursion depth.
     * @param {boolean} [predicate=isFlattenable] The function invoked per iteration.
     * @param {boolean} [isStrict] Restrict to values that pass `predicate` checks.
     * @param {Array} [result=[]] The initial result value.
     * @returns {Array} Returns the new flattened array.
     */function baseFlatten(array,depth,predicate,isStrict,result){var index=-1,length=array.length;predicate||(predicate=isFlattenable);result||(result=[]);while(++index<length){var value=array[index];if(depth>0&&predicate(value)){if(depth>1){// Recursively flatten arrays (susceptible to call stack limits).
baseFlatten(value,depth-1,predicate,isStrict,result);}else{arrayPush(result,value);}}else if(!isStrict){result[result.length]=value;}}return result;}/**
     * The base implementation of `baseForOwn` which iterates over `object`
     * properties returned by `keysFunc` and invokes `iteratee` for each property.
     * Iteratee functions may exit iteration early by explicitly returning `false`.
     *
     * @private
     * @param {Object} object The object to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @param {Function} keysFunc The function to get the keys of `object`.
     * @returns {Object} Returns `object`.
     */var baseFor=createBaseFor();/**
     * This function is like `baseFor` except that it iterates over properties
     * in the opposite order.
     *
     * @private
     * @param {Object} object The object to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @param {Function} keysFunc The function to get the keys of `object`.
     * @returns {Object} Returns `object`.
     */var baseForRight=createBaseFor(true);/**
     * The base implementation of `_.forOwn` without support for iteratee shorthands.
     *
     * @private
     * @param {Object} object The object to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Object} Returns `object`.
     */function baseForOwn(object,iteratee){return object&&baseFor(object,iteratee,keys);}/**
     * The base implementation of `_.forOwnRight` without support for iteratee shorthands.
     *
     * @private
     * @param {Object} object The object to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Object} Returns `object`.
     */function baseForOwnRight(object,iteratee){return object&&baseForRight(object,iteratee,keys);}/**
     * The base implementation of `_.functions` which creates an array of
     * `object` function property names filtered from `props`.
     *
     * @private
     * @param {Object} object The object to inspect.
     * @param {Array} props The property names to filter.
     * @returns {Array} Returns the function names.
     */function baseFunctions(object,props){return arrayFilter(props,function(key){return isFunction(object[key]);});}/**
     * The base implementation of `_.get` without support for default values.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the property to get.
     * @returns {*} Returns the resolved value.
     */function baseGet(object,path){path=castPath(path,object);var index=0,length=path.length;while(object!=null&&index<length){object=object[toKey(path[index++])];}return index&&index==length?object:undefined;}/**
     * The base implementation of `getAllKeys` and `getAllKeysIn` which uses
     * `keysFunc` and `symbolsFunc` to get the enumerable property names and
     * symbols of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Function} keysFunc The function to get the keys of `object`.
     * @param {Function} symbolsFunc The function to get the symbols of `object`.
     * @returns {Array} Returns the array of property names and symbols.
     */function baseGetAllKeys(object,keysFunc,symbolsFunc){var result=keysFunc(object);return isArray(object)?result:arrayPush(result,symbolsFunc(object));}/**
     * The base implementation of `getTag` without fallbacks for buggy environments.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the `toStringTag`.
     */function baseGetTag(value){if(value==null){return value===undefined?undefinedTag:nullTag;}return symToStringTag&&symToStringTag in Object(value)?getRawTag(value):objectToString(value);}/**
     * The base implementation of `_.gt` which doesn't coerce arguments.
     *
     * @private
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if `value` is greater than `other`,
     *  else `false`.
     */function baseGt(value,other){return value>other;}/**
     * The base implementation of `_.has` without support for deep paths.
     *
     * @private
     * @param {Object} [object] The object to query.
     * @param {Array|string} key The key to check.
     * @returns {boolean} Returns `true` if `key` exists, else `false`.
     */function baseHas(object,key){return object!=null&&hasOwnProperty.call(object,key);}/**
     * The base implementation of `_.hasIn` without support for deep paths.
     *
     * @private
     * @param {Object} [object] The object to query.
     * @param {Array|string} key The key to check.
     * @returns {boolean} Returns `true` if `key` exists, else `false`.
     */function baseHasIn(object,key){return object!=null&&key in Object(object);}/**
     * The base implementation of `_.inRange` which doesn't coerce arguments.
     *
     * @private
     * @param {number} number The number to check.
     * @param {number} start The start of the range.
     * @param {number} end The end of the range.
     * @returns {boolean} Returns `true` if `number` is in the range, else `false`.
     */function baseInRange(number,start,end){return number>=nativeMin(start,end)&&number<nativeMax(start,end);}/**
     * The base implementation of methods like `_.intersection`, without support
     * for iteratee shorthands, that accepts an array of arrays to inspect.
     *
     * @private
     * @param {Array} arrays The arrays to inspect.
     * @param {Function} [iteratee] The iteratee invoked per element.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns the new array of shared values.
     */function baseIntersection(arrays,iteratee,comparator){var includes=comparator?arrayIncludesWith:arrayIncludes,length=arrays[0].length,othLength=arrays.length,othIndex=othLength,caches=Array(othLength),maxLength=Infinity,result=[];while(othIndex--){var array=arrays[othIndex];if(othIndex&&iteratee){array=arrayMap(array,baseUnary(iteratee));}maxLength=nativeMin(array.length,maxLength);caches[othIndex]=!comparator&&(iteratee||length>=120&&array.length>=120)?new SetCache(othIndex&&array):undefined;}array=arrays[0];var index=-1,seen=caches[0];outer:while(++index<length&&result.length<maxLength){var value=array[index],computed=iteratee?iteratee(value):value;value=comparator||value!==0?value:0;if(!(seen?cacheHas(seen,computed):includes(result,computed,comparator))){othIndex=othLength;while(--othIndex){var cache=caches[othIndex];if(!(cache?cacheHas(cache,computed):includes(arrays[othIndex],computed,comparator))){continue outer;}}if(seen){seen.push(computed);}result.push(value);}}return result;}/**
     * The base implementation of `_.invert` and `_.invertBy` which inverts
     * `object` with values transformed by `iteratee` and set by `setter`.
     *
     * @private
     * @param {Object} object The object to iterate over.
     * @param {Function} setter The function to set `accumulator` values.
     * @param {Function} iteratee The iteratee to transform values.
     * @param {Object} accumulator The initial inverted object.
     * @returns {Function} Returns `accumulator`.
     */function baseInverter(object,setter,iteratee,accumulator){baseForOwn(object,function(value,key,object){setter(accumulator,iteratee(value),key,object);});return accumulator;}/**
     * The base implementation of `_.invoke` without support for individual
     * method arguments.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the method to invoke.
     * @param {Array} args The arguments to invoke the method with.
     * @returns {*} Returns the result of the invoked method.
     */function baseInvoke(object,path,args){path=castPath(path,object);object=parent(object,path);var func=object==null?object:object[toKey(last(path))];return func==null?undefined:apply(func,object,args);}/**
     * The base implementation of `_.isArguments`.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an `arguments` object,
     */function baseIsArguments(value){return isObjectLike(value)&&baseGetTag(value)==argsTag;}/**
     * The base implementation of `_.isArrayBuffer` without Node.js optimizations.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an array buffer, else `false`.
     */function baseIsArrayBuffer(value){return isObjectLike(value)&&baseGetTag(value)==arrayBufferTag;}/**
     * The base implementation of `_.isDate` without Node.js optimizations.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a date object, else `false`.
     */function baseIsDate(value){return isObjectLike(value)&&baseGetTag(value)==dateTag;}/**
     * The base implementation of `_.isEqual` which supports partial comparisons
     * and tracks traversed objects.
     *
     * @private
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @param {boolean} bitmask The bitmask flags.
     *  1 - Unordered comparison
     *  2 - Partial comparison
     * @param {Function} [customizer] The function to customize comparisons.
     * @param {Object} [stack] Tracks traversed `value` and `other` objects.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     */function baseIsEqual(value,other,bitmask,customizer,stack){if(value===other){return true;}if(value==null||other==null||!isObjectLike(value)&&!isObjectLike(other)){return value!==value&&other!==other;}return baseIsEqualDeep(value,other,bitmask,customizer,baseIsEqual,stack);}/**
     * A specialized version of `baseIsEqual` for arrays and objects which performs
     * deep comparisons and tracks traversed objects enabling objects with circular
     * references to be compared.
     *
     * @private
     * @param {Object} object The object to compare.
     * @param {Object} other The other object to compare.
     * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
     * @param {Function} customizer The function to customize comparisons.
     * @param {Function} equalFunc The function to determine equivalents of values.
     * @param {Object} [stack] Tracks traversed `object` and `other` objects.
     * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
     */function baseIsEqualDeep(object,other,bitmask,customizer,equalFunc,stack){var objIsArr=isArray(object),othIsArr=isArray(other),objTag=objIsArr?arrayTag:getTag(object),othTag=othIsArr?arrayTag:getTag(other);objTag=objTag==argsTag?objectTag:objTag;othTag=othTag==argsTag?objectTag:othTag;var objIsObj=objTag==objectTag,othIsObj=othTag==objectTag,isSameTag=objTag==othTag;if(isSameTag&&isBuffer(object)){if(!isBuffer(other)){return false;}objIsArr=true;objIsObj=false;}if(isSameTag&&!objIsObj){stack||(stack=new Stack());return objIsArr||isTypedArray(object)?equalArrays(object,other,bitmask,customizer,equalFunc,stack):equalByTag(object,other,objTag,bitmask,customizer,equalFunc,stack);}if(!(bitmask&COMPARE_PARTIAL_FLAG)){var objIsWrapped=objIsObj&&hasOwnProperty.call(object,'__wrapped__'),othIsWrapped=othIsObj&&hasOwnProperty.call(other,'__wrapped__');if(objIsWrapped||othIsWrapped){var objUnwrapped=objIsWrapped?object.value():object,othUnwrapped=othIsWrapped?other.value():other;stack||(stack=new Stack());return equalFunc(objUnwrapped,othUnwrapped,bitmask,customizer,stack);}}if(!isSameTag){return false;}stack||(stack=new Stack());return equalObjects(object,other,bitmask,customizer,equalFunc,stack);}/**
     * The base implementation of `_.isMap` without Node.js optimizations.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a map, else `false`.
     */function baseIsMap(value){return isObjectLike(value)&&getTag(value)==mapTag;}/**
     * The base implementation of `_.isMatch` without support for iteratee shorthands.
     *
     * @private
     * @param {Object} object The object to inspect.
     * @param {Object} source The object of property values to match.
     * @param {Array} matchData The property names, values, and compare flags to match.
     * @param {Function} [customizer] The function to customize comparisons.
     * @returns {boolean} Returns `true` if `object` is a match, else `false`.
     */function baseIsMatch(object,source,matchData,customizer){var index=matchData.length,length=index,noCustomizer=!customizer;if(object==null){return!length;}object=Object(object);while(index--){var data=matchData[index];if(noCustomizer&&data[2]?data[1]!==object[data[0]]:!(data[0]in object)){return false;}}while(++index<length){data=matchData[index];var key=data[0],objValue=object[key],srcValue=data[1];if(noCustomizer&&data[2]){if(objValue===undefined&&!(key in object)){return false;}}else{var stack=new Stack();if(customizer){var result=customizer(objValue,srcValue,key,object,source,stack);}if(!(result===undefined?baseIsEqual(srcValue,objValue,COMPARE_PARTIAL_FLAG|COMPARE_UNORDERED_FLAG,customizer,stack):result)){return false;}}}return true;}/**
     * The base implementation of `_.isNative` without bad shim checks.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a native function,
     *  else `false`.
     */function baseIsNative(value){if(!isObject(value)||isMasked(value)){return false;}var pattern=isFunction(value)?reIsNative:reIsHostCtor;return pattern.test(toSource(value));}/**
     * The base implementation of `_.isRegExp` without Node.js optimizations.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a regexp, else `false`.
     */function baseIsRegExp(value){return isObjectLike(value)&&baseGetTag(value)==regexpTag;}/**
     * The base implementation of `_.isSet` without Node.js optimizations.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a set, else `false`.
     */function baseIsSet(value){return isObjectLike(value)&&getTag(value)==setTag;}/**
     * The base implementation of `_.isTypedArray` without Node.js optimizations.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
     */function baseIsTypedArray(value){return isObjectLike(value)&&isLength(value.length)&&!!typedArrayTags[baseGetTag(value)];}/**
     * The base implementation of `_.iteratee`.
     *
     * @private
     * @param {*} [value=_.identity] The value to convert to an iteratee.
     * @returns {Function} Returns the iteratee.
     */function baseIteratee(value){// Don't store the `typeof` result in a variable to avoid a JIT bug in Safari 9.
// See https://bugs.webkit.org/show_bug.cgi?id=156034 for more details.
if(typeof value=='function'){return value;}if(value==null){return identity;}if((typeof value==='undefined'?'undefined':_typeof(value))=='object'){return isArray(value)?baseMatchesProperty(value[0],value[1]):baseMatches(value);}return property(value);}/**
     * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     */function baseKeys(object){if(!isPrototype(object)){return nativeKeys(object);}var result=[];for(var key in Object(object)){if(hasOwnProperty.call(object,key)&&key!='constructor'){result.push(key);}}return result;}/**
     * The base implementation of `_.keysIn` which doesn't treat sparse arrays as dense.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     */function baseKeysIn(object){if(!isObject(object)){return nativeKeysIn(object);}var isProto=isPrototype(object),result=[];for(var key in object){if(!(key=='constructor'&&(isProto||!hasOwnProperty.call(object,key)))){result.push(key);}}return result;}/**
     * The base implementation of `_.lt` which doesn't coerce arguments.
     *
     * @private
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if `value` is less than `other`,
     *  else `false`.
     */function baseLt(value,other){return value<other;}/**
     * The base implementation of `_.map` without support for iteratee shorthands.
     *
     * @private
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} iteratee The function invoked per iteration.
     * @returns {Array} Returns the new mapped array.
     */function baseMap(collection,iteratee){var index=-1,result=isArrayLike(collection)?Array(collection.length):[];baseEach(collection,function(value,key,collection){result[++index]=iteratee(value,key,collection);});return result;}/**
     * The base implementation of `_.matches` which doesn't clone `source`.
     *
     * @private
     * @param {Object} source The object of property values to match.
     * @returns {Function} Returns the new spec function.
     */function baseMatches(source){var matchData=getMatchData(source);if(matchData.length==1&&matchData[0][2]){return matchesStrictComparable(matchData[0][0],matchData[0][1]);}return function(object){return object===source||baseIsMatch(object,source,matchData);};}/**
     * The base implementation of `_.matchesProperty` which doesn't clone `srcValue`.
     *
     * @private
     * @param {string} path The path of the property to get.
     * @param {*} srcValue The value to match.
     * @returns {Function} Returns the new spec function.
     */function baseMatchesProperty(path,srcValue){if(isKey(path)&&isStrictComparable(srcValue)){return matchesStrictComparable(toKey(path),srcValue);}return function(object){var objValue=get(object,path);return objValue===undefined&&objValue===srcValue?hasIn(object,path):baseIsEqual(srcValue,objValue,COMPARE_PARTIAL_FLAG|COMPARE_UNORDERED_FLAG);};}/**
     * The base implementation of `_.merge` without support for multiple sources.
     *
     * @private
     * @param {Object} object The destination object.
     * @param {Object} source The source object.
     * @param {number} srcIndex The index of `source`.
     * @param {Function} [customizer] The function to customize merged values.
     * @param {Object} [stack] Tracks traversed source values and their merged
     *  counterparts.
     */function baseMerge(object,source,srcIndex,customizer,stack){if(object===source){return;}baseFor(source,function(srcValue,key){if(isObject(srcValue)){stack||(stack=new Stack());baseMergeDeep(object,source,key,srcIndex,baseMerge,customizer,stack);}else{var newValue=customizer?customizer(object[key],srcValue,key+'',object,source,stack):undefined;if(newValue===undefined){newValue=srcValue;}assignMergeValue(object,key,newValue);}},keysIn);}/**
     * A specialized version of `baseMerge` for arrays and objects which performs
     * deep merges and tracks traversed objects enabling objects with circular
     * references to be merged.
     *
     * @private
     * @param {Object} object The destination object.
     * @param {Object} source The source object.
     * @param {string} key The key of the value to merge.
     * @param {number} srcIndex The index of `source`.
     * @param {Function} mergeFunc The function to merge values.
     * @param {Function} [customizer] The function to customize assigned values.
     * @param {Object} [stack] Tracks traversed source values and their merged
     *  counterparts.
     */function baseMergeDeep(object,source,key,srcIndex,mergeFunc,customizer,stack){var objValue=object[key],srcValue=source[key],stacked=stack.get(srcValue);if(stacked){assignMergeValue(object,key,stacked);return;}var newValue=customizer?customizer(objValue,srcValue,key+'',object,source,stack):undefined;var isCommon=newValue===undefined;if(isCommon){var isArr=isArray(srcValue),isBuff=!isArr&&isBuffer(srcValue),isTyped=!isArr&&!isBuff&&isTypedArray(srcValue);newValue=srcValue;if(isArr||isBuff||isTyped){if(isArray(objValue)){newValue=objValue;}else if(isArrayLikeObject(objValue)){newValue=copyArray(objValue);}else if(isBuff){isCommon=false;newValue=cloneBuffer(srcValue,true);}else if(isTyped){isCommon=false;newValue=cloneTypedArray(srcValue,true);}else{newValue=[];}}else if(isPlainObject(srcValue)||isArguments(srcValue)){newValue=objValue;if(isArguments(objValue)){newValue=toPlainObject(objValue);}else if(!isObject(objValue)||srcIndex&&isFunction(objValue)){newValue=initCloneObject(srcValue);}}else{isCommon=false;}}if(isCommon){// Recursively merge objects and arrays (susceptible to call stack limits).
stack.set(srcValue,newValue);mergeFunc(newValue,srcValue,srcIndex,customizer,stack);stack['delete'](srcValue);}assignMergeValue(object,key,newValue);}/**
     * The base implementation of `_.nth` which doesn't coerce arguments.
     *
     * @private
     * @param {Array} array The array to query.
     * @param {number} n The index of the element to return.
     * @returns {*} Returns the nth element of `array`.
     */function baseNth(array,n){var length=array.length;if(!length){return;}n+=n<0?length:0;return isIndex(n,length)?array[n]:undefined;}/**
     * The base implementation of `_.orderBy` without param guards.
     *
     * @private
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function[]|Object[]|string[]} iteratees The iteratees to sort by.
     * @param {string[]} orders The sort orders of `iteratees`.
     * @returns {Array} Returns the new sorted array.
     */function baseOrderBy(collection,iteratees,orders){var index=-1;iteratees=arrayMap(iteratees.length?iteratees:[identity],baseUnary(getIteratee()));var result=baseMap(collection,function(value,key,collection){var criteria=arrayMap(iteratees,function(iteratee){return iteratee(value);});return{'criteria':criteria,'index':++index,'value':value};});return baseSortBy(result,function(object,other){return compareMultiple(object,other,orders);});}/**
     * The base implementation of `_.pick` without support for individual
     * property identifiers.
     *
     * @private
     * @param {Object} object The source object.
     * @param {string[]} paths The property paths to pick.
     * @returns {Object} Returns the new object.
     */function basePick(object,paths){return basePickBy(object,paths,function(value,path){return hasIn(object,path);});}/**
     * The base implementation of  `_.pickBy` without support for iteratee shorthands.
     *
     * @private
     * @param {Object} object The source object.
     * @param {string[]} paths The property paths to pick.
     * @param {Function} predicate The function invoked per property.
     * @returns {Object} Returns the new object.
     */function basePickBy(object,paths,predicate){var index=-1,length=paths.length,result={};while(++index<length){var path=paths[index],value=baseGet(object,path);if(predicate(value,path)){baseSet(result,castPath(path,object),value);}}return result;}/**
     * A specialized version of `baseProperty` which supports deep paths.
     *
     * @private
     * @param {Array|string} path The path of the property to get.
     * @returns {Function} Returns the new accessor function.
     */function basePropertyDeep(path){return function(object){return baseGet(object,path);};}/**
     * The base implementation of `_.pullAllBy` without support for iteratee
     * shorthands.
     *
     * @private
     * @param {Array} array The array to modify.
     * @param {Array} values The values to remove.
     * @param {Function} [iteratee] The iteratee invoked per element.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns `array`.
     */function basePullAll(array,values,iteratee,comparator){var indexOf=comparator?baseIndexOfWith:baseIndexOf,index=-1,length=values.length,seen=array;if(array===values){values=copyArray(values);}if(iteratee){seen=arrayMap(array,baseUnary(iteratee));}while(++index<length){var fromIndex=0,value=values[index],computed=iteratee?iteratee(value):value;while((fromIndex=indexOf(seen,computed,fromIndex,comparator))>-1){if(seen!==array){splice.call(seen,fromIndex,1);}splice.call(array,fromIndex,1);}}return array;}/**
     * The base implementation of `_.pullAt` without support for individual
     * indexes or capturing the removed elements.
     *
     * @private
     * @param {Array} array The array to modify.
     * @param {number[]} indexes The indexes of elements to remove.
     * @returns {Array} Returns `array`.
     */function basePullAt(array,indexes){var length=array?indexes.length:0,lastIndex=length-1;while(length--){var index=indexes[length];if(length==lastIndex||index!==previous){var previous=index;if(isIndex(index)){splice.call(array,index,1);}else{baseUnset(array,index);}}}return array;}/**
     * The base implementation of `_.random` without support for returning
     * floating-point numbers.
     *
     * @private
     * @param {number} lower The lower bound.
     * @param {number} upper The upper bound.
     * @returns {number} Returns the random number.
     */function baseRandom(lower,upper){return lower+nativeFloor(nativeRandom()*(upper-lower+1));}/**
     * The base implementation of `_.range` and `_.rangeRight` which doesn't
     * coerce arguments.
     *
     * @private
     * @param {number} start The start of the range.
     * @param {number} end The end of the range.
     * @param {number} step The value to increment or decrement by.
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Array} Returns the range of numbers.
     */function baseRange(start,end,step,fromRight){var index=-1,length=nativeMax(nativeCeil((end-start)/(step||1)),0),result=Array(length);while(length--){result[fromRight?length:++index]=start;start+=step;}return result;}/**
     * The base implementation of `_.repeat` which doesn't coerce arguments.
     *
     * @private
     * @param {string} string The string to repeat.
     * @param {number} n The number of times to repeat the string.
     * @returns {string} Returns the repeated string.
     */function baseRepeat(string,n){var result='';if(!string||n<1||n>MAX_SAFE_INTEGER){return result;}// Leverage the exponentiation by squaring algorithm for a faster repeat.
// See https://en.wikipedia.org/wiki/Exponentiation_by_squaring for more details.
do{if(n%2){result+=string;}n=nativeFloor(n/2);if(n){string+=string;}}while(n);return result;}/**
     * The base implementation of `_.rest` which doesn't validate or coerce arguments.
     *
     * @private
     * @param {Function} func The function to apply a rest parameter to.
     * @param {number} [start=func.length-1] The start position of the rest parameter.
     * @returns {Function} Returns the new function.
     */function baseRest(func,start){return setToString(overRest(func,start,identity),func+'');}/**
     * The base implementation of `_.sample`.
     *
     * @private
     * @param {Array|Object} collection The collection to sample.
     * @returns {*} Returns the random element.
     */function baseSample(collection){return arraySample(values(collection));}/**
     * The base implementation of `_.sampleSize` without param guards.
     *
     * @private
     * @param {Array|Object} collection The collection to sample.
     * @param {number} n The number of elements to sample.
     * @returns {Array} Returns the random elements.
     */function baseSampleSize(collection,n){var array=values(collection);return shuffleSelf(array,baseClamp(n,0,array.length));}/**
     * The base implementation of `_.set`.
     *
     * @private
     * @param {Object} object The object to modify.
     * @param {Array|string} path The path of the property to set.
     * @param {*} value The value to set.
     * @param {Function} [customizer] The function to customize path creation.
     * @returns {Object} Returns `object`.
     */function baseSet(object,path,value,customizer){if(!isObject(object)){return object;}path=castPath(path,object);var index=-1,length=path.length,lastIndex=length-1,nested=object;while(nested!=null&&++index<length){var key=toKey(path[index]),newValue=value;if(index!=lastIndex){var objValue=nested[key];newValue=customizer?customizer(objValue,key,nested):undefined;if(newValue===undefined){newValue=isObject(objValue)?objValue:isIndex(path[index+1])?[]:{};}}assignValue(nested,key,newValue);nested=nested[key];}return object;}/**
     * The base implementation of `setData` without support for hot loop shorting.
     *
     * @private
     * @param {Function} func The function to associate metadata with.
     * @param {*} data The metadata.
     * @returns {Function} Returns `func`.
     */var baseSetData=!metaMap?identity:function(func,data){metaMap.set(func,data);return func;};/**
     * The base implementation of `setToString` without support for hot loop shorting.
     *
     * @private
     * @param {Function} func The function to modify.
     * @param {Function} string The `toString` result.
     * @returns {Function} Returns `func`.
     */var baseSetToString=!defineProperty?identity:function(func,string){return defineProperty(func,'toString',{'configurable':true,'enumerable':false,'value':constant(string),'writable':true});};/**
     * The base implementation of `_.shuffle`.
     *
     * @private
     * @param {Array|Object} collection The collection to shuffle.
     * @returns {Array} Returns the new shuffled array.
     */function baseShuffle(collection){return shuffleSelf(values(collection));}/**
     * The base implementation of `_.slice` without an iteratee call guard.
     *
     * @private
     * @param {Array} array The array to slice.
     * @param {number} [start=0] The start position.
     * @param {number} [end=array.length] The end position.
     * @returns {Array} Returns the slice of `array`.
     */function baseSlice(array,start,end){var index=-1,length=array.length;if(start<0){start=-start>length?0:length+start;}end=end>length?length:end;if(end<0){end+=length;}length=start>end?0:end-start>>>0;start>>>=0;var result=Array(length);while(++index<length){result[index]=array[index+start];}return result;}/**
     * The base implementation of `_.some` without support for iteratee shorthands.
     *
     * @private
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} predicate The function invoked per iteration.
     * @returns {boolean} Returns `true` if any element passes the predicate check,
     *  else `false`.
     */function baseSome(collection,predicate){var result;baseEach(collection,function(value,index,collection){result=predicate(value,index,collection);return!result;});return!!result;}/**
     * The base implementation of `_.sortedIndex` and `_.sortedLastIndex` which
     * performs a binary search of `array` to determine the index at which `value`
     * should be inserted into `array` in order to maintain its sort order.
     *
     * @private
     * @param {Array} array The sorted array to inspect.
     * @param {*} value The value to evaluate.
     * @param {boolean} [retHighest] Specify returning the highest qualified index.
     * @returns {number} Returns the index at which `value` should be inserted
     *  into `array`.
     */function baseSortedIndex(array,value,retHighest){var low=0,high=array==null?low:array.length;if(typeof value=='number'&&value===value&&high<=HALF_MAX_ARRAY_LENGTH){while(low<high){var mid=low+high>>>1,computed=array[mid];if(computed!==null&&!isSymbol(computed)&&(retHighest?computed<=value:computed<value)){low=mid+1;}else{high=mid;}}return high;}return baseSortedIndexBy(array,value,identity,retHighest);}/**
     * The base implementation of `_.sortedIndexBy` and `_.sortedLastIndexBy`
     * which invokes `iteratee` for `value` and each element of `array` to compute
     * their sort ranking. The iteratee is invoked with one argument; (value).
     *
     * @private
     * @param {Array} array The sorted array to inspect.
     * @param {*} value The value to evaluate.
     * @param {Function} iteratee The iteratee invoked per element.
     * @param {boolean} [retHighest] Specify returning the highest qualified index.
     * @returns {number} Returns the index at which `value` should be inserted
     *  into `array`.
     */function baseSortedIndexBy(array,value,iteratee,retHighest){value=iteratee(value);var low=0,high=array==null?0:array.length,valIsNaN=value!==value,valIsNull=value===null,valIsSymbol=isSymbol(value),valIsUndefined=value===undefined;while(low<high){var mid=nativeFloor((low+high)/2),computed=iteratee(array[mid]),othIsDefined=computed!==undefined,othIsNull=computed===null,othIsReflexive=computed===computed,othIsSymbol=isSymbol(computed);if(valIsNaN){var setLow=retHighest||othIsReflexive;}else if(valIsUndefined){setLow=othIsReflexive&&(retHighest||othIsDefined);}else if(valIsNull){setLow=othIsReflexive&&othIsDefined&&(retHighest||!othIsNull);}else if(valIsSymbol){setLow=othIsReflexive&&othIsDefined&&!othIsNull&&(retHighest||!othIsSymbol);}else if(othIsNull||othIsSymbol){setLow=false;}else{setLow=retHighest?computed<=value:computed<value;}if(setLow){low=mid+1;}else{high=mid;}}return nativeMin(high,MAX_ARRAY_INDEX);}/**
     * The base implementation of `_.sortedUniq` and `_.sortedUniqBy` without
     * support for iteratee shorthands.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {Function} [iteratee] The iteratee invoked per element.
     * @returns {Array} Returns the new duplicate free array.
     */function baseSortedUniq(array,iteratee){var index=-1,length=array.length,resIndex=0,result=[];while(++index<length){var value=array[index],computed=iteratee?iteratee(value):value;if(!index||!eq(computed,seen)){var seen=computed;result[resIndex++]=value===0?0:value;}}return result;}/**
     * The base implementation of `_.toNumber` which doesn't ensure correct
     * conversions of binary, hexadecimal, or octal string values.
     *
     * @private
     * @param {*} value The value to process.
     * @returns {number} Returns the number.
     */function baseToNumber(value){if(typeof value=='number'){return value;}if(isSymbol(value)){return NAN;}return+value;}/**
     * The base implementation of `_.toString` which doesn't convert nullish
     * values to empty strings.
     *
     * @private
     * @param {*} value The value to process.
     * @returns {string} Returns the string.
     */function baseToString(value){// Exit early for strings to avoid a performance hit in some environments.
if(typeof value=='string'){return value;}if(isArray(value)){// Recursively convert values (susceptible to call stack limits).
return arrayMap(value,baseToString)+'';}if(isSymbol(value)){return symbolToString?symbolToString.call(value):'';}var result=value+'';return result=='0'&&1/value==-INFINITY?'-0':result;}/**
     * The base implementation of `_.uniqBy` without support for iteratee shorthands.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {Function} [iteratee] The iteratee invoked per element.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns the new duplicate free array.
     */function baseUniq(array,iteratee,comparator){var index=-1,includes=arrayIncludes,length=array.length,isCommon=true,result=[],seen=result;if(comparator){isCommon=false;includes=arrayIncludesWith;}else if(length>=LARGE_ARRAY_SIZE){var set=iteratee?null:createSet(array);if(set){return setToArray(set);}isCommon=false;includes=cacheHas;seen=new SetCache();}else{seen=iteratee?[]:result;}outer:while(++index<length){var value=array[index],computed=iteratee?iteratee(value):value;value=comparator||value!==0?value:0;if(isCommon&&computed===computed){var seenIndex=seen.length;while(seenIndex--){if(seen[seenIndex]===computed){continue outer;}}if(iteratee){seen.push(computed);}result.push(value);}else if(!includes(seen,computed,comparator)){if(seen!==result){seen.push(computed);}result.push(value);}}return result;}/**
     * The base implementation of `_.unset`.
     *
     * @private
     * @param {Object} object The object to modify.
     * @param {Array|string} path The property path to unset.
     * @returns {boolean} Returns `true` if the property is deleted, else `false`.
     */function baseUnset(object,path){path=castPath(path,object);object=parent(object,path);return object==null||delete object[toKey(last(path))];}/**
     * The base implementation of `_.update`.
     *
     * @private
     * @param {Object} object The object to modify.
     * @param {Array|string} path The path of the property to update.
     * @param {Function} updater The function to produce the updated value.
     * @param {Function} [customizer] The function to customize path creation.
     * @returns {Object} Returns `object`.
     */function baseUpdate(object,path,updater,customizer){return baseSet(object,path,updater(baseGet(object,path)),customizer);}/**
     * The base implementation of methods like `_.dropWhile` and `_.takeWhile`
     * without support for iteratee shorthands.
     *
     * @private
     * @param {Array} array The array to query.
     * @param {Function} predicate The function invoked per iteration.
     * @param {boolean} [isDrop] Specify dropping elements instead of taking them.
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Array} Returns the slice of `array`.
     */function baseWhile(array,predicate,isDrop,fromRight){var length=array.length,index=fromRight?length:-1;while((fromRight?index--:++index<length)&&predicate(array[index],index,array)){}return isDrop?baseSlice(array,fromRight?0:index,fromRight?index+1:length):baseSlice(array,fromRight?index+1:0,fromRight?length:index);}/**
     * The base implementation of `wrapperValue` which returns the result of
     * performing a sequence of actions on the unwrapped `value`, where each
     * successive action is supplied the return value of the previous.
     *
     * @private
     * @param {*} value The unwrapped value.
     * @param {Array} actions Actions to perform to resolve the unwrapped value.
     * @returns {*} Returns the resolved value.
     */function baseWrapperValue(value,actions){var result=value;if(result instanceof LazyWrapper){result=result.value();}return arrayReduce(actions,function(result,action){return action.func.apply(action.thisArg,arrayPush([result],action.args));},result);}/**
     * The base implementation of methods like `_.xor`, without support for
     * iteratee shorthands, that accepts an array of arrays to inspect.
     *
     * @private
     * @param {Array} arrays The arrays to inspect.
     * @param {Function} [iteratee] The iteratee invoked per element.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns the new array of values.
     */function baseXor(arrays,iteratee,comparator){var length=arrays.length;if(length<2){return length?baseUniq(arrays[0]):[];}var index=-1,result=Array(length);while(++index<length){var array=arrays[index],othIndex=-1;while(++othIndex<length){if(othIndex!=index){result[index]=baseDifference(result[index]||array,arrays[othIndex],iteratee,comparator);}}}return baseUniq(baseFlatten(result,1),iteratee,comparator);}/**
     * This base implementation of `_.zipObject` which assigns values using `assignFunc`.
     *
     * @private
     * @param {Array} props The property identifiers.
     * @param {Array} values The property values.
     * @param {Function} assignFunc The function to assign values.
     * @returns {Object} Returns the new object.
     */function baseZipObject(props,values,assignFunc){var index=-1,length=props.length,valsLength=values.length,result={};while(++index<length){var value=index<valsLength?values[index]:undefined;assignFunc(result,props[index],value);}return result;}/**
     * Casts `value` to an empty array if it's not an array like object.
     *
     * @private
     * @param {*} value The value to inspect.
     * @returns {Array|Object} Returns the cast array-like object.
     */function castArrayLikeObject(value){return isArrayLikeObject(value)?value:[];}/**
     * Casts `value` to `identity` if it's not a function.
     *
     * @private
     * @param {*} value The value to inspect.
     * @returns {Function} Returns cast function.
     */function castFunction(value){return typeof value=='function'?value:identity;}/**
     * Casts `value` to a path array if it's not one.
     *
     * @private
     * @param {*} value The value to inspect.
     * @param {Object} [object] The object to query keys on.
     * @returns {Array} Returns the cast property path array.
     */function castPath(value,object){if(isArray(value)){return value;}return isKey(value,object)?[value]:stringToPath(toString(value));}/**
     * A `baseRest` alias which can be replaced with `identity` by module
     * replacement plugins.
     *
     * @private
     * @type {Function}
     * @param {Function} func The function to apply a rest parameter to.
     * @returns {Function} Returns the new function.
     */var castRest=baseRest;/**
     * Casts `array` to a slice if it's needed.
     *
     * @private
     * @param {Array} array The array to inspect.
     * @param {number} start The start position.
     * @param {number} [end=array.length] The end position.
     * @returns {Array} Returns the cast slice.
     */function castSlice(array,start,end){var length=array.length;end=end===undefined?length:end;return!start&&end>=length?array:baseSlice(array,start,end);}/**
     * A simple wrapper around the global [`clearTimeout`](https://mdn.io/clearTimeout).
     *
     * @private
     * @param {number|Object} id The timer id or timeout object of the timer to clear.
     */var clearTimeout=ctxClearTimeout||function(id){return root.clearTimeout(id);};/**
     * Creates a clone of  `buffer`.
     *
     * @private
     * @param {Buffer} buffer The buffer to clone.
     * @param {boolean} [isDeep] Specify a deep clone.
     * @returns {Buffer} Returns the cloned buffer.
     */function cloneBuffer(buffer,isDeep){if(isDeep){return buffer.slice();}var length=buffer.length,result=allocUnsafe?allocUnsafe(length):new buffer.constructor(length);buffer.copy(result);return result;}/**
     * Creates a clone of `arrayBuffer`.
     *
     * @private
     * @param {ArrayBuffer} arrayBuffer The array buffer to clone.
     * @returns {ArrayBuffer} Returns the cloned array buffer.
     */function cloneArrayBuffer(arrayBuffer){var result=new arrayBuffer.constructor(arrayBuffer.byteLength);new Uint8Array(result).set(new Uint8Array(arrayBuffer));return result;}/**
     * Creates a clone of `dataView`.
     *
     * @private
     * @param {Object} dataView The data view to clone.
     * @param {boolean} [isDeep] Specify a deep clone.
     * @returns {Object} Returns the cloned data view.
     */function cloneDataView(dataView,isDeep){var buffer=isDeep?cloneArrayBuffer(dataView.buffer):dataView.buffer;return new dataView.constructor(buffer,dataView.byteOffset,dataView.byteLength);}/**
     * Creates a clone of `map`.
     *
     * @private
     * @param {Object} map The map to clone.
     * @param {Function} cloneFunc The function to clone values.
     * @param {boolean} [isDeep] Specify a deep clone.
     * @returns {Object} Returns the cloned map.
     */function cloneMap(map,isDeep,cloneFunc){var array=isDeep?cloneFunc(mapToArray(map),CLONE_DEEP_FLAG):mapToArray(map);return arrayReduce(array,addMapEntry,new map.constructor());}/**
     * Creates a clone of `regexp`.
     *
     * @private
     * @param {Object} regexp The regexp to clone.
     * @returns {Object} Returns the cloned regexp.
     */function cloneRegExp(regexp){var result=new regexp.constructor(regexp.source,reFlags.exec(regexp));result.lastIndex=regexp.lastIndex;return result;}/**
     * Creates a clone of `set`.
     *
     * @private
     * @param {Object} set The set to clone.
     * @param {Function} cloneFunc The function to clone values.
     * @param {boolean} [isDeep] Specify a deep clone.
     * @returns {Object} Returns the cloned set.
     */function cloneSet(set,isDeep,cloneFunc){var array=isDeep?cloneFunc(setToArray(set),CLONE_DEEP_FLAG):setToArray(set);return arrayReduce(array,addSetEntry,new set.constructor());}/**
     * Creates a clone of the `symbol` object.
     *
     * @private
     * @param {Object} symbol The symbol object to clone.
     * @returns {Object} Returns the cloned symbol object.
     */function cloneSymbol(symbol){return symbolValueOf?Object(symbolValueOf.call(symbol)):{};}/**
     * Creates a clone of `typedArray`.
     *
     * @private
     * @param {Object} typedArray The typed array to clone.
     * @param {boolean} [isDeep] Specify a deep clone.
     * @returns {Object} Returns the cloned typed array.
     */function cloneTypedArray(typedArray,isDeep){var buffer=isDeep?cloneArrayBuffer(typedArray.buffer):typedArray.buffer;return new typedArray.constructor(buffer,typedArray.byteOffset,typedArray.length);}/**
     * Compares values to sort them in ascending order.
     *
     * @private
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {number} Returns the sort order indicator for `value`.
     */function compareAscending(value,other){if(value!==other){var valIsDefined=value!==undefined,valIsNull=value===null,valIsReflexive=value===value,valIsSymbol=isSymbol(value);var othIsDefined=other!==undefined,othIsNull=other===null,othIsReflexive=other===other,othIsSymbol=isSymbol(other);if(!othIsNull&&!othIsSymbol&&!valIsSymbol&&value>other||valIsSymbol&&othIsDefined&&othIsReflexive&&!othIsNull&&!othIsSymbol||valIsNull&&othIsDefined&&othIsReflexive||!valIsDefined&&othIsReflexive||!valIsReflexive){return 1;}if(!valIsNull&&!valIsSymbol&&!othIsSymbol&&value<other||othIsSymbol&&valIsDefined&&valIsReflexive&&!valIsNull&&!valIsSymbol||othIsNull&&valIsDefined&&valIsReflexive||!othIsDefined&&valIsReflexive||!othIsReflexive){return-1;}}return 0;}/**
     * Used by `_.orderBy` to compare multiple properties of a value to another
     * and stable sort them.
     *
     * If `orders` is unspecified, all values are sorted in ascending order. Otherwise,
     * specify an order of "desc" for descending or "asc" for ascending sort order
     * of corresponding values.
     *
     * @private
     * @param {Object} object The object to compare.
     * @param {Object} other The other object to compare.
     * @param {boolean[]|string[]} orders The order to sort by for each property.
     * @returns {number} Returns the sort order indicator for `object`.
     */function compareMultiple(object,other,orders){var index=-1,objCriteria=object.criteria,othCriteria=other.criteria,length=objCriteria.length,ordersLength=orders.length;while(++index<length){var result=compareAscending(objCriteria[index],othCriteria[index]);if(result){if(index>=ordersLength){return result;}var order=orders[index];return result*(order=='desc'?-1:1);}}// Fixes an `Array#sort` bug in the JS engine embedded in Adobe applications
// that causes it, under certain circumstances, to provide the same value for
// `object` and `other`. See https://github.com/jashkenas/underscore/pull/1247
// for more details.
//
// This also ensures a stable sort in V8 and other engines.
// See https://bugs.chromium.org/p/v8/issues/detail?id=90 for more details.
return object.index-other.index;}/**
     * Creates an array that is the composition of partially applied arguments,
     * placeholders, and provided arguments into a single array of arguments.
     *
     * @private
     * @param {Array} args The provided arguments.
     * @param {Array} partials The arguments to prepend to those provided.
     * @param {Array} holders The `partials` placeholder indexes.
     * @params {boolean} [isCurried] Specify composing for a curried function.
     * @returns {Array} Returns the new array of composed arguments.
     */function composeArgs(args,partials,holders,isCurried){var argsIndex=-1,argsLength=args.length,holdersLength=holders.length,leftIndex=-1,leftLength=partials.length,rangeLength=nativeMax(argsLength-holdersLength,0),result=Array(leftLength+rangeLength),isUncurried=!isCurried;while(++leftIndex<leftLength){result[leftIndex]=partials[leftIndex];}while(++argsIndex<holdersLength){if(isUncurried||argsIndex<argsLength){result[holders[argsIndex]]=args[argsIndex];}}while(rangeLength--){result[leftIndex++]=args[argsIndex++];}return result;}/**
     * This function is like `composeArgs` except that the arguments composition
     * is tailored for `_.partialRight`.
     *
     * @private
     * @param {Array} args The provided arguments.
     * @param {Array} partials The arguments to append to those provided.
     * @param {Array} holders The `partials` placeholder indexes.
     * @params {boolean} [isCurried] Specify composing for a curried function.
     * @returns {Array} Returns the new array of composed arguments.
     */function composeArgsRight(args,partials,holders,isCurried){var argsIndex=-1,argsLength=args.length,holdersIndex=-1,holdersLength=holders.length,rightIndex=-1,rightLength=partials.length,rangeLength=nativeMax(argsLength-holdersLength,0),result=Array(rangeLength+rightLength),isUncurried=!isCurried;while(++argsIndex<rangeLength){result[argsIndex]=args[argsIndex];}var offset=argsIndex;while(++rightIndex<rightLength){result[offset+rightIndex]=partials[rightIndex];}while(++holdersIndex<holdersLength){if(isUncurried||argsIndex<argsLength){result[offset+holders[holdersIndex]]=args[argsIndex++];}}return result;}/**
     * Copies the values of `source` to `array`.
     *
     * @private
     * @param {Array} source The array to copy values from.
     * @param {Array} [array=[]] The array to copy values to.
     * @returns {Array} Returns `array`.
     */function copyArray(source,array){var index=-1,length=source.length;array||(array=Array(length));while(++index<length){array[index]=source[index];}return array;}/**
     * Copies properties of `source` to `object`.
     *
     * @private
     * @param {Object} source The object to copy properties from.
     * @param {Array} props The property identifiers to copy.
     * @param {Object} [object={}] The object to copy properties to.
     * @param {Function} [customizer] The function to customize copied values.
     * @returns {Object} Returns `object`.
     */function copyObject(source,props,object,customizer){var isNew=!object;object||(object={});var index=-1,length=props.length;while(++index<length){var key=props[index];var newValue=customizer?customizer(object[key],source[key],key,object,source):undefined;if(newValue===undefined){newValue=source[key];}if(isNew){baseAssignValue(object,key,newValue);}else{assignValue(object,key,newValue);}}return object;}/**
     * Copies own symbols of `source` to `object`.
     *
     * @private
     * @param {Object} source The object to copy symbols from.
     * @param {Object} [object={}] The object to copy symbols to.
     * @returns {Object} Returns `object`.
     */function copySymbols(source,object){return copyObject(source,getSymbols(source),object);}/**
     * Copies own and inherited symbols of `source` to `object`.
     *
     * @private
     * @param {Object} source The object to copy symbols from.
     * @param {Object} [object={}] The object to copy symbols to.
     * @returns {Object} Returns `object`.
     */function copySymbolsIn(source,object){return copyObject(source,getSymbolsIn(source),object);}/**
     * Creates a function like `_.groupBy`.
     *
     * @private
     * @param {Function} setter The function to set accumulator values.
     * @param {Function} [initializer] The accumulator object initializer.
     * @returns {Function} Returns the new aggregator function.
     */function createAggregator(setter,initializer){return function(collection,iteratee){var func=isArray(collection)?arrayAggregator:baseAggregator,accumulator=initializer?initializer():{};return func(collection,setter,getIteratee(iteratee,2),accumulator);};}/**
     * Creates a function like `_.assign`.
     *
     * @private
     * @param {Function} assigner The function to assign values.
     * @returns {Function} Returns the new assigner function.
     */function createAssigner(assigner){return baseRest(function(object,sources){var index=-1,length=sources.length,customizer=length>1?sources[length-1]:undefined,guard=length>2?sources[2]:undefined;customizer=assigner.length>3&&typeof customizer=='function'?(length--,customizer):undefined;if(guard&&isIterateeCall(sources[0],sources[1],guard)){customizer=length<3?undefined:customizer;length=1;}object=Object(object);while(++index<length){var source=sources[index];if(source){assigner(object,source,index,customizer);}}return object;});}/**
     * Creates a `baseEach` or `baseEachRight` function.
     *
     * @private
     * @param {Function} eachFunc The function to iterate over a collection.
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Function} Returns the new base function.
     */function createBaseEach(eachFunc,fromRight){return function(collection,iteratee){if(collection==null){return collection;}if(!isArrayLike(collection)){return eachFunc(collection,iteratee);}var length=collection.length,index=fromRight?length:-1,iterable=Object(collection);while(fromRight?index--:++index<length){if(iteratee(iterable[index],index,iterable)===false){break;}}return collection;};}/**
     * Creates a base function for methods like `_.forIn` and `_.forOwn`.
     *
     * @private
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Function} Returns the new base function.
     */function createBaseFor(fromRight){return function(object,iteratee,keysFunc){var index=-1,iterable=Object(object),props=keysFunc(object),length=props.length;while(length--){var key=props[fromRight?length:++index];if(iteratee(iterable[key],key,iterable)===false){break;}}return object;};}/**
     * Creates a function that wraps `func` to invoke it with the optional `this`
     * binding of `thisArg`.
     *
     * @private
     * @param {Function} func The function to wrap.
     * @param {number} bitmask The bitmask flags. See `createWrap` for more details.
     * @param {*} [thisArg] The `this` binding of `func`.
     * @returns {Function} Returns the new wrapped function.
     */function createBind(func,bitmask,thisArg){var isBind=bitmask&WRAP_BIND_FLAG,Ctor=createCtor(func);function wrapper(){var fn=this&&this!==root&&this instanceof wrapper?Ctor:func;return fn.apply(isBind?thisArg:this,arguments);}return wrapper;}/**
     * Creates a function like `_.lowerFirst`.
     *
     * @private
     * @param {string} methodName The name of the `String` case method to use.
     * @returns {Function} Returns the new case function.
     */function createCaseFirst(methodName){return function(string){string=toString(string);var strSymbols=hasUnicode(string)?stringToArray(string):undefined;var chr=strSymbols?strSymbols[0]:string.charAt(0);var trailing=strSymbols?castSlice(strSymbols,1).join(''):string.slice(1);return chr[methodName]()+trailing;};}/**
     * Creates a function like `_.camelCase`.
     *
     * @private
     * @param {Function} callback The function to combine each word.
     * @returns {Function} Returns the new compounder function.
     */function createCompounder(callback){return function(string){return arrayReduce(words(deburr(string).replace(reApos,'')),callback,'');};}/**
     * Creates a function that produces an instance of `Ctor` regardless of
     * whether it was invoked as part of a `new` expression or by `call` or `apply`.
     *
     * @private
     * @param {Function} Ctor The constructor to wrap.
     * @returns {Function} Returns the new wrapped function.
     */function createCtor(Ctor){return function(){// Use a `switch` statement to work with class constructors. See
// http://ecma-international.org/ecma-262/7.0/#sec-ecmascript-function-objects-call-thisargument-argumentslist
// for more details.
var args=arguments;switch(args.length){case 0:return new Ctor();case 1:return new Ctor(args[0]);case 2:return new Ctor(args[0],args[1]);case 3:return new Ctor(args[0],args[1],args[2]);case 4:return new Ctor(args[0],args[1],args[2],args[3]);case 5:return new Ctor(args[0],args[1],args[2],args[3],args[4]);case 6:return new Ctor(args[0],args[1],args[2],args[3],args[4],args[5]);case 7:return new Ctor(args[0],args[1],args[2],args[3],args[4],args[5],args[6]);}var thisBinding=baseCreate(Ctor.prototype),result=Ctor.apply(thisBinding,args);// Mimic the constructor's `return` behavior.
// See https://es5.github.io/#x13.2.2 for more details.
return isObject(result)?result:thisBinding;};}/**
     * Creates a function that wraps `func` to enable currying.
     *
     * @private
     * @param {Function} func The function to wrap.
     * @param {number} bitmask The bitmask flags. See `createWrap` for more details.
     * @param {number} arity The arity of `func`.
     * @returns {Function} Returns the new wrapped function.
     */function createCurry(func,bitmask,arity){var Ctor=createCtor(func);function wrapper(){var length=arguments.length,args=Array(length),index=length,placeholder=getHolder(wrapper);while(index--){args[index]=arguments[index];}var holders=length<3&&args[0]!==placeholder&&args[length-1]!==placeholder?[]:replaceHolders(args,placeholder);length-=holders.length;if(length<arity){return createRecurry(func,bitmask,createHybrid,wrapper.placeholder,undefined,args,holders,undefined,undefined,arity-length);}var fn=this&&this!==root&&this instanceof wrapper?Ctor:func;return apply(fn,this,args);}return wrapper;}/**
     * Creates a `_.find` or `_.findLast` function.
     *
     * @private
     * @param {Function} findIndexFunc The function to find the collection index.
     * @returns {Function} Returns the new find function.
     */function createFind(findIndexFunc){return function(collection,predicate,fromIndex){var iterable=Object(collection);if(!isArrayLike(collection)){var iteratee=getIteratee(predicate,3);collection=keys(collection);predicate=function predicate(key){return iteratee(iterable[key],key,iterable);};}var index=findIndexFunc(collection,predicate,fromIndex);return index>-1?iterable[iteratee?collection[index]:index]:undefined;};}/**
     * Creates a `_.flow` or `_.flowRight` function.
     *
     * @private
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Function} Returns the new flow function.
     */function createFlow(fromRight){return flatRest(function(funcs){var length=funcs.length,index=length,prereq=LodashWrapper.prototype.thru;if(fromRight){funcs.reverse();}while(index--){var func=funcs[index];if(typeof func!='function'){throw new TypeError(FUNC_ERROR_TEXT);}if(prereq&&!wrapper&&getFuncName(func)=='wrapper'){var wrapper=new LodashWrapper([],true);}}index=wrapper?index:length;while(++index<length){func=funcs[index];var funcName=getFuncName(func),data=funcName=='wrapper'?getData(func):undefined;if(data&&isLaziable(data[0])&&data[1]==(WRAP_ARY_FLAG|WRAP_CURRY_FLAG|WRAP_PARTIAL_FLAG|WRAP_REARG_FLAG)&&!data[4].length&&data[9]==1){wrapper=wrapper[getFuncName(data[0])].apply(wrapper,data[3]);}else{wrapper=func.length==1&&isLaziable(func)?wrapper[funcName]():wrapper.thru(func);}}return function(){var args=arguments,value=args[0];if(wrapper&&args.length==1&&isArray(value)){return wrapper.plant(value).value();}var index=0,result=length?funcs[index].apply(this,args):value;while(++index<length){result=funcs[index].call(this,result);}return result;};});}/**
     * Creates a function that wraps `func` to invoke it with optional `this`
     * binding of `thisArg`, partial application, and currying.
     *
     * @private
     * @param {Function|string} func The function or method name to wrap.
     * @param {number} bitmask The bitmask flags. See `createWrap` for more details.
     * @param {*} [thisArg] The `this` binding of `func`.
     * @param {Array} [partials] The arguments to prepend to those provided to
     *  the new function.
     * @param {Array} [holders] The `partials` placeholder indexes.
     * @param {Array} [partialsRight] The arguments to append to those provided
     *  to the new function.
     * @param {Array} [holdersRight] The `partialsRight` placeholder indexes.
     * @param {Array} [argPos] The argument positions of the new function.
     * @param {number} [ary] The arity cap of `func`.
     * @param {number} [arity] The arity of `func`.
     * @returns {Function} Returns the new wrapped function.
     */function createHybrid(func,bitmask,thisArg,partials,holders,partialsRight,holdersRight,argPos,ary,arity){var isAry=bitmask&WRAP_ARY_FLAG,isBind=bitmask&WRAP_BIND_FLAG,isBindKey=bitmask&WRAP_BIND_KEY_FLAG,isCurried=bitmask&(WRAP_CURRY_FLAG|WRAP_CURRY_RIGHT_FLAG),isFlip=bitmask&WRAP_FLIP_FLAG,Ctor=isBindKey?undefined:createCtor(func);function wrapper(){var length=arguments.length,args=Array(length),index=length;while(index--){args[index]=arguments[index];}if(isCurried){var placeholder=getHolder(wrapper),holdersCount=countHolders(args,placeholder);}if(partials){args=composeArgs(args,partials,holders,isCurried);}if(partialsRight){args=composeArgsRight(args,partialsRight,holdersRight,isCurried);}length-=holdersCount;if(isCurried&&length<arity){var newHolders=replaceHolders(args,placeholder);return createRecurry(func,bitmask,createHybrid,wrapper.placeholder,thisArg,args,newHolders,argPos,ary,arity-length);}var thisBinding=isBind?thisArg:this,fn=isBindKey?thisBinding[func]:func;length=args.length;if(argPos){args=reorder(args,argPos);}else if(isFlip&&length>1){args.reverse();}if(isAry&&ary<length){args.length=ary;}if(this&&this!==root&&this instanceof wrapper){fn=Ctor||createCtor(fn);}return fn.apply(thisBinding,args);}return wrapper;}/**
     * Creates a function like `_.invertBy`.
     *
     * @private
     * @param {Function} setter The function to set accumulator values.
     * @param {Function} toIteratee The function to resolve iteratees.
     * @returns {Function} Returns the new inverter function.
     */function createInverter(setter,toIteratee){return function(object,iteratee){return baseInverter(object,setter,toIteratee(iteratee),{});};}/**
     * Creates a function that performs a mathematical operation on two values.
     *
     * @private
     * @param {Function} operator The function to perform the operation.
     * @param {number} [defaultValue] The value used for `undefined` arguments.
     * @returns {Function} Returns the new mathematical operation function.
     */function createMathOperation(operator,defaultValue){return function(value,other){var result;if(value===undefined&&other===undefined){return defaultValue;}if(value!==undefined){result=value;}if(other!==undefined){if(result===undefined){return other;}if(typeof value=='string'||typeof other=='string'){value=baseToString(value);other=baseToString(other);}else{value=baseToNumber(value);other=baseToNumber(other);}result=operator(value,other);}return result;};}/**
     * Creates a function like `_.over`.
     *
     * @private
     * @param {Function} arrayFunc The function to iterate over iteratees.
     * @returns {Function} Returns the new over function.
     */function createOver(arrayFunc){return flatRest(function(iteratees){iteratees=arrayMap(iteratees,baseUnary(getIteratee()));return baseRest(function(args){var thisArg=this;return arrayFunc(iteratees,function(iteratee){return apply(iteratee,thisArg,args);});});});}/**
     * Creates the padding for `string` based on `length`. The `chars` string
     * is truncated if the number of characters exceeds `length`.
     *
     * @private
     * @param {number} length The padding length.
     * @param {string} [chars=' '] The string used as padding.
     * @returns {string} Returns the padding for `string`.
     */function createPadding(length,chars){chars=chars===undefined?' ':baseToString(chars);var charsLength=chars.length;if(charsLength<2){return charsLength?baseRepeat(chars,length):chars;}var result=baseRepeat(chars,nativeCeil(length/stringSize(chars)));return hasUnicode(chars)?castSlice(stringToArray(result),0,length).join(''):result.slice(0,length);}/**
     * Creates a function that wraps `func` to invoke it with the `this` binding
     * of `thisArg` and `partials` prepended to the arguments it receives.
     *
     * @private
     * @param {Function} func The function to wrap.
     * @param {number} bitmask The bitmask flags. See `createWrap` for more details.
     * @param {*} thisArg The `this` binding of `func`.
     * @param {Array} partials The arguments to prepend to those provided to
     *  the new function.
     * @returns {Function} Returns the new wrapped function.
     */function createPartial(func,bitmask,thisArg,partials){var isBind=bitmask&WRAP_BIND_FLAG,Ctor=createCtor(func);function wrapper(){var argsIndex=-1,argsLength=arguments.length,leftIndex=-1,leftLength=partials.length,args=Array(leftLength+argsLength),fn=this&&this!==root&&this instanceof wrapper?Ctor:func;while(++leftIndex<leftLength){args[leftIndex]=partials[leftIndex];}while(argsLength--){args[leftIndex++]=arguments[++argsIndex];}return apply(fn,isBind?thisArg:this,args);}return wrapper;}/**
     * Creates a `_.range` or `_.rangeRight` function.
     *
     * @private
     * @param {boolean} [fromRight] Specify iterating from right to left.
     * @returns {Function} Returns the new range function.
     */function createRange(fromRight){return function(start,end,step){if(step&&typeof step!='number'&&isIterateeCall(start,end,step)){end=step=undefined;}// Ensure the sign of `-0` is preserved.
start=toFinite(start);if(end===undefined){end=start;start=0;}else{end=toFinite(end);}step=step===undefined?start<end?1:-1:toFinite(step);return baseRange(start,end,step,fromRight);};}/**
     * Creates a function that performs a relational operation on two values.
     *
     * @private
     * @param {Function} operator The function to perform the operation.
     * @returns {Function} Returns the new relational operation function.
     */function createRelationalOperation(operator){return function(value,other){if(!(typeof value=='string'&&typeof other=='string')){value=toNumber(value);other=toNumber(other);}return operator(value,other);};}/**
     * Creates a function that wraps `func` to continue currying.
     *
     * @private
     * @param {Function} func The function to wrap.
     * @param {number} bitmask The bitmask flags. See `createWrap` for more details.
     * @param {Function} wrapFunc The function to create the `func` wrapper.
     * @param {*} placeholder The placeholder value.
     * @param {*} [thisArg] The `this` binding of `func`.
     * @param {Array} [partials] The arguments to prepend to those provided to
     *  the new function.
     * @param {Array} [holders] The `partials` placeholder indexes.
     * @param {Array} [argPos] The argument positions of the new function.
     * @param {number} [ary] The arity cap of `func`.
     * @param {number} [arity] The arity of `func`.
     * @returns {Function} Returns the new wrapped function.
     */function createRecurry(func,bitmask,wrapFunc,placeholder,thisArg,partials,holders,argPos,ary,arity){var isCurry=bitmask&WRAP_CURRY_FLAG,newHolders=isCurry?holders:undefined,newHoldersRight=isCurry?undefined:holders,newPartials=isCurry?partials:undefined,newPartialsRight=isCurry?undefined:partials;bitmask|=isCurry?WRAP_PARTIAL_FLAG:WRAP_PARTIAL_RIGHT_FLAG;bitmask&=~(isCurry?WRAP_PARTIAL_RIGHT_FLAG:WRAP_PARTIAL_FLAG);if(!(bitmask&WRAP_CURRY_BOUND_FLAG)){bitmask&=~(WRAP_BIND_FLAG|WRAP_BIND_KEY_FLAG);}var newData=[func,bitmask,thisArg,newPartials,newHolders,newPartialsRight,newHoldersRight,argPos,ary,arity];var result=wrapFunc.apply(undefined,newData);if(isLaziable(func)){setData(result,newData);}result.placeholder=placeholder;return setWrapToString(result,func,bitmask);}/**
     * Creates a function like `_.round`.
     *
     * @private
     * @param {string} methodName The name of the `Math` method to use when rounding.
     * @returns {Function} Returns the new round function.
     */function createRound(methodName){var func=Math[methodName];return function(number,precision){number=toNumber(number);precision=precision==null?0:nativeMin(toInteger(precision),292);if(precision){// Shift with exponential notation to avoid floating-point issues.
// See [MDN](https://mdn.io/round#Examples) for more details.
var pair=(toString(number)+'e').split('e'),value=func(pair[0]+'e'+(+pair[1]+precision));pair=(toString(value)+'e').split('e');return+(pair[0]+'e'+(+pair[1]-precision));}return func(number);};}/**
     * Creates a set object of `values`.
     *
     * @private
     * @param {Array} values The values to add to the set.
     * @returns {Object} Returns the new set.
     */var createSet=!(Set&&1/setToArray(new Set([,-0]))[1]==INFINITY)?noop:function(values){return new Set(values);};/**
     * Creates a `_.toPairs` or `_.toPairsIn` function.
     *
     * @private
     * @param {Function} keysFunc The function to get the keys of a given object.
     * @returns {Function} Returns the new pairs function.
     */function createToPairs(keysFunc){return function(object){var tag=getTag(object);if(tag==mapTag){return mapToArray(object);}if(tag==setTag){return setToPairs(object);}return baseToPairs(object,keysFunc(object));};}/**
     * Creates a function that either curries or invokes `func` with optional
     * `this` binding and partially applied arguments.
     *
     * @private
     * @param {Function|string} func The function or method name to wrap.
     * @param {number} bitmask The bitmask flags.
     *    1 - `_.bind`
     *    2 - `_.bindKey`
     *    4 - `_.curry` or `_.curryRight` of a bound function
     *    8 - `_.curry`
     *   16 - `_.curryRight`
     *   32 - `_.partial`
     *   64 - `_.partialRight`
     *  128 - `_.rearg`
     *  256 - `_.ary`
     *  512 - `_.flip`
     * @param {*} [thisArg] The `this` binding of `func`.
     * @param {Array} [partials] The arguments to be partially applied.
     * @param {Array} [holders] The `partials` placeholder indexes.
     * @param {Array} [argPos] The argument positions of the new function.
     * @param {number} [ary] The arity cap of `func`.
     * @param {number} [arity] The arity of `func`.
     * @returns {Function} Returns the new wrapped function.
     */function createWrap(func,bitmask,thisArg,partials,holders,argPos,ary,arity){var isBindKey=bitmask&WRAP_BIND_KEY_FLAG;if(!isBindKey&&typeof func!='function'){throw new TypeError(FUNC_ERROR_TEXT);}var length=partials?partials.length:0;if(!length){bitmask&=~(WRAP_PARTIAL_FLAG|WRAP_PARTIAL_RIGHT_FLAG);partials=holders=undefined;}ary=ary===undefined?ary:nativeMax(toInteger(ary),0);arity=arity===undefined?arity:toInteger(arity);length-=holders?holders.length:0;if(bitmask&WRAP_PARTIAL_RIGHT_FLAG){var partialsRight=partials,holdersRight=holders;partials=holders=undefined;}var data=isBindKey?undefined:getData(func);var newData=[func,bitmask,thisArg,partials,holders,partialsRight,holdersRight,argPos,ary,arity];if(data){mergeData(newData,data);}func=newData[0];bitmask=newData[1];thisArg=newData[2];partials=newData[3];holders=newData[4];arity=newData[9]=newData[9]===undefined?isBindKey?0:func.length:nativeMax(newData[9]-length,0);if(!arity&&bitmask&(WRAP_CURRY_FLAG|WRAP_CURRY_RIGHT_FLAG)){bitmask&=~(WRAP_CURRY_FLAG|WRAP_CURRY_RIGHT_FLAG);}if(!bitmask||bitmask==WRAP_BIND_FLAG){var result=createBind(func,bitmask,thisArg);}else if(bitmask==WRAP_CURRY_FLAG||bitmask==WRAP_CURRY_RIGHT_FLAG){result=createCurry(func,bitmask,arity);}else if((bitmask==WRAP_PARTIAL_FLAG||bitmask==(WRAP_BIND_FLAG|WRAP_PARTIAL_FLAG))&&!holders.length){result=createPartial(func,bitmask,thisArg,partials);}else{result=createHybrid.apply(undefined,newData);}var setter=data?baseSetData:setData;return setWrapToString(setter(result,newData),func,bitmask);}/**
     * Used by `_.defaults` to customize its `_.assignIn` use to assign properties
     * of source objects to the destination object for all destination properties
     * that resolve to `undefined`.
     *
     * @private
     * @param {*} objValue The destination value.
     * @param {*} srcValue The source value.
     * @param {string} key The key of the property to assign.
     * @param {Object} object The parent object of `objValue`.
     * @returns {*} Returns the value to assign.
     */function customDefaultsAssignIn(objValue,srcValue,key,object){if(objValue===undefined||eq(objValue,objectProto[key])&&!hasOwnProperty.call(object,key)){return srcValue;}return objValue;}/**
     * Used by `_.defaultsDeep` to customize its `_.merge` use to merge source
     * objects into destination objects that are passed thru.
     *
     * @private
     * @param {*} objValue The destination value.
     * @param {*} srcValue The source value.
     * @param {string} key The key of the property to merge.
     * @param {Object} object The parent object of `objValue`.
     * @param {Object} source The parent object of `srcValue`.
     * @param {Object} [stack] Tracks traversed source values and their merged
     *  counterparts.
     * @returns {*} Returns the value to assign.
     */function customDefaultsMerge(objValue,srcValue,key,object,source,stack){if(isObject(objValue)&&isObject(srcValue)){// Recursively merge objects and arrays (susceptible to call stack limits).
stack.set(srcValue,objValue);baseMerge(objValue,srcValue,undefined,customDefaultsMerge,stack);stack['delete'](srcValue);}return objValue;}/**
     * Used by `_.omit` to customize its `_.cloneDeep` use to only clone plain
     * objects.
     *
     * @private
     * @param {*} value The value to inspect.
     * @param {string} key The key of the property to inspect.
     * @returns {*} Returns the uncloned value or `undefined` to defer cloning to `_.cloneDeep`.
     */function customOmitClone(value){return isPlainObject(value)?undefined:value;}/**
     * A specialized version of `baseIsEqualDeep` for arrays with support for
     * partial deep comparisons.
     *
     * @private
     * @param {Array} array The array to compare.
     * @param {Array} other The other array to compare.
     * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
     * @param {Function} customizer The function to customize comparisons.
     * @param {Function} equalFunc The function to determine equivalents of values.
     * @param {Object} stack Tracks traversed `array` and `other` objects.
     * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
     */function equalArrays(array,other,bitmask,customizer,equalFunc,stack){var isPartial=bitmask&COMPARE_PARTIAL_FLAG,arrLength=array.length,othLength=other.length;if(arrLength!=othLength&&!(isPartial&&othLength>arrLength)){return false;}// Assume cyclic values are equal.
var stacked=stack.get(array);if(stacked&&stack.get(other)){return stacked==other;}var index=-1,result=true,seen=bitmask&COMPARE_UNORDERED_FLAG?new SetCache():undefined;stack.set(array,other);stack.set(other,array);// Ignore non-index properties.
while(++index<arrLength){var arrValue=array[index],othValue=other[index];if(customizer){var compared=isPartial?customizer(othValue,arrValue,index,other,array,stack):customizer(arrValue,othValue,index,array,other,stack);}if(compared!==undefined){if(compared){continue;}result=false;break;}// Recursively compare arrays (susceptible to call stack limits).
if(seen){if(!arraySome(other,function(othValue,othIndex){if(!cacheHas(seen,othIndex)&&(arrValue===othValue||equalFunc(arrValue,othValue,bitmask,customizer,stack))){return seen.push(othIndex);}})){result=false;break;}}else if(!(arrValue===othValue||equalFunc(arrValue,othValue,bitmask,customizer,stack))){result=false;break;}}stack['delete'](array);stack['delete'](other);return result;}/**
     * A specialized version of `baseIsEqualDeep` for comparing objects of
     * the same `toStringTag`.
     *
     * **Note:** This function only supports comparing values with tags of
     * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
     *
     * @private
     * @param {Object} object The object to compare.
     * @param {Object} other The other object to compare.
     * @param {string} tag The `toStringTag` of the objects to compare.
     * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
     * @param {Function} customizer The function to customize comparisons.
     * @param {Function} equalFunc The function to determine equivalents of values.
     * @param {Object} stack Tracks traversed `object` and `other` objects.
     * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
     */function equalByTag(object,other,tag,bitmask,customizer,equalFunc,stack){switch(tag){case dataViewTag:if(object.byteLength!=other.byteLength||object.byteOffset!=other.byteOffset){return false;}object=object.buffer;other=other.buffer;case arrayBufferTag:if(object.byteLength!=other.byteLength||!equalFunc(new Uint8Array(object),new Uint8Array(other))){return false;}return true;case boolTag:case dateTag:case numberTag:// Coerce booleans to `1` or `0` and dates to milliseconds.
// Invalid dates are coerced to `NaN`.
return eq(+object,+other);case errorTag:return object.name==other.name&&object.message==other.message;case regexpTag:case stringTag:// Coerce regexes to strings and treat strings, primitives and objects,
// as equal. See http://www.ecma-international.org/ecma-262/7.0/#sec-regexp.prototype.tostring
// for more details.
return object==other+'';case mapTag:var convert=mapToArray;case setTag:var isPartial=bitmask&COMPARE_PARTIAL_FLAG;convert||(convert=setToArray);if(object.size!=other.size&&!isPartial){return false;}// Assume cyclic values are equal.
var stacked=stack.get(object);if(stacked){return stacked==other;}bitmask|=COMPARE_UNORDERED_FLAG;// Recursively compare objects (susceptible to call stack limits).
stack.set(object,other);var result=equalArrays(convert(object),convert(other),bitmask,customizer,equalFunc,stack);stack['delete'](object);return result;case symbolTag:if(symbolValueOf){return symbolValueOf.call(object)==symbolValueOf.call(other);}}return false;}/**
     * A specialized version of `baseIsEqualDeep` for objects with support for
     * partial deep comparisons.
     *
     * @private
     * @param {Object} object The object to compare.
     * @param {Object} other The other object to compare.
     * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
     * @param {Function} customizer The function to customize comparisons.
     * @param {Function} equalFunc The function to determine equivalents of values.
     * @param {Object} stack Tracks traversed `object` and `other` objects.
     * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
     */function equalObjects(object,other,bitmask,customizer,equalFunc,stack){var isPartial=bitmask&COMPARE_PARTIAL_FLAG,objProps=getAllKeys(object),objLength=objProps.length,othProps=getAllKeys(other),othLength=othProps.length;if(objLength!=othLength&&!isPartial){return false;}var index=objLength;while(index--){var key=objProps[index];if(!(isPartial?key in other:hasOwnProperty.call(other,key))){return false;}}// Assume cyclic values are equal.
var stacked=stack.get(object);if(stacked&&stack.get(other)){return stacked==other;}var result=true;stack.set(object,other);stack.set(other,object);var skipCtor=isPartial;while(++index<objLength){key=objProps[index];var objValue=object[key],othValue=other[key];if(customizer){var compared=isPartial?customizer(othValue,objValue,key,other,object,stack):customizer(objValue,othValue,key,object,other,stack);}// Recursively compare objects (susceptible to call stack limits).
if(!(compared===undefined?objValue===othValue||equalFunc(objValue,othValue,bitmask,customizer,stack):compared)){result=false;break;}skipCtor||(skipCtor=key=='constructor');}if(result&&!skipCtor){var objCtor=object.constructor,othCtor=other.constructor;// Non `Object` object instances with different constructors are not equal.
if(objCtor!=othCtor&&'constructor'in object&&'constructor'in other&&!(typeof objCtor=='function'&&objCtor instanceof objCtor&&typeof othCtor=='function'&&othCtor instanceof othCtor)){result=false;}}stack['delete'](object);stack['delete'](other);return result;}/**
     * A specialized version of `baseRest` which flattens the rest array.
     *
     * @private
     * @param {Function} func The function to apply a rest parameter to.
     * @returns {Function} Returns the new function.
     */function flatRest(func){return setToString(overRest(func,undefined,flatten),func+'');}/**
     * Creates an array of own enumerable property names and symbols of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names and symbols.
     */function getAllKeys(object){return baseGetAllKeys(object,keys,getSymbols);}/**
     * Creates an array of own and inherited enumerable property names and
     * symbols of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names and symbols.
     */function getAllKeysIn(object){return baseGetAllKeys(object,keysIn,getSymbolsIn);}/**
     * Gets metadata for `func`.
     *
     * @private
     * @param {Function} func The function to query.
     * @returns {*} Returns the metadata for `func`.
     */var getData=!metaMap?noop:function(func){return metaMap.get(func);};/**
     * Gets the name of `func`.
     *
     * @private
     * @param {Function} func The function to query.
     * @returns {string} Returns the function name.
     */function getFuncName(func){var result=func.name+'',array=realNames[result],length=hasOwnProperty.call(realNames,result)?array.length:0;while(length--){var data=array[length],otherFunc=data.func;if(otherFunc==null||otherFunc==func){return data.name;}}return result;}/**
     * Gets the argument placeholder value for `func`.
     *
     * @private
     * @param {Function} func The function to inspect.
     * @returns {*} Returns the placeholder value.
     */function getHolder(func){var object=hasOwnProperty.call(lodash,'placeholder')?lodash:func;return object.placeholder;}/**
     * Gets the appropriate "iteratee" function. If `_.iteratee` is customized,
     * this function returns the custom method, otherwise it returns `baseIteratee`.
     * If arguments are provided, the chosen function is invoked with them and
     * its result is returned.
     *
     * @private
     * @param {*} [value] The value to convert to an iteratee.
     * @param {number} [arity] The arity of the created iteratee.
     * @returns {Function} Returns the chosen function or its result.
     */function getIteratee(){var result=lodash.iteratee||iteratee;result=result===iteratee?baseIteratee:result;return arguments.length?result(arguments[0],arguments[1]):result;}/**
     * Gets the data for `map`.
     *
     * @private
     * @param {Object} map The map to query.
     * @param {string} key The reference key.
     * @returns {*} Returns the map data.
     */function getMapData(map,key){var data=map.__data__;return isKeyable(key)?data[typeof key=='string'?'string':'hash']:data.map;}/**
     * Gets the property names, values, and compare flags of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the match data of `object`.
     */function getMatchData(object){var result=keys(object),length=result.length;while(length--){var key=result[length],value=object[key];result[length]=[key,value,isStrictComparable(value)];}return result;}/**
     * Gets the native function at `key` of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {string} key The key of the method to get.
     * @returns {*} Returns the function if it's native, else `undefined`.
     */function getNative(object,key){var value=getValue(object,key);return baseIsNative(value)?value:undefined;}/**
     * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the raw `toStringTag`.
     */function getRawTag(value){var isOwn=hasOwnProperty.call(value,symToStringTag),tag=value[symToStringTag];try{value[symToStringTag]=undefined;var unmasked=true;}catch(e){}var result=nativeObjectToString.call(value);if(unmasked){if(isOwn){value[symToStringTag]=tag;}else{delete value[symToStringTag];}}return result;}/**
     * Creates an array of the own enumerable symbols of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of symbols.
     */var getSymbols=!nativeGetSymbols?stubArray:function(object){if(object==null){return[];}object=Object(object);return arrayFilter(nativeGetSymbols(object),function(symbol){return propertyIsEnumerable.call(object,symbol);});};/**
     * Creates an array of the own and inherited enumerable symbols of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of symbols.
     */var getSymbolsIn=!nativeGetSymbols?stubArray:function(object){var result=[];while(object){arrayPush(result,getSymbols(object));object=getPrototype(object);}return result;};/**
     * Gets the `toStringTag` of `value`.
     *
     * @private
     * @param {*} value The value to query.
     * @returns {string} Returns the `toStringTag`.
     */var getTag=baseGetTag;// Fallback for data views, maps, sets, and weak maps in IE 11 and promises in Node.js < 6.
if(DataView&&getTag(new DataView(new ArrayBuffer(1)))!=dataViewTag||Map&&getTag(new Map())!=mapTag||Promise&&getTag(Promise.resolve())!=promiseTag||Set&&getTag(new Set())!=setTag||WeakMap&&getTag(new WeakMap())!=weakMapTag){getTag=function getTag(value){var result=baseGetTag(value),Ctor=result==objectTag?value.constructor:undefined,ctorString=Ctor?toSource(Ctor):'';if(ctorString){switch(ctorString){case dataViewCtorString:return dataViewTag;case mapCtorString:return mapTag;case promiseCtorString:return promiseTag;case setCtorString:return setTag;case weakMapCtorString:return weakMapTag;}}return result;};}/**
     * Gets the view, applying any `transforms` to the `start` and `end` positions.
     *
     * @private
     * @param {number} start The start of the view.
     * @param {number} end The end of the view.
     * @param {Array} transforms The transformations to apply to the view.
     * @returns {Object} Returns an object containing the `start` and `end`
     *  positions of the view.
     */function getView(start,end,transforms){var index=-1,length=transforms.length;while(++index<length){var data=transforms[index],size=data.size;switch(data.type){case'drop':start+=size;break;case'dropRight':end-=size;break;case'take':end=nativeMin(end,start+size);break;case'takeRight':start=nativeMax(start,end-size);break;}}return{'start':start,'end':end};}/**
     * Extracts wrapper details from the `source` body comment.
     *
     * @private
     * @param {string} source The source to inspect.
     * @returns {Array} Returns the wrapper details.
     */function getWrapDetails(source){var match=source.match(reWrapDetails);return match?match[1].split(reSplitDetails):[];}/**
     * Checks if `path` exists on `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array|string} path The path to check.
     * @param {Function} hasFunc The function to check properties.
     * @returns {boolean} Returns `true` if `path` exists, else `false`.
     */function hasPath(object,path,hasFunc){path=castPath(path,object);var index=-1,length=path.length,result=false;while(++index<length){var key=toKey(path[index]);if(!(result=object!=null&&hasFunc(object,key))){break;}object=object[key];}if(result||++index!=length){return result;}length=object==null?0:object.length;return!!length&&isLength(length)&&isIndex(key,length)&&(isArray(object)||isArguments(object));}/**
     * Initializes an array clone.
     *
     * @private
     * @param {Array} array The array to clone.
     * @returns {Array} Returns the initialized clone.
     */function initCloneArray(array){var length=array.length,result=array.constructor(length);// Add properties assigned by `RegExp#exec`.
if(length&&typeof array[0]=='string'&&hasOwnProperty.call(array,'index')){result.index=array.index;result.input=array.input;}return result;}/**
     * Initializes an object clone.
     *
     * @private
     * @param {Object} object The object to clone.
     * @returns {Object} Returns the initialized clone.
     */function initCloneObject(object){return typeof object.constructor=='function'&&!isPrototype(object)?baseCreate(getPrototype(object)):{};}/**
     * Initializes an object clone based on its `toStringTag`.
     *
     * **Note:** This function only supports cloning values with tags of
     * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
     *
     * @private
     * @param {Object} object The object to clone.
     * @param {string} tag The `toStringTag` of the object to clone.
     * @param {Function} cloneFunc The function to clone values.
     * @param {boolean} [isDeep] Specify a deep clone.
     * @returns {Object} Returns the initialized clone.
     */function initCloneByTag(object,tag,cloneFunc,isDeep){var Ctor=object.constructor;switch(tag){case arrayBufferTag:return cloneArrayBuffer(object);case boolTag:case dateTag:return new Ctor(+object);case dataViewTag:return cloneDataView(object,isDeep);case float32Tag:case float64Tag:case int8Tag:case int16Tag:case int32Tag:case uint8Tag:case uint8ClampedTag:case uint16Tag:case uint32Tag:return cloneTypedArray(object,isDeep);case mapTag:return cloneMap(object,isDeep,cloneFunc);case numberTag:case stringTag:return new Ctor(object);case regexpTag:return cloneRegExp(object);case setTag:return cloneSet(object,isDeep,cloneFunc);case symbolTag:return cloneSymbol(object);}}/**
     * Inserts wrapper `details` in a comment at the top of the `source` body.
     *
     * @private
     * @param {string} source The source to modify.
     * @returns {Array} details The details to insert.
     * @returns {string} Returns the modified source.
     */function insertWrapDetails(source,details){var length=details.length;if(!length){return source;}var lastIndex=length-1;details[lastIndex]=(length>1?'& ':'')+details[lastIndex];details=details.join(length>2?', ':' ');return source.replace(reWrapComment,'{\n/* [wrapped with '+details+'] */\n');}/**
     * Checks if `value` is a flattenable `arguments` object or array.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is flattenable, else `false`.
     */function isFlattenable(value){return isArray(value)||isArguments(value)||!!(spreadableSymbol&&value&&value[spreadableSymbol]);}/**
     * Checks if `value` is a valid array-like index.
     *
     * @private
     * @param {*} value The value to check.
     * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
     * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
     */function isIndex(value,length){length=length==null?MAX_SAFE_INTEGER:length;return!!length&&(typeof value=='number'||reIsUint.test(value))&&value>-1&&value%1==0&&value<length;}/**
     * Checks if the given arguments are from an iteratee call.
     *
     * @private
     * @param {*} value The potential iteratee value argument.
     * @param {*} index The potential iteratee index or key argument.
     * @param {*} object The potential iteratee object argument.
     * @returns {boolean} Returns `true` if the arguments are from an iteratee call,
     *  else `false`.
     */function isIterateeCall(value,index,object){if(!isObject(object)){return false;}var type=typeof index==='undefined'?'undefined':_typeof(index);if(type=='number'?isArrayLike(object)&&isIndex(index,object.length):type=='string'&&index in object){return eq(object[index],value);}return false;}/**
     * Checks if `value` is a property name and not a property path.
     *
     * @private
     * @param {*} value The value to check.
     * @param {Object} [object] The object to query keys on.
     * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
     */function isKey(value,object){if(isArray(value)){return false;}var type=typeof value==='undefined'?'undefined':_typeof(value);if(type=='number'||type=='symbol'||type=='boolean'||value==null||isSymbol(value)){return true;}return reIsPlainProp.test(value)||!reIsDeepProp.test(value)||object!=null&&value in Object(object);}/**
     * Checks if `value` is suitable for use as unique object key.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
     */function isKeyable(value){var type=typeof value==='undefined'?'undefined':_typeof(value);return type=='string'||type=='number'||type=='symbol'||type=='boolean'?value!=='__proto__':value===null;}/**
     * Checks if `func` has a lazy counterpart.
     *
     * @private
     * @param {Function} func The function to check.
     * @returns {boolean} Returns `true` if `func` has a lazy counterpart,
     *  else `false`.
     */function isLaziable(func){var funcName=getFuncName(func),other=lodash[funcName];if(typeof other!='function'||!(funcName in LazyWrapper.prototype)){return false;}if(func===other){return true;}var data=getData(other);return!!data&&func===data[0];}/**
     * Checks if `func` has its source masked.
     *
     * @private
     * @param {Function} func The function to check.
     * @returns {boolean} Returns `true` if `func` is masked, else `false`.
     */function isMasked(func){return!!maskSrcKey&&maskSrcKey in func;}/**
     * Checks if `func` is capable of being masked.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `func` is maskable, else `false`.
     */var isMaskable=coreJsData?isFunction:stubFalse;/**
     * Checks if `value` is likely a prototype object.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
     */function isPrototype(value){var Ctor=value&&value.constructor,proto=typeof Ctor=='function'&&Ctor.prototype||objectProto;return value===proto;}/**
     * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
     *
     * @private
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` if suitable for strict
     *  equality comparisons, else `false`.
     */function isStrictComparable(value){return value===value&&!isObject(value);}/**
     * A specialized version of `matchesProperty` for source values suitable
     * for strict equality comparisons, i.e. `===`.
     *
     * @private
     * @param {string} key The key of the property to get.
     * @param {*} srcValue The value to match.
     * @returns {Function} Returns the new spec function.
     */function matchesStrictComparable(key,srcValue){return function(object){if(object==null){return false;}return object[key]===srcValue&&(srcValue!==undefined||key in Object(object));};}/**
     * A specialized version of `_.memoize` which clears the memoized function's
     * cache when it exceeds `MAX_MEMOIZE_SIZE`.
     *
     * @private
     * @param {Function} func The function to have its output memoized.
     * @returns {Function} Returns the new memoized function.
     */function memoizeCapped(func){var result=memoize(func,function(key){if(cache.size===MAX_MEMOIZE_SIZE){cache.clear();}return key;});var cache=result.cache;return result;}/**
     * Merges the function metadata of `source` into `data`.
     *
     * Merging metadata reduces the number of wrappers used to invoke a function.
     * This is possible because methods like `_.bind`, `_.curry`, and `_.partial`
     * may be applied regardless of execution order. Methods like `_.ary` and
     * `_.rearg` modify function arguments, making the order in which they are
     * executed important, preventing the merging of metadata. However, we make
     * an exception for a safe combined case where curried functions have `_.ary`
     * and or `_.rearg` applied.
     *
     * @private
     * @param {Array} data The destination metadata.
     * @param {Array} source The source metadata.
     * @returns {Array} Returns `data`.
     */function mergeData(data,source){var bitmask=data[1],srcBitmask=source[1],newBitmask=bitmask|srcBitmask,isCommon=newBitmask<(WRAP_BIND_FLAG|WRAP_BIND_KEY_FLAG|WRAP_ARY_FLAG);var isCombo=srcBitmask==WRAP_ARY_FLAG&&bitmask==WRAP_CURRY_FLAG||srcBitmask==WRAP_ARY_FLAG&&bitmask==WRAP_REARG_FLAG&&data[7].length<=source[8]||srcBitmask==(WRAP_ARY_FLAG|WRAP_REARG_FLAG)&&source[7].length<=source[8]&&bitmask==WRAP_CURRY_FLAG;// Exit early if metadata can't be merged.
if(!(isCommon||isCombo)){return data;}// Use source `thisArg` if available.
if(srcBitmask&WRAP_BIND_FLAG){data[2]=source[2];// Set when currying a bound function.
newBitmask|=bitmask&WRAP_BIND_FLAG?0:WRAP_CURRY_BOUND_FLAG;}// Compose partial arguments.
var value=source[3];if(value){var partials=data[3];data[3]=partials?composeArgs(partials,value,source[4]):value;data[4]=partials?replaceHolders(data[3],PLACEHOLDER):source[4];}// Compose partial right arguments.
value=source[5];if(value){partials=data[5];data[5]=partials?composeArgsRight(partials,value,source[6]):value;data[6]=partials?replaceHolders(data[5],PLACEHOLDER):source[6];}// Use source `argPos` if available.
value=source[7];if(value){data[7]=value;}// Use source `ary` if it's smaller.
if(srcBitmask&WRAP_ARY_FLAG){data[8]=data[8]==null?source[8]:nativeMin(data[8],source[8]);}// Use source `arity` if one is not provided.
if(data[9]==null){data[9]=source[9];}// Use source `func` and merge bitmasks.
data[0]=source[0];data[1]=newBitmask;return data;}/**
     * This function is like
     * [`Object.keys`](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
     * except that it includes inherited enumerable properties.
     *
     * @private
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     */function nativeKeysIn(object){var result=[];if(object!=null){for(var key in Object(object)){result.push(key);}}return result;}/**
     * Converts `value` to a string using `Object.prototype.toString`.
     *
     * @private
     * @param {*} value The value to convert.
     * @returns {string} Returns the converted string.
     */function objectToString(value){return nativeObjectToString.call(value);}/**
     * A specialized version of `baseRest` which transforms the rest array.
     *
     * @private
     * @param {Function} func The function to apply a rest parameter to.
     * @param {number} [start=func.length-1] The start position of the rest parameter.
     * @param {Function} transform The rest array transform.
     * @returns {Function} Returns the new function.
     */function overRest(func,start,transform){start=nativeMax(start===undefined?func.length-1:start,0);return function(){var args=arguments,index=-1,length=nativeMax(args.length-start,0),array=Array(length);while(++index<length){array[index]=args[start+index];}index=-1;var otherArgs=Array(start+1);while(++index<start){otherArgs[index]=args[index];}otherArgs[start]=transform(array);return apply(func,this,otherArgs);};}/**
     * Gets the parent value at `path` of `object`.
     *
     * @private
     * @param {Object} object The object to query.
     * @param {Array} path The path to get the parent value of.
     * @returns {*} Returns the parent value.
     */function parent(object,path){return path.length<2?object:baseGet(object,baseSlice(path,0,-1));}/**
     * Reorder `array` according to the specified indexes where the element at
     * the first index is assigned as the first element, the element at
     * the second index is assigned as the second element, and so on.
     *
     * @private
     * @param {Array} array The array to reorder.
     * @param {Array} indexes The arranged array indexes.
     * @returns {Array} Returns `array`.
     */function reorder(array,indexes){var arrLength=array.length,length=nativeMin(indexes.length,arrLength),oldArray=copyArray(array);while(length--){var index=indexes[length];array[length]=isIndex(index,arrLength)?oldArray[index]:undefined;}return array;}/**
     * Sets metadata for `func`.
     *
     * **Note:** If this function becomes hot, i.e. is invoked a lot in a short
     * period of time, it will trip its breaker and transition to an identity
     * function to avoid garbage collection pauses in V8. See
     * [V8 issue 2070](https://bugs.chromium.org/p/v8/issues/detail?id=2070)
     * for more details.
     *
     * @private
     * @param {Function} func The function to associate metadata with.
     * @param {*} data The metadata.
     * @returns {Function} Returns `func`.
     */var setData=shortOut(baseSetData);/**
     * A simple wrapper around the global [`setTimeout`](https://mdn.io/setTimeout).
     *
     * @private
     * @param {Function} func The function to delay.
     * @param {number} wait The number of milliseconds to delay invocation.
     * @returns {number|Object} Returns the timer id or timeout object.
     */var setTimeout=ctxSetTimeout||function(func,wait){return root.setTimeout(func,wait);};/**
     * Sets the `toString` method of `func` to return `string`.
     *
     * @private
     * @param {Function} func The function to modify.
     * @param {Function} string The `toString` result.
     * @returns {Function} Returns `func`.
     */var setToString=shortOut(baseSetToString);/**
     * Sets the `toString` method of `wrapper` to mimic the source of `reference`
     * with wrapper details in a comment at the top of the source body.
     *
     * @private
     * @param {Function} wrapper The function to modify.
     * @param {Function} reference The reference function.
     * @param {number} bitmask The bitmask flags. See `createWrap` for more details.
     * @returns {Function} Returns `wrapper`.
     */function setWrapToString(wrapper,reference,bitmask){var source=reference+'';return setToString(wrapper,insertWrapDetails(source,updateWrapDetails(getWrapDetails(source),bitmask)));}/**
     * Creates a function that'll short out and invoke `identity` instead
     * of `func` when it's called `HOT_COUNT` or more times in `HOT_SPAN`
     * milliseconds.
     *
     * @private
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new shortable function.
     */function shortOut(func){var count=0,lastCalled=0;return function(){var stamp=nativeNow(),remaining=HOT_SPAN-(stamp-lastCalled);lastCalled=stamp;if(remaining>0){if(++count>=HOT_COUNT){return arguments[0];}}else{count=0;}return func.apply(undefined,arguments);};}/**
     * A specialized version of `_.shuffle` which mutates and sets the size of `array`.
     *
     * @private
     * @param {Array} array The array to shuffle.
     * @param {number} [size=array.length] The size of `array`.
     * @returns {Array} Returns `array`.
     */function shuffleSelf(array,size){var index=-1,length=array.length,lastIndex=length-1;size=size===undefined?length:size;while(++index<size){var rand=baseRandom(index,lastIndex),value=array[rand];array[rand]=array[index];array[index]=value;}array.length=size;return array;}/**
     * Converts `string` to a property path array.
     *
     * @private
     * @param {string} string The string to convert.
     * @returns {Array} Returns the property path array.
     */var stringToPath=memoizeCapped(function(string){var result=[];if(reLeadingDot.test(string)){result.push('');}string.replace(rePropName,function(match,number,quote,string){result.push(quote?string.replace(reEscapeChar,'$1'):number||match);});return result;});/**
     * Converts `value` to a string key if it's not a string or symbol.
     *
     * @private
     * @param {*} value The value to inspect.
     * @returns {string|symbol} Returns the key.
     */function toKey(value){if(typeof value=='string'||isSymbol(value)){return value;}var result=value+'';return result=='0'&&1/value==-INFINITY?'-0':result;}/**
     * Converts `func` to its source code.
     *
     * @private
     * @param {Function} func The function to convert.
     * @returns {string} Returns the source code.
     */function toSource(func){if(func!=null){try{return funcToString.call(func);}catch(e){}try{return func+'';}catch(e){}}return'';}/**
     * Updates wrapper `details` based on `bitmask` flags.
     *
     * @private
     * @returns {Array} details The details to modify.
     * @param {number} bitmask The bitmask flags. See `createWrap` for more details.
     * @returns {Array} Returns `details`.
     */function updateWrapDetails(details,bitmask){arrayEach(wrapFlags,function(pair){var value='_.'+pair[0];if(bitmask&pair[1]&&!arrayIncludes(details,value)){details.push(value);}});return details.sort();}/**
     * Creates a clone of `wrapper`.
     *
     * @private
     * @param {Object} wrapper The wrapper to clone.
     * @returns {Object} Returns the cloned wrapper.
     */function wrapperClone(wrapper){if(wrapper instanceof LazyWrapper){return wrapper.clone();}var result=new LodashWrapper(wrapper.__wrapped__,wrapper.__chain__);result.__actions__=copyArray(wrapper.__actions__);result.__index__=wrapper.__index__;result.__values__=wrapper.__values__;return result;}/*------------------------------------------------------------------------*//**
     * Creates an array of elements split into groups the length of `size`.
     * If `array` can't be split evenly, the final chunk will be the remaining
     * elements.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Array
     * @param {Array} array The array to process.
     * @param {number} [size=1] The length of each chunk
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {Array} Returns the new array of chunks.
     * @example
     *
     * _.chunk(['a', 'b', 'c', 'd'], 2);
     * // => [['a', 'b'], ['c', 'd']]
     *
     * _.chunk(['a', 'b', 'c', 'd'], 3);
     * // => [['a', 'b', 'c'], ['d']]
     */function chunk(array,size,guard){if(guard?isIterateeCall(array,size,guard):size===undefined){size=1;}else{size=nativeMax(toInteger(size),0);}var length=array==null?0:array.length;if(!length||size<1){return[];}var index=0,resIndex=0,result=Array(nativeCeil(length/size));while(index<length){result[resIndex++]=baseSlice(array,index,index+=size);}return result;}/**
     * Creates an array with all falsey values removed. The values `false`, `null`,
     * `0`, `""`, `undefined`, and `NaN` are falsey.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Array
     * @param {Array} array The array to compact.
     * @returns {Array} Returns the new array of filtered values.
     * @example
     *
     * _.compact([0, 1, false, 2, '', 3]);
     * // => [1, 2, 3]
     */function compact(array){var index=-1,length=array==null?0:array.length,resIndex=0,result=[];while(++index<length){var value=array[index];if(value){result[resIndex++]=value;}}return result;}/**
     * Creates a new array concatenating `array` with any additional arrays
     * and/or values.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {Array} array The array to concatenate.
     * @param {...*} [values] The values to concatenate.
     * @returns {Array} Returns the new concatenated array.
     * @example
     *
     * var array = [1];
     * var other = _.concat(array, 2, [3], [[4]]);
     *
     * console.log(other);
     * // => [1, 2, 3, [4]]
     *
     * console.log(array);
     * // => [1]
     */function concat(){var length=arguments.length;if(!length){return[];}var args=Array(length-1),array=arguments[0],index=length;while(index--){args[index-1]=arguments[index];}return arrayPush(isArray(array)?copyArray(array):[array],baseFlatten(args,1));}/**
     * Creates an array of `array` values not included in the other given arrays
     * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * for equality comparisons. The order and references of result values are
     * determined by the first array.
     *
     * **Note:** Unlike `_.pullAll`, this method returns a new array.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Array
     * @param {Array} array The array to inspect.
     * @param {...Array} [values] The values to exclude.
     * @returns {Array} Returns the new array of filtered values.
     * @see _.without, _.xor
     * @example
     *
     * _.difference([2, 1], [2, 3]);
     * // => [1]
     */var difference=baseRest(function(array,values){return isArrayLikeObject(array)?baseDifference(array,baseFlatten(values,1,isArrayLikeObject,true)):[];});/**
     * This method is like `_.difference` except that it accepts `iteratee` which
     * is invoked for each element of `array` and `values` to generate the criterion
     * by which they're compared. The order and references of result values are
     * determined by the first array. The iteratee is invoked with one argument:
     * (value).
     *
     * **Note:** Unlike `_.pullAllBy`, this method returns a new array.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {Array} array The array to inspect.
     * @param {...Array} [values] The values to exclude.
     * @param {Function} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {Array} Returns the new array of filtered values.
     * @example
     *
     * _.differenceBy([2.1, 1.2], [2.3, 3.4], Math.floor);
     * // => [1.2]
     *
     * // The `_.property` iteratee shorthand.
     * _.differenceBy([{ 'x': 2 }, { 'x': 1 }], [{ 'x': 1 }], 'x');
     * // => [{ 'x': 2 }]
     */var differenceBy=baseRest(function(array,values){var iteratee=last(values);if(isArrayLikeObject(iteratee)){iteratee=undefined;}return isArrayLikeObject(array)?baseDifference(array,baseFlatten(values,1,isArrayLikeObject,true),getIteratee(iteratee,2)):[];});/**
     * This method is like `_.difference` except that it accepts `comparator`
     * which is invoked to compare elements of `array` to `values`. The order and
     * references of result values are determined by the first array. The comparator
     * is invoked with two arguments: (arrVal, othVal).
     *
     * **Note:** Unlike `_.pullAllWith`, this method returns a new array.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {Array} array The array to inspect.
     * @param {...Array} [values] The values to exclude.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns the new array of filtered values.
     * @example
     *
     * var objects = [{ 'x': 1, 'y': 2 }, { 'x': 2, 'y': 1 }];
     *
     * _.differenceWith(objects, [{ 'x': 1, 'y': 2 }], _.isEqual);
     * // => [{ 'x': 2, 'y': 1 }]
     */var differenceWith=baseRest(function(array,values){var comparator=last(values);if(isArrayLikeObject(comparator)){comparator=undefined;}return isArrayLikeObject(array)?baseDifference(array,baseFlatten(values,1,isArrayLikeObject,true),undefined,comparator):[];});/**
     * Creates a slice of `array` with `n` elements dropped from the beginning.
     *
     * @static
     * @memberOf _
     * @since 0.5.0
     * @category Array
     * @param {Array} array The array to query.
     * @param {number} [n=1] The number of elements to drop.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * _.drop([1, 2, 3]);
     * // => [2, 3]
     *
     * _.drop([1, 2, 3], 2);
     * // => [3]
     *
     * _.drop([1, 2, 3], 5);
     * // => []
     *
     * _.drop([1, 2, 3], 0);
     * // => [1, 2, 3]
     */function drop(array,n,guard){var length=array==null?0:array.length;if(!length){return[];}n=guard||n===undefined?1:toInteger(n);return baseSlice(array,n<0?0:n,length);}/**
     * Creates a slice of `array` with `n` elements dropped from the end.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Array
     * @param {Array} array The array to query.
     * @param {number} [n=1] The number of elements to drop.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * _.dropRight([1, 2, 3]);
     * // => [1, 2]
     *
     * _.dropRight([1, 2, 3], 2);
     * // => [1]
     *
     * _.dropRight([1, 2, 3], 5);
     * // => []
     *
     * _.dropRight([1, 2, 3], 0);
     * // => [1, 2, 3]
     */function dropRight(array,n,guard){var length=array==null?0:array.length;if(!length){return[];}n=guard||n===undefined?1:toInteger(n);n=length-n;return baseSlice(array,0,n<0?0:n);}/**
     * Creates a slice of `array` excluding elements dropped from the end.
     * Elements are dropped until `predicate` returns falsey. The predicate is
     * invoked with three arguments: (value, index, array).
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Array
     * @param {Array} array The array to query.
     * @param {Function} [predicate=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * var users = [
     *   { 'user': 'barney',  'active': true },
     *   { 'user': 'fred',    'active': false },
     *   { 'user': 'pebbles', 'active': false }
     * ];
     *
     * _.dropRightWhile(users, function(o) { return !o.active; });
     * // => objects for ['barney']
     *
     * // The `_.matches` iteratee shorthand.
     * _.dropRightWhile(users, { 'user': 'pebbles', 'active': false });
     * // => objects for ['barney', 'fred']
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.dropRightWhile(users, ['active', false]);
     * // => objects for ['barney']
     *
     * // The `_.property` iteratee shorthand.
     * _.dropRightWhile(users, 'active');
     * // => objects for ['barney', 'fred', 'pebbles']
     */function dropRightWhile(array,predicate){return array&&array.length?baseWhile(array,getIteratee(predicate,3),true,true):[];}/**
     * Creates a slice of `array` excluding elements dropped from the beginning.
     * Elements are dropped until `predicate` returns falsey. The predicate is
     * invoked with three arguments: (value, index, array).
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Array
     * @param {Array} array The array to query.
     * @param {Function} [predicate=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * var users = [
     *   { 'user': 'barney',  'active': false },
     *   { 'user': 'fred',    'active': false },
     *   { 'user': 'pebbles', 'active': true }
     * ];
     *
     * _.dropWhile(users, function(o) { return !o.active; });
     * // => objects for ['pebbles']
     *
     * // The `_.matches` iteratee shorthand.
     * _.dropWhile(users, { 'user': 'barney', 'active': false });
     * // => objects for ['fred', 'pebbles']
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.dropWhile(users, ['active', false]);
     * // => objects for ['pebbles']
     *
     * // The `_.property` iteratee shorthand.
     * _.dropWhile(users, 'active');
     * // => objects for ['barney', 'fred', 'pebbles']
     */function dropWhile(array,predicate){return array&&array.length?baseWhile(array,getIteratee(predicate,3),true):[];}/**
     * Fills elements of `array` with `value` from `start` up to, but not
     * including, `end`.
     *
     * **Note:** This method mutates `array`.
     *
     * @static
     * @memberOf _
     * @since 3.2.0
     * @category Array
     * @param {Array} array The array to fill.
     * @param {*} value The value to fill `array` with.
     * @param {number} [start=0] The start position.
     * @param {number} [end=array.length] The end position.
     * @returns {Array} Returns `array`.
     * @example
     *
     * var array = [1, 2, 3];
     *
     * _.fill(array, 'a');
     * console.log(array);
     * // => ['a', 'a', 'a']
     *
     * _.fill(Array(3), 2);
     * // => [2, 2, 2]
     *
     * _.fill([4, 6, 8, 10], '*', 1, 3);
     * // => [4, '*', '*', 10]
     */function fill(array,value,start,end){var length=array==null?0:array.length;if(!length){return[];}if(start&&typeof start!='number'&&isIterateeCall(array,value,start)){start=0;end=length;}return baseFill(array,value,start,end);}/**
     * This method is like `_.find` except that it returns the index of the first
     * element `predicate` returns truthy for instead of the element itself.
     *
     * @static
     * @memberOf _
     * @since 1.1.0
     * @category Array
     * @param {Array} array The array to inspect.
     * @param {Function} [predicate=_.identity] The function invoked per iteration.
     * @param {number} [fromIndex=0] The index to search from.
     * @returns {number} Returns the index of the found element, else `-1`.
     * @example
     *
     * var users = [
     *   { 'user': 'barney',  'active': false },
     *   { 'user': 'fred',    'active': false },
     *   { 'user': 'pebbles', 'active': true }
     * ];
     *
     * _.findIndex(users, function(o) { return o.user == 'barney'; });
     * // => 0
     *
     * // The `_.matches` iteratee shorthand.
     * _.findIndex(users, { 'user': 'fred', 'active': false });
     * // => 1
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.findIndex(users, ['active', false]);
     * // => 0
     *
     * // The `_.property` iteratee shorthand.
     * _.findIndex(users, 'active');
     * // => 2
     */function findIndex(array,predicate,fromIndex){var length=array==null?0:array.length;if(!length){return-1;}var index=fromIndex==null?0:toInteger(fromIndex);if(index<0){index=nativeMax(length+index,0);}return baseFindIndex(array,getIteratee(predicate,3),index);}/**
     * This method is like `_.findIndex` except that it iterates over elements
     * of `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @since 2.0.0
     * @category Array
     * @param {Array} array The array to inspect.
     * @param {Function} [predicate=_.identity] The function invoked per iteration.
     * @param {number} [fromIndex=array.length-1] The index to search from.
     * @returns {number} Returns the index of the found element, else `-1`.
     * @example
     *
     * var users = [
     *   { 'user': 'barney',  'active': true },
     *   { 'user': 'fred',    'active': false },
     *   { 'user': 'pebbles', 'active': false }
     * ];
     *
     * _.findLastIndex(users, function(o) { return o.user == 'pebbles'; });
     * // => 2
     *
     * // The `_.matches` iteratee shorthand.
     * _.findLastIndex(users, { 'user': 'barney', 'active': true });
     * // => 0
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.findLastIndex(users, ['active', false]);
     * // => 2
     *
     * // The `_.property` iteratee shorthand.
     * _.findLastIndex(users, 'active');
     * // => 0
     */function findLastIndex(array,predicate,fromIndex){var length=array==null?0:array.length;if(!length){return-1;}var index=length-1;if(fromIndex!==undefined){index=toInteger(fromIndex);index=fromIndex<0?nativeMax(length+index,0):nativeMin(index,length-1);}return baseFindIndex(array,getIteratee(predicate,3),index,true);}/**
     * Flattens `array` a single level deep.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Array
     * @param {Array} array The array to flatten.
     * @returns {Array} Returns the new flattened array.
     * @example
     *
     * _.flatten([1, [2, [3, [4]], 5]]);
     * // => [1, 2, [3, [4]], 5]
     */function flatten(array){var length=array==null?0:array.length;return length?baseFlatten(array,1):[];}/**
     * Recursively flattens `array`.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Array
     * @param {Array} array The array to flatten.
     * @returns {Array} Returns the new flattened array.
     * @example
     *
     * _.flattenDeep([1, [2, [3, [4]], 5]]);
     * // => [1, 2, 3, 4, 5]
     */function flattenDeep(array){var length=array==null?0:array.length;return length?baseFlatten(array,INFINITY):[];}/**
     * Recursively flatten `array` up to `depth` times.
     *
     * @static
     * @memberOf _
     * @since 4.4.0
     * @category Array
     * @param {Array} array The array to flatten.
     * @param {number} [depth=1] The maximum recursion depth.
     * @returns {Array} Returns the new flattened array.
     * @example
     *
     * var array = [1, [2, [3, [4]], 5]];
     *
     * _.flattenDepth(array, 1);
     * // => [1, 2, [3, [4]], 5]
     *
     * _.flattenDepth(array, 2);
     * // => [1, 2, 3, [4], 5]
     */function flattenDepth(array,depth){var length=array==null?0:array.length;if(!length){return[];}depth=depth===undefined?1:toInteger(depth);return baseFlatten(array,depth);}/**
     * The inverse of `_.toPairs`; this method returns an object composed
     * from key-value `pairs`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {Array} pairs The key-value pairs.
     * @returns {Object} Returns the new object.
     * @example
     *
     * _.fromPairs([['a', 1], ['b', 2]]);
     * // => { 'a': 1, 'b': 2 }
     */function fromPairs(pairs){var index=-1,length=pairs==null?0:pairs.length,result={};while(++index<length){var pair=pairs[index];result[pair[0]]=pair[1];}return result;}/**
     * Gets the first element of `array`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @alias first
     * @category Array
     * @param {Array} array The array to query.
     * @returns {*} Returns the first element of `array`.
     * @example
     *
     * _.head([1, 2, 3]);
     * // => 1
     *
     * _.head([]);
     * // => undefined
     */function head(array){return array&&array.length?array[0]:undefined;}/**
     * Gets the index at which the first occurrence of `value` is found in `array`
     * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * for equality comparisons. If `fromIndex` is negative, it's used as the
     * offset from the end of `array`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Array
     * @param {Array} array The array to inspect.
     * @param {*} value The value to search for.
     * @param {number} [fromIndex=0] The index to search from.
     * @returns {number} Returns the index of the matched value, else `-1`.
     * @example
     *
     * _.indexOf([1, 2, 1, 2], 2);
     * // => 1
     *
     * // Search from the `fromIndex`.
     * _.indexOf([1, 2, 1, 2], 2, 2);
     * // => 3
     */function indexOf(array,value,fromIndex){var length=array==null?0:array.length;if(!length){return-1;}var index=fromIndex==null?0:toInteger(fromIndex);if(index<0){index=nativeMax(length+index,0);}return baseIndexOf(array,value,index);}/**
     * Gets all but the last element of `array`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Array
     * @param {Array} array The array to query.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * _.initial([1, 2, 3]);
     * // => [1, 2]
     */function initial(array){var length=array==null?0:array.length;return length?baseSlice(array,0,-1):[];}/**
     * Creates an array of unique values that are included in all given arrays
     * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * for equality comparisons. The order and references of result values are
     * determined by the first array.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Array
     * @param {...Array} [arrays] The arrays to inspect.
     * @returns {Array} Returns the new array of intersecting values.
     * @example
     *
     * _.intersection([2, 1], [2, 3]);
     * // => [2]
     */var intersection=baseRest(function(arrays){var mapped=arrayMap(arrays,castArrayLikeObject);return mapped.length&&mapped[0]===arrays[0]?baseIntersection(mapped):[];});/**
     * This method is like `_.intersection` except that it accepts `iteratee`
     * which is invoked for each element of each `arrays` to generate the criterion
     * by which they're compared. The order and references of result values are
     * determined by the first array. The iteratee is invoked with one argument:
     * (value).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {...Array} [arrays] The arrays to inspect.
     * @param {Function} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {Array} Returns the new array of intersecting values.
     * @example
     *
     * _.intersectionBy([2.1, 1.2], [2.3, 3.4], Math.floor);
     * // => [2.1]
     *
     * // The `_.property` iteratee shorthand.
     * _.intersectionBy([{ 'x': 1 }], [{ 'x': 2 }, { 'x': 1 }], 'x');
     * // => [{ 'x': 1 }]
     */var intersectionBy=baseRest(function(arrays){var iteratee=last(arrays),mapped=arrayMap(arrays,castArrayLikeObject);if(iteratee===last(mapped)){iteratee=undefined;}else{mapped.pop();}return mapped.length&&mapped[0]===arrays[0]?baseIntersection(mapped,getIteratee(iteratee,2)):[];});/**
     * This method is like `_.intersection` except that it accepts `comparator`
     * which is invoked to compare elements of `arrays`. The order and references
     * of result values are determined by the first array. The comparator is
     * invoked with two arguments: (arrVal, othVal).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {...Array} [arrays] The arrays to inspect.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns the new array of intersecting values.
     * @example
     *
     * var objects = [{ 'x': 1, 'y': 2 }, { 'x': 2, 'y': 1 }];
     * var others = [{ 'x': 1, 'y': 1 }, { 'x': 1, 'y': 2 }];
     *
     * _.intersectionWith(objects, others, _.isEqual);
     * // => [{ 'x': 1, 'y': 2 }]
     */var intersectionWith=baseRest(function(arrays){var comparator=last(arrays),mapped=arrayMap(arrays,castArrayLikeObject);comparator=typeof comparator=='function'?comparator:undefined;if(comparator){mapped.pop();}return mapped.length&&mapped[0]===arrays[0]?baseIntersection(mapped,undefined,comparator):[];});/**
     * Converts all elements in `array` into a string separated by `separator`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {Array} array The array to convert.
     * @param {string} [separator=','] The element separator.
     * @returns {string} Returns the joined string.
     * @example
     *
     * _.join(['a', 'b', 'c'], '~');
     * // => 'a~b~c'
     */function join(array,separator){return array==null?'':nativeJoin.call(array,separator);}/**
     * Gets the last element of `array`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Array
     * @param {Array} array The array to query.
     * @returns {*} Returns the last element of `array`.
     * @example
     *
     * _.last([1, 2, 3]);
     * // => 3
     */function last(array){var length=array==null?0:array.length;return length?array[length-1]:undefined;}/**
     * This method is like `_.indexOf` except that it iterates over elements of
     * `array` from right to left.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Array
     * @param {Array} array The array to inspect.
     * @param {*} value The value to search for.
     * @param {number} [fromIndex=array.length-1] The index to search from.
     * @returns {number} Returns the index of the matched value, else `-1`.
     * @example
     *
     * _.lastIndexOf([1, 2, 1, 2], 2);
     * // => 3
     *
     * // Search from the `fromIndex`.
     * _.lastIndexOf([1, 2, 1, 2], 2, 2);
     * // => 1
     */function lastIndexOf(array,value,fromIndex){var length=array==null?0:array.length;if(!length){return-1;}var index=length;if(fromIndex!==undefined){index=toInteger(fromIndex);index=index<0?nativeMax(length+index,0):nativeMin(index,length-1);}return value===value?strictLastIndexOf(array,value,index):baseFindIndex(array,baseIsNaN,index,true);}/**
     * Gets the element at index `n` of `array`. If `n` is negative, the nth
     * element from the end is returned.
     *
     * @static
     * @memberOf _
     * @since 4.11.0
     * @category Array
     * @param {Array} array The array to query.
     * @param {number} [n=0] The index of the element to return.
     * @returns {*} Returns the nth element of `array`.
     * @example
     *
     * var array = ['a', 'b', 'c', 'd'];
     *
     * _.nth(array, 1);
     * // => 'b'
     *
     * _.nth(array, -2);
     * // => 'c';
     */function nth(array,n){return array&&array.length?baseNth(array,toInteger(n)):undefined;}/**
     * Removes all given values from `array` using
     * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * for equality comparisons.
     *
     * **Note:** Unlike `_.without`, this method mutates `array`. Use `_.remove`
     * to remove elements from an array by predicate.
     *
     * @static
     * @memberOf _
     * @since 2.0.0
     * @category Array
     * @param {Array} array The array to modify.
     * @param {...*} [values] The values to remove.
     * @returns {Array} Returns `array`.
     * @example
     *
     * var array = ['a', 'b', 'c', 'a', 'b', 'c'];
     *
     * _.pull(array, 'a', 'c');
     * console.log(array);
     * // => ['b', 'b']
     */var pull=baseRest(pullAll);/**
     * This method is like `_.pull` except that it accepts an array of values to remove.
     *
     * **Note:** Unlike `_.difference`, this method mutates `array`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {Array} array The array to modify.
     * @param {Array} values The values to remove.
     * @returns {Array} Returns `array`.
     * @example
     *
     * var array = ['a', 'b', 'c', 'a', 'b', 'c'];
     *
     * _.pullAll(array, ['a', 'c']);
     * console.log(array);
     * // => ['b', 'b']
     */function pullAll(array,values){return array&&array.length&&values&&values.length?basePullAll(array,values):array;}/**
     * This method is like `_.pullAll` except that it accepts `iteratee` which is
     * invoked for each element of `array` and `values` to generate the criterion
     * by which they're compared. The iteratee is invoked with one argument: (value).
     *
     * **Note:** Unlike `_.differenceBy`, this method mutates `array`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {Array} array The array to modify.
     * @param {Array} values The values to remove.
     * @param {Function} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {Array} Returns `array`.
     * @example
     *
     * var array = [{ 'x': 1 }, { 'x': 2 }, { 'x': 3 }, { 'x': 1 }];
     *
     * _.pullAllBy(array, [{ 'x': 1 }, { 'x': 3 }], 'x');
     * console.log(array);
     * // => [{ 'x': 2 }]
     */function pullAllBy(array,values,iteratee){return array&&array.length&&values&&values.length?basePullAll(array,values,getIteratee(iteratee,2)):array;}/**
     * This method is like `_.pullAll` except that it accepts `comparator` which
     * is invoked to compare elements of `array` to `values`. The comparator is
     * invoked with two arguments: (arrVal, othVal).
     *
     * **Note:** Unlike `_.differenceWith`, this method mutates `array`.
     *
     * @static
     * @memberOf _
     * @since 4.6.0
     * @category Array
     * @param {Array} array The array to modify.
     * @param {Array} values The values to remove.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns `array`.
     * @example
     *
     * var array = [{ 'x': 1, 'y': 2 }, { 'x': 3, 'y': 4 }, { 'x': 5, 'y': 6 }];
     *
     * _.pullAllWith(array, [{ 'x': 3, 'y': 4 }], _.isEqual);
     * console.log(array);
     * // => [{ 'x': 1, 'y': 2 }, { 'x': 5, 'y': 6 }]
     */function pullAllWith(array,values,comparator){return array&&array.length&&values&&values.length?basePullAll(array,values,undefined,comparator):array;}/**
     * Removes elements from `array` corresponding to `indexes` and returns an
     * array of removed elements.
     *
     * **Note:** Unlike `_.at`, this method mutates `array`.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Array
     * @param {Array} array The array to modify.
     * @param {...(number|number[])} [indexes] The indexes of elements to remove.
     * @returns {Array} Returns the new array of removed elements.
     * @example
     *
     * var array = ['a', 'b', 'c', 'd'];
     * var pulled = _.pullAt(array, [1, 3]);
     *
     * console.log(array);
     * // => ['a', 'c']
     *
     * console.log(pulled);
     * // => ['b', 'd']
     */var pullAt=flatRest(function(array,indexes){var length=array==null?0:array.length,result=baseAt(array,indexes);basePullAt(array,arrayMap(indexes,function(index){return isIndex(index,length)?+index:index;}).sort(compareAscending));return result;});/**
     * Removes all elements from `array` that `predicate` returns truthy for
     * and returns an array of the removed elements. The predicate is invoked
     * with three arguments: (value, index, array).
     *
     * **Note:** Unlike `_.filter`, this method mutates `array`. Use `_.pull`
     * to pull elements from an array by value.
     *
     * @static
     * @memberOf _
     * @since 2.0.0
     * @category Array
     * @param {Array} array The array to modify.
     * @param {Function} [predicate=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the new array of removed elements.
     * @example
     *
     * var array = [1, 2, 3, 4];
     * var evens = _.remove(array, function(n) {
     *   return n % 2 == 0;
     * });
     *
     * console.log(array);
     * // => [1, 3]
     *
     * console.log(evens);
     * // => [2, 4]
     */function remove(array,predicate){var result=[];if(!(array&&array.length)){return result;}var index=-1,indexes=[],length=array.length;predicate=getIteratee(predicate,3);while(++index<length){var value=array[index];if(predicate(value,index,array)){result.push(value);indexes.push(index);}}basePullAt(array,indexes);return result;}/**
     * Reverses `array` so that the first element becomes the last, the second
     * element becomes the second to last, and so on.
     *
     * **Note:** This method mutates `array` and is based on
     * [`Array#reverse`](https://mdn.io/Array/reverse).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {Array} array The array to modify.
     * @returns {Array} Returns `array`.
     * @example
     *
     * var array = [1, 2, 3];
     *
     * _.reverse(array);
     * // => [3, 2, 1]
     *
     * console.log(array);
     * // => [3, 2, 1]
     */function reverse(array){return array==null?array:nativeReverse.call(array);}/**
     * Creates a slice of `array` from `start` up to, but not including, `end`.
     *
     * **Note:** This method is used instead of
     * [`Array#slice`](https://mdn.io/Array/slice) to ensure dense arrays are
     * returned.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Array
     * @param {Array} array The array to slice.
     * @param {number} [start=0] The start position.
     * @param {number} [end=array.length] The end position.
     * @returns {Array} Returns the slice of `array`.
     */function slice(array,start,end){var length=array==null?0:array.length;if(!length){return[];}if(end&&typeof end!='number'&&isIterateeCall(array,start,end)){start=0;end=length;}else{start=start==null?0:toInteger(start);end=end===undefined?length:toInteger(end);}return baseSlice(array,start,end);}/**
     * Uses a binary search to determine the lowest index at which `value`
     * should be inserted into `array` in order to maintain its sort order.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Array
     * @param {Array} array The sorted array to inspect.
     * @param {*} value The value to evaluate.
     * @returns {number} Returns the index at which `value` should be inserted
     *  into `array`.
     * @example
     *
     * _.sortedIndex([30, 50], 40);
     * // => 1
     */function sortedIndex(array,value){return baseSortedIndex(array,value);}/**
     * This method is like `_.sortedIndex` except that it accepts `iteratee`
     * which is invoked for `value` and each element of `array` to compute their
     * sort ranking. The iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {Array} array The sorted array to inspect.
     * @param {*} value The value to evaluate.
     * @param {Function} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {number} Returns the index at which `value` should be inserted
     *  into `array`.
     * @example
     *
     * var objects = [{ 'x': 4 }, { 'x': 5 }];
     *
     * _.sortedIndexBy(objects, { 'x': 4 }, function(o) { return o.x; });
     * // => 0
     *
     * // The `_.property` iteratee shorthand.
     * _.sortedIndexBy(objects, { 'x': 4 }, 'x');
     * // => 0
     */function sortedIndexBy(array,value,iteratee){return baseSortedIndexBy(array,value,getIteratee(iteratee,2));}/**
     * This method is like `_.indexOf` except that it performs a binary
     * search on a sorted `array`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {Array} array The array to inspect.
     * @param {*} value The value to search for.
     * @returns {number} Returns the index of the matched value, else `-1`.
     * @example
     *
     * _.sortedIndexOf([4, 5, 5, 5, 6], 5);
     * // => 1
     */function sortedIndexOf(array,value){var length=array==null?0:array.length;if(length){var index=baseSortedIndex(array,value);if(index<length&&eq(array[index],value)){return index;}}return-1;}/**
     * This method is like `_.sortedIndex` except that it returns the highest
     * index at which `value` should be inserted into `array` in order to
     * maintain its sort order.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Array
     * @param {Array} array The sorted array to inspect.
     * @param {*} value The value to evaluate.
     * @returns {number} Returns the index at which `value` should be inserted
     *  into `array`.
     * @example
     *
     * _.sortedLastIndex([4, 5, 5, 5, 6], 5);
     * // => 4
     */function sortedLastIndex(array,value){return baseSortedIndex(array,value,true);}/**
     * This method is like `_.sortedLastIndex` except that it accepts `iteratee`
     * which is invoked for `value` and each element of `array` to compute their
     * sort ranking. The iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {Array} array The sorted array to inspect.
     * @param {*} value The value to evaluate.
     * @param {Function} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {number} Returns the index at which `value` should be inserted
     *  into `array`.
     * @example
     *
     * var objects = [{ 'x': 4 }, { 'x': 5 }];
     *
     * _.sortedLastIndexBy(objects, { 'x': 4 }, function(o) { return o.x; });
     * // => 1
     *
     * // The `_.property` iteratee shorthand.
     * _.sortedLastIndexBy(objects, { 'x': 4 }, 'x');
     * // => 1
     */function sortedLastIndexBy(array,value,iteratee){return baseSortedIndexBy(array,value,getIteratee(iteratee,2),true);}/**
     * This method is like `_.lastIndexOf` except that it performs a binary
     * search on a sorted `array`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {Array} array The array to inspect.
     * @param {*} value The value to search for.
     * @returns {number} Returns the index of the matched value, else `-1`.
     * @example
     *
     * _.sortedLastIndexOf([4, 5, 5, 5, 6], 5);
     * // => 3
     */function sortedLastIndexOf(array,value){var length=array==null?0:array.length;if(length){var index=baseSortedIndex(array,value,true)-1;if(eq(array[index],value)){return index;}}return-1;}/**
     * This method is like `_.uniq` except that it's designed and optimized
     * for sorted arrays.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {Array} array The array to inspect.
     * @returns {Array} Returns the new duplicate free array.
     * @example
     *
     * _.sortedUniq([1, 1, 2]);
     * // => [1, 2]
     */function sortedUniq(array){return array&&array.length?baseSortedUniq(array):[];}/**
     * This method is like `_.uniqBy` except that it's designed and optimized
     * for sorted arrays.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {Array} array The array to inspect.
     * @param {Function} [iteratee] The iteratee invoked per element.
     * @returns {Array} Returns the new duplicate free array.
     * @example
     *
     * _.sortedUniqBy([1.1, 1.2, 2.3, 2.4], Math.floor);
     * // => [1.1, 2.3]
     */function sortedUniqBy(array,iteratee){return array&&array.length?baseSortedUniq(array,getIteratee(iteratee,2)):[];}/**
     * Gets all but the first element of `array`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {Array} array The array to query.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * _.tail([1, 2, 3]);
     * // => [2, 3]
     */function tail(array){var length=array==null?0:array.length;return length?baseSlice(array,1,length):[];}/**
     * Creates a slice of `array` with `n` elements taken from the beginning.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Array
     * @param {Array} array The array to query.
     * @param {number} [n=1] The number of elements to take.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * _.take([1, 2, 3]);
     * // => [1]
     *
     * _.take([1, 2, 3], 2);
     * // => [1, 2]
     *
     * _.take([1, 2, 3], 5);
     * // => [1, 2, 3]
     *
     * _.take([1, 2, 3], 0);
     * // => []
     */function take(array,n,guard){if(!(array&&array.length)){return[];}n=guard||n===undefined?1:toInteger(n);return baseSlice(array,0,n<0?0:n);}/**
     * Creates a slice of `array` with `n` elements taken from the end.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Array
     * @param {Array} array The array to query.
     * @param {number} [n=1] The number of elements to take.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * _.takeRight([1, 2, 3]);
     * // => [3]
     *
     * _.takeRight([1, 2, 3], 2);
     * // => [2, 3]
     *
     * _.takeRight([1, 2, 3], 5);
     * // => [1, 2, 3]
     *
     * _.takeRight([1, 2, 3], 0);
     * // => []
     */function takeRight(array,n,guard){var length=array==null?0:array.length;if(!length){return[];}n=guard||n===undefined?1:toInteger(n);n=length-n;return baseSlice(array,n<0?0:n,length);}/**
     * Creates a slice of `array` with elements taken from the end. Elements are
     * taken until `predicate` returns falsey. The predicate is invoked with
     * three arguments: (value, index, array).
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Array
     * @param {Array} array The array to query.
     * @param {Function} [predicate=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * var users = [
     *   { 'user': 'barney',  'active': true },
     *   { 'user': 'fred',    'active': false },
     *   { 'user': 'pebbles', 'active': false }
     * ];
     *
     * _.takeRightWhile(users, function(o) { return !o.active; });
     * // => objects for ['fred', 'pebbles']
     *
     * // The `_.matches` iteratee shorthand.
     * _.takeRightWhile(users, { 'user': 'pebbles', 'active': false });
     * // => objects for ['pebbles']
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.takeRightWhile(users, ['active', false]);
     * // => objects for ['fred', 'pebbles']
     *
     * // The `_.property` iteratee shorthand.
     * _.takeRightWhile(users, 'active');
     * // => []
     */function takeRightWhile(array,predicate){return array&&array.length?baseWhile(array,getIteratee(predicate,3),false,true):[];}/**
     * Creates a slice of `array` with elements taken from the beginning. Elements
     * are taken until `predicate` returns falsey. The predicate is invoked with
     * three arguments: (value, index, array).
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Array
     * @param {Array} array The array to query.
     * @param {Function} [predicate=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the slice of `array`.
     * @example
     *
     * var users = [
     *   { 'user': 'barney',  'active': false },
     *   { 'user': 'fred',    'active': false },
     *   { 'user': 'pebbles', 'active': true }
     * ];
     *
     * _.takeWhile(users, function(o) { return !o.active; });
     * // => objects for ['barney', 'fred']
     *
     * // The `_.matches` iteratee shorthand.
     * _.takeWhile(users, { 'user': 'barney', 'active': false });
     * // => objects for ['barney']
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.takeWhile(users, ['active', false]);
     * // => objects for ['barney', 'fred']
     *
     * // The `_.property` iteratee shorthand.
     * _.takeWhile(users, 'active');
     * // => []
     */function takeWhile(array,predicate){return array&&array.length?baseWhile(array,getIteratee(predicate,3)):[];}/**
     * Creates an array of unique values, in order, from all given arrays using
     * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * for equality comparisons.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Array
     * @param {...Array} [arrays] The arrays to inspect.
     * @returns {Array} Returns the new array of combined values.
     * @example
     *
     * _.union([2], [1, 2]);
     * // => [2, 1]
     */var union=baseRest(function(arrays){return baseUniq(baseFlatten(arrays,1,isArrayLikeObject,true));});/**
     * This method is like `_.union` except that it accepts `iteratee` which is
     * invoked for each element of each `arrays` to generate the criterion by
     * which uniqueness is computed. Result values are chosen from the first
     * array in which the value occurs. The iteratee is invoked with one argument:
     * (value).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {...Array} [arrays] The arrays to inspect.
     * @param {Function} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {Array} Returns the new array of combined values.
     * @example
     *
     * _.unionBy([2.1], [1.2, 2.3], Math.floor);
     * // => [2.1, 1.2]
     *
     * // The `_.property` iteratee shorthand.
     * _.unionBy([{ 'x': 1 }], [{ 'x': 2 }, { 'x': 1 }], 'x');
     * // => [{ 'x': 1 }, { 'x': 2 }]
     */var unionBy=baseRest(function(arrays){var iteratee=last(arrays);if(isArrayLikeObject(iteratee)){iteratee=undefined;}return baseUniq(baseFlatten(arrays,1,isArrayLikeObject,true),getIteratee(iteratee,2));});/**
     * This method is like `_.union` except that it accepts `comparator` which
     * is invoked to compare elements of `arrays`. Result values are chosen from
     * the first array in which the value occurs. The comparator is invoked
     * with two arguments: (arrVal, othVal).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {...Array} [arrays] The arrays to inspect.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns the new array of combined values.
     * @example
     *
     * var objects = [{ 'x': 1, 'y': 2 }, { 'x': 2, 'y': 1 }];
     * var others = [{ 'x': 1, 'y': 1 }, { 'x': 1, 'y': 2 }];
     *
     * _.unionWith(objects, others, _.isEqual);
     * // => [{ 'x': 1, 'y': 2 }, { 'x': 2, 'y': 1 }, { 'x': 1, 'y': 1 }]
     */var unionWith=baseRest(function(arrays){var comparator=last(arrays);comparator=typeof comparator=='function'?comparator:undefined;return baseUniq(baseFlatten(arrays,1,isArrayLikeObject,true),undefined,comparator);});/**
     * Creates a duplicate-free version of an array, using
     * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * for equality comparisons, in which only the first occurrence of each element
     * is kept. The order of result values is determined by the order they occur
     * in the array.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Array
     * @param {Array} array The array to inspect.
     * @returns {Array} Returns the new duplicate free array.
     * @example
     *
     * _.uniq([2, 1, 2]);
     * // => [2, 1]
     */function uniq(array){return array&&array.length?baseUniq(array):[];}/**
     * This method is like `_.uniq` except that it accepts `iteratee` which is
     * invoked for each element in `array` to generate the criterion by which
     * uniqueness is computed. The order of result values is determined by the
     * order they occur in the array. The iteratee is invoked with one argument:
     * (value).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {Array} array The array to inspect.
     * @param {Function} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {Array} Returns the new duplicate free array.
     * @example
     *
     * _.uniqBy([2.1, 1.2, 2.3], Math.floor);
     * // => [2.1, 1.2]
     *
     * // The `_.property` iteratee shorthand.
     * _.uniqBy([{ 'x': 1 }, { 'x': 2 }, { 'x': 1 }], 'x');
     * // => [{ 'x': 1 }, { 'x': 2 }]
     */function uniqBy(array,iteratee){return array&&array.length?baseUniq(array,getIteratee(iteratee,2)):[];}/**
     * This method is like `_.uniq` except that it accepts `comparator` which
     * is invoked to compare elements of `array`. The order of result values is
     * determined by the order they occur in the array.The comparator is invoked
     * with two arguments: (arrVal, othVal).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {Array} array The array to inspect.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns the new duplicate free array.
     * @example
     *
     * var objects = [{ 'x': 1, 'y': 2 }, { 'x': 2, 'y': 1 }, { 'x': 1, 'y': 2 }];
     *
     * _.uniqWith(objects, _.isEqual);
     * // => [{ 'x': 1, 'y': 2 }, { 'x': 2, 'y': 1 }]
     */function uniqWith(array,comparator){comparator=typeof comparator=='function'?comparator:undefined;return array&&array.length?baseUniq(array,undefined,comparator):[];}/**
     * This method is like `_.zip` except that it accepts an array of grouped
     * elements and creates an array regrouping the elements to their pre-zip
     * configuration.
     *
     * @static
     * @memberOf _
     * @since 1.2.0
     * @category Array
     * @param {Array} array The array of grouped elements to process.
     * @returns {Array} Returns the new array of regrouped elements.
     * @example
     *
     * var zipped = _.zip(['a', 'b'], [1, 2], [true, false]);
     * // => [['a', 1, true], ['b', 2, false]]
     *
     * _.unzip(zipped);
     * // => [['a', 'b'], [1, 2], [true, false]]
     */function unzip(array){if(!(array&&array.length)){return[];}var length=0;array=arrayFilter(array,function(group){if(isArrayLikeObject(group)){length=nativeMax(group.length,length);return true;}});return baseTimes(length,function(index){return arrayMap(array,baseProperty(index));});}/**
     * This method is like `_.unzip` except that it accepts `iteratee` to specify
     * how regrouped values should be combined. The iteratee is invoked with the
     * elements of each group: (...group).
     *
     * @static
     * @memberOf _
     * @since 3.8.0
     * @category Array
     * @param {Array} array The array of grouped elements to process.
     * @param {Function} [iteratee=_.identity] The function to combine
     *  regrouped values.
     * @returns {Array} Returns the new array of regrouped elements.
     * @example
     *
     * var zipped = _.zip([1, 2], [10, 20], [100, 200]);
     * // => [[1, 10, 100], [2, 20, 200]]
     *
     * _.unzipWith(zipped, _.add);
     * // => [3, 30, 300]
     */function unzipWith(array,iteratee){if(!(array&&array.length)){return[];}var result=unzip(array);if(iteratee==null){return result;}return arrayMap(result,function(group){return apply(iteratee,undefined,group);});}/**
     * Creates an array excluding all given values using
     * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * for equality comparisons.
     *
     * **Note:** Unlike `_.pull`, this method returns a new array.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Array
     * @param {Array} array The array to inspect.
     * @param {...*} [values] The values to exclude.
     * @returns {Array} Returns the new array of filtered values.
     * @see _.difference, _.xor
     * @example
     *
     * _.without([2, 1, 2, 3], 1, 2);
     * // => [3]
     */var without=baseRest(function(array,values){return isArrayLikeObject(array)?baseDifference(array,values):[];});/**
     * Creates an array of unique values that is the
     * [symmetric difference](https://en.wikipedia.org/wiki/Symmetric_difference)
     * of the given arrays. The order of result values is determined by the order
     * they occur in the arrays.
     *
     * @static
     * @memberOf _
     * @since 2.4.0
     * @category Array
     * @param {...Array} [arrays] The arrays to inspect.
     * @returns {Array} Returns the new array of filtered values.
     * @see _.difference, _.without
     * @example
     *
     * _.xor([2, 1], [2, 3]);
     * // => [1, 3]
     */var xor=baseRest(function(arrays){return baseXor(arrayFilter(arrays,isArrayLikeObject));});/**
     * This method is like `_.xor` except that it accepts `iteratee` which is
     * invoked for each element of each `arrays` to generate the criterion by
     * which by which they're compared. The order of result values is determined
     * by the order they occur in the arrays. The iteratee is invoked with one
     * argument: (value).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {...Array} [arrays] The arrays to inspect.
     * @param {Function} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {Array} Returns the new array of filtered values.
     * @example
     *
     * _.xorBy([2.1, 1.2], [2.3, 3.4], Math.floor);
     * // => [1.2, 3.4]
     *
     * // The `_.property` iteratee shorthand.
     * _.xorBy([{ 'x': 1 }], [{ 'x': 2 }, { 'x': 1 }], 'x');
     * // => [{ 'x': 2 }]
     */var xorBy=baseRest(function(arrays){var iteratee=last(arrays);if(isArrayLikeObject(iteratee)){iteratee=undefined;}return baseXor(arrayFilter(arrays,isArrayLikeObject),getIteratee(iteratee,2));});/**
     * This method is like `_.xor` except that it accepts `comparator` which is
     * invoked to compare elements of `arrays`. The order of result values is
     * determined by the order they occur in the arrays. The comparator is invoked
     * with two arguments: (arrVal, othVal).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Array
     * @param {...Array} [arrays] The arrays to inspect.
     * @param {Function} [comparator] The comparator invoked per element.
     * @returns {Array} Returns the new array of filtered values.
     * @example
     *
     * var objects = [{ 'x': 1, 'y': 2 }, { 'x': 2, 'y': 1 }];
     * var others = [{ 'x': 1, 'y': 1 }, { 'x': 1, 'y': 2 }];
     *
     * _.xorWith(objects, others, _.isEqual);
     * // => [{ 'x': 2, 'y': 1 }, { 'x': 1, 'y': 1 }]
     */var xorWith=baseRest(function(arrays){var comparator=last(arrays);comparator=typeof comparator=='function'?comparator:undefined;return baseXor(arrayFilter(arrays,isArrayLikeObject),undefined,comparator);});/**
     * Creates an array of grouped elements, the first of which contains the
     * first elements of the given arrays, the second of which contains the
     * second elements of the given arrays, and so on.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Array
     * @param {...Array} [arrays] The arrays to process.
     * @returns {Array} Returns the new array of grouped elements.
     * @example
     *
     * _.zip(['a', 'b'], [1, 2], [true, false]);
     * // => [['a', 1, true], ['b', 2, false]]
     */var zip=baseRest(unzip);/**
     * This method is like `_.fromPairs` except that it accepts two arrays,
     * one of property identifiers and one of corresponding values.
     *
     * @static
     * @memberOf _
     * @since 0.4.0
     * @category Array
     * @param {Array} [props=[]] The property identifiers.
     * @param {Array} [values=[]] The property values.
     * @returns {Object} Returns the new object.
     * @example
     *
     * _.zipObject(['a', 'b'], [1, 2]);
     * // => { 'a': 1, 'b': 2 }
     */function zipObject(props,values){return baseZipObject(props||[],values||[],assignValue);}/**
     * This method is like `_.zipObject` except that it supports property paths.
     *
     * @static
     * @memberOf _
     * @since 4.1.0
     * @category Array
     * @param {Array} [props=[]] The property identifiers.
     * @param {Array} [values=[]] The property values.
     * @returns {Object} Returns the new object.
     * @example
     *
     * _.zipObjectDeep(['a.b[0].c', 'a.b[1].d'], [1, 2]);
     * // => { 'a': { 'b': [{ 'c': 1 }, { 'd': 2 }] } }
     */function zipObjectDeep(props,values){return baseZipObject(props||[],values||[],baseSet);}/**
     * This method is like `_.zip` except that it accepts `iteratee` to specify
     * how grouped values should be combined. The iteratee is invoked with the
     * elements of each group: (...group).
     *
     * @static
     * @memberOf _
     * @since 3.8.0
     * @category Array
     * @param {...Array} [arrays] The arrays to process.
     * @param {Function} [iteratee=_.identity] The function to combine
     *  grouped values.
     * @returns {Array} Returns the new array of grouped elements.
     * @example
     *
     * _.zipWith([1, 2], [10, 20], [100, 200], function(a, b, c) {
     *   return a + b + c;
     * });
     * // => [111, 222]
     */var zipWith=baseRest(function(arrays){var length=arrays.length,iteratee=length>1?arrays[length-1]:undefined;iteratee=typeof iteratee=='function'?(arrays.pop(),iteratee):undefined;return unzipWith(arrays,iteratee);});/*------------------------------------------------------------------------*//**
     * Creates a `lodash` wrapper instance that wraps `value` with explicit method
     * chain sequences enabled. The result of such sequences must be unwrapped
     * with `_#value`.
     *
     * @static
     * @memberOf _
     * @since 1.3.0
     * @category Seq
     * @param {*} value The value to wrap.
     * @returns {Object} Returns the new `lodash` wrapper instance.
     * @example
     *
     * var users = [
     *   { 'user': 'barney',  'age': 36 },
     *   { 'user': 'fred',    'age': 40 },
     *   { 'user': 'pebbles', 'age': 1 }
     * ];
     *
     * var youngest = _
     *   .chain(users)
     *   .sortBy('age')
     *   .map(function(o) {
     *     return o.user + ' is ' + o.age;
     *   })
     *   .head()
     *   .value();
     * // => 'pebbles is 1'
     */function chain(value){var result=lodash(value);result.__chain__=true;return result;}/**
     * This method invokes `interceptor` and returns `value`. The interceptor
     * is invoked with one argument; (value). The purpose of this method is to
     * "tap into" a method chain sequence in order to modify intermediate results.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Seq
     * @param {*} value The value to provide to `interceptor`.
     * @param {Function} interceptor The function to invoke.
     * @returns {*} Returns `value`.
     * @example
     *
     * _([1, 2, 3])
     *  .tap(function(array) {
     *    // Mutate input array.
     *    array.pop();
     *  })
     *  .reverse()
     *  .value();
     * // => [2, 1]
     */function tap(value,interceptor){interceptor(value);return value;}/**
     * This method is like `_.tap` except that it returns the result of `interceptor`.
     * The purpose of this method is to "pass thru" values replacing intermediate
     * results in a method chain sequence.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Seq
     * @param {*} value The value to provide to `interceptor`.
     * @param {Function} interceptor The function to invoke.
     * @returns {*} Returns the result of `interceptor`.
     * @example
     *
     * _('  abc  ')
     *  .chain()
     *  .trim()
     *  .thru(function(value) {
     *    return [value];
     *  })
     *  .value();
     * // => ['abc']
     */function thru(value,interceptor){return interceptor(value);}/**
     * This method is the wrapper version of `_.at`.
     *
     * @name at
     * @memberOf _
     * @since 1.0.0
     * @category Seq
     * @param {...(string|string[])} [paths] The property paths to pick.
     * @returns {Object} Returns the new `lodash` wrapper instance.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c': 3 } }, 4] };
     *
     * _(object).at(['a[0].b.c', 'a[1]']).value();
     * // => [3, 4]
     */var wrapperAt=flatRest(function(paths){var length=paths.length,start=length?paths[0]:0,value=this.__wrapped__,interceptor=function interceptor(object){return baseAt(object,paths);};if(length>1||this.__actions__.length||!(value instanceof LazyWrapper)||!isIndex(start)){return this.thru(interceptor);}value=value.slice(start,+start+(length?1:0));value.__actions__.push({'func':thru,'args':[interceptor],'thisArg':undefined});return new LodashWrapper(value,this.__chain__).thru(function(array){if(length&&!array.length){array.push(undefined);}return array;});});/**
     * Creates a `lodash` wrapper instance with explicit method chain sequences enabled.
     *
     * @name chain
     * @memberOf _
     * @since 0.1.0
     * @category Seq
     * @returns {Object} Returns the new `lodash` wrapper instance.
     * @example
     *
     * var users = [
     *   { 'user': 'barney', 'age': 36 },
     *   { 'user': 'fred',   'age': 40 }
     * ];
     *
     * // A sequence without explicit chaining.
     * _(users).head();
     * // => { 'user': 'barney', 'age': 36 }
     *
     * // A sequence with explicit chaining.
     * _(users)
     *   .chain()
     *   .head()
     *   .pick('user')
     *   .value();
     * // => { 'user': 'barney' }
     */function wrapperChain(){return chain(this);}/**
     * Executes the chain sequence and returns the wrapped result.
     *
     * @name commit
     * @memberOf _
     * @since 3.2.0
     * @category Seq
     * @returns {Object} Returns the new `lodash` wrapper instance.
     * @example
     *
     * var array = [1, 2];
     * var wrapped = _(array).push(3);
     *
     * console.log(array);
     * // => [1, 2]
     *
     * wrapped = wrapped.commit();
     * console.log(array);
     * // => [1, 2, 3]
     *
     * wrapped.last();
     * // => 3
     *
     * console.log(array);
     * // => [1, 2, 3]
     */function wrapperCommit(){return new LodashWrapper(this.value(),this.__chain__);}/**
     * Gets the next value on a wrapped object following the
     * [iterator protocol](https://mdn.io/iteration_protocols#iterator).
     *
     * @name next
     * @memberOf _
     * @since 4.0.0
     * @category Seq
     * @returns {Object} Returns the next iterator value.
     * @example
     *
     * var wrapped = _([1, 2]);
     *
     * wrapped.next();
     * // => { 'done': false, 'value': 1 }
     *
     * wrapped.next();
     * // => { 'done': false, 'value': 2 }
     *
     * wrapped.next();
     * // => { 'done': true, 'value': undefined }
     */function wrapperNext(){if(this.__values__===undefined){this.__values__=toArray(this.value());}var done=this.__index__>=this.__values__.length,value=done?undefined:this.__values__[this.__index__++];return{'done':done,'value':value};}/**
     * Enables the wrapper to be iterable.
     *
     * @name Symbol.iterator
     * @memberOf _
     * @since 4.0.0
     * @category Seq
     * @returns {Object} Returns the wrapper object.
     * @example
     *
     * var wrapped = _([1, 2]);
     *
     * wrapped[Symbol.iterator]() === wrapped;
     * // => true
     *
     * Array.from(wrapped);
     * // => [1, 2]
     */function wrapperToIterator(){return this;}/**
     * Creates a clone of the chain sequence planting `value` as the wrapped value.
     *
     * @name plant
     * @memberOf _
     * @since 3.2.0
     * @category Seq
     * @param {*} value The value to plant.
     * @returns {Object} Returns the new `lodash` wrapper instance.
     * @example
     *
     * function square(n) {
     *   return n * n;
     * }
     *
     * var wrapped = _([1, 2]).map(square);
     * var other = wrapped.plant([3, 4]);
     *
     * other.value();
     * // => [9, 16]
     *
     * wrapped.value();
     * // => [1, 4]
     */function wrapperPlant(value){var result,parent=this;while(parent instanceof baseLodash){var clone=wrapperClone(parent);clone.__index__=0;clone.__values__=undefined;if(result){previous.__wrapped__=clone;}else{result=clone;}var previous=clone;parent=parent.__wrapped__;}previous.__wrapped__=value;return result;}/**
     * This method is the wrapper version of `_.reverse`.
     *
     * **Note:** This method mutates the wrapped array.
     *
     * @name reverse
     * @memberOf _
     * @since 0.1.0
     * @category Seq
     * @returns {Object} Returns the new `lodash` wrapper instance.
     * @example
     *
     * var array = [1, 2, 3];
     *
     * _(array).reverse().value()
     * // => [3, 2, 1]
     *
     * console.log(array);
     * // => [3, 2, 1]
     */function wrapperReverse(){var value=this.__wrapped__;if(value instanceof LazyWrapper){var wrapped=value;if(this.__actions__.length){wrapped=new LazyWrapper(this);}wrapped=wrapped.reverse();wrapped.__actions__.push({'func':thru,'args':[reverse],'thisArg':undefined});return new LodashWrapper(wrapped,this.__chain__);}return this.thru(reverse);}/**
     * Executes the chain sequence to resolve the unwrapped value.
     *
     * @name value
     * @memberOf _
     * @since 0.1.0
     * @alias toJSON, valueOf
     * @category Seq
     * @returns {*} Returns the resolved unwrapped value.
     * @example
     *
     * _([1, 2, 3]).value();
     * // => [1, 2, 3]
     */function wrapperValue(){return baseWrapperValue(this.__wrapped__,this.__actions__);}/*------------------------------------------------------------------------*//**
     * Creates an object composed of keys generated from the results of running
     * each element of `collection` thru `iteratee`. The corresponding value of
     * each key is the number of times the key was returned by `iteratee`. The
     * iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @since 0.5.0
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [iteratee=_.identity] The iteratee to transform keys.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.countBy([6.1, 4.2, 6.3], Math.floor);
     * // => { '4': 1, '6': 2 }
     *
     * // The `_.property` iteratee shorthand.
     * _.countBy(['one', 'two', 'three'], 'length');
     * // => { '3': 2, '5': 1 }
     */var countBy=createAggregator(function(result,value,key){if(hasOwnProperty.call(result,key)){++result[key];}else{baseAssignValue(result,key,1);}});/**
     * Checks if `predicate` returns truthy for **all** elements of `collection`.
     * Iteration is stopped once `predicate` returns falsey. The predicate is
     * invoked with three arguments: (value, index|key, collection).
     *
     * **Note:** This method returns `true` for
     * [empty collections](https://en.wikipedia.org/wiki/Empty_set) because
     * [everything is true](https://en.wikipedia.org/wiki/Vacuous_truth) of
     * elements of empty collections.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [predicate=_.identity] The function invoked per iteration.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {boolean} Returns `true` if all elements pass the predicate check,
     *  else `false`.
     * @example
     *
     * _.every([true, 1, null, 'yes'], Boolean);
     * // => false
     *
     * var users = [
     *   { 'user': 'barney', 'age': 36, 'active': false },
     *   { 'user': 'fred',   'age': 40, 'active': false }
     * ];
     *
     * // The `_.matches` iteratee shorthand.
     * _.every(users, { 'user': 'barney', 'active': false });
     * // => false
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.every(users, ['active', false]);
     * // => true
     *
     * // The `_.property` iteratee shorthand.
     * _.every(users, 'active');
     * // => false
     */function every(collection,predicate,guard){var func=isArray(collection)?arrayEvery:baseEvery;if(guard&&isIterateeCall(collection,predicate,guard)){predicate=undefined;}return func(collection,getIteratee(predicate,3));}/**
     * Iterates over elements of `collection`, returning an array of all elements
     * `predicate` returns truthy for. The predicate is invoked with three
     * arguments: (value, index|key, collection).
     *
     * **Note:** Unlike `_.remove`, this method returns a new array.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [predicate=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the new filtered array.
     * @see _.reject
     * @example
     *
     * var users = [
     *   { 'user': 'barney', 'age': 36, 'active': true },
     *   { 'user': 'fred',   'age': 40, 'active': false }
     * ];
     *
     * _.filter(users, function(o) { return !o.active; });
     * // => objects for ['fred']
     *
     * // The `_.matches` iteratee shorthand.
     * _.filter(users, { 'age': 36, 'active': true });
     * // => objects for ['barney']
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.filter(users, ['active', false]);
     * // => objects for ['fred']
     *
     * // The `_.property` iteratee shorthand.
     * _.filter(users, 'active');
     * // => objects for ['barney']
     */function filter(collection,predicate){var func=isArray(collection)?arrayFilter:baseFilter;return func(collection,getIteratee(predicate,3));}/**
     * Iterates over elements of `collection`, returning the first element
     * `predicate` returns truthy for. The predicate is invoked with three
     * arguments: (value, index|key, collection).
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Collection
     * @param {Array|Object} collection The collection to inspect.
     * @param {Function} [predicate=_.identity] The function invoked per iteration.
     * @param {number} [fromIndex=0] The index to search from.
     * @returns {*} Returns the matched element, else `undefined`.
     * @example
     *
     * var users = [
     *   { 'user': 'barney',  'age': 36, 'active': true },
     *   { 'user': 'fred',    'age': 40, 'active': false },
     *   { 'user': 'pebbles', 'age': 1,  'active': true }
     * ];
     *
     * _.find(users, function(o) { return o.age < 40; });
     * // => object for 'barney'
     *
     * // The `_.matches` iteratee shorthand.
     * _.find(users, { 'age': 1, 'active': true });
     * // => object for 'pebbles'
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.find(users, ['active', false]);
     * // => object for 'fred'
     *
     * // The `_.property` iteratee shorthand.
     * _.find(users, 'active');
     * // => object for 'barney'
     */var find=createFind(findIndex);/**
     * This method is like `_.find` except that it iterates over elements of
     * `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @since 2.0.0
     * @category Collection
     * @param {Array|Object} collection The collection to inspect.
     * @param {Function} [predicate=_.identity] The function invoked per iteration.
     * @param {number} [fromIndex=collection.length-1] The index to search from.
     * @returns {*} Returns the matched element, else `undefined`.
     * @example
     *
     * _.findLast([1, 2, 3, 4], function(n) {
     *   return n % 2 == 1;
     * });
     * // => 3
     */var findLast=createFind(findLastIndex);/**
     * Creates a flattened array of values by running each element in `collection`
     * thru `iteratee` and flattening the mapped results. The iteratee is invoked
     * with three arguments: (value, index|key, collection).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the new flattened array.
     * @example
     *
     * function duplicate(n) {
     *   return [n, n];
     * }
     *
     * _.flatMap([1, 2], duplicate);
     * // => [1, 1, 2, 2]
     */function flatMap(collection,iteratee){return baseFlatten(map(collection,iteratee),1);}/**
     * This method is like `_.flatMap` except that it recursively flattens the
     * mapped results.
     *
     * @static
     * @memberOf _
     * @since 4.7.0
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the new flattened array.
     * @example
     *
     * function duplicate(n) {
     *   return [[[n, n]]];
     * }
     *
     * _.flatMapDeep([1, 2], duplicate);
     * // => [1, 1, 2, 2]
     */function flatMapDeep(collection,iteratee){return baseFlatten(map(collection,iteratee),INFINITY);}/**
     * This method is like `_.flatMap` except that it recursively flattens the
     * mapped results up to `depth` times.
     *
     * @static
     * @memberOf _
     * @since 4.7.0
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @param {number} [depth=1] The maximum recursion depth.
     * @returns {Array} Returns the new flattened array.
     * @example
     *
     * function duplicate(n) {
     *   return [[[n, n]]];
     * }
     *
     * _.flatMapDepth([1, 2], duplicate, 2);
     * // => [[1, 1], [2, 2]]
     */function flatMapDepth(collection,iteratee,depth){depth=depth===undefined?1:toInteger(depth);return baseFlatten(map(collection,iteratee),depth);}/**
     * Iterates over elements of `collection` and invokes `iteratee` for each element.
     * The iteratee is invoked with three arguments: (value, index|key, collection).
     * Iteratee functions may exit iteration early by explicitly returning `false`.
     *
     * **Note:** As with other "Collections" methods, objects with a "length"
     * property are iterated like arrays. To avoid this behavior use `_.forIn`
     * or `_.forOwn` for object iteration.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @alias each
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Array|Object} Returns `collection`.
     * @see _.forEachRight
     * @example
     *
     * _.forEach([1, 2], function(value) {
     *   console.log(value);
     * });
     * // => Logs `1` then `2`.
     *
     * _.forEach({ 'a': 1, 'b': 2 }, function(value, key) {
     *   console.log(key);
     * });
     * // => Logs 'a' then 'b' (iteration order is not guaranteed).
     */function forEach(collection,iteratee){var func=isArray(collection)?arrayEach:baseEach;return func(collection,getIteratee(iteratee,3));}/**
     * This method is like `_.forEach` except that it iterates over elements of
     * `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @since 2.0.0
     * @alias eachRight
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Array|Object} Returns `collection`.
     * @see _.forEach
     * @example
     *
     * _.forEachRight([1, 2], function(value) {
     *   console.log(value);
     * });
     * // => Logs `2` then `1`.
     */function forEachRight(collection,iteratee){var func=isArray(collection)?arrayEachRight:baseEachRight;return func(collection,getIteratee(iteratee,3));}/**
     * Creates an object composed of keys generated from the results of running
     * each element of `collection` thru `iteratee`. The order of grouped values
     * is determined by the order they occur in `collection`. The corresponding
     * value of each key is an array of elements responsible for generating the
     * key. The iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [iteratee=_.identity] The iteratee to transform keys.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * _.groupBy([6.1, 4.2, 6.3], Math.floor);
     * // => { '4': [4.2], '6': [6.1, 6.3] }
     *
     * // The `_.property` iteratee shorthand.
     * _.groupBy(['one', 'two', 'three'], 'length');
     * // => { '3': ['one', 'two'], '5': ['three'] }
     */var groupBy=createAggregator(function(result,value,key){if(hasOwnProperty.call(result,key)){result[key].push(value);}else{baseAssignValue(result,key,[value]);}});/**
     * Checks if `value` is in `collection`. If `collection` is a string, it's
     * checked for a substring of `value`, otherwise
     * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * is used for equality comparisons. If `fromIndex` is negative, it's used as
     * the offset from the end of `collection`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Collection
     * @param {Array|Object|string} collection The collection to inspect.
     * @param {*} value The value to search for.
     * @param {number} [fromIndex=0] The index to search from.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.reduce`.
     * @returns {boolean} Returns `true` if `value` is found, else `false`.
     * @example
     *
     * _.includes([1, 2, 3], 1);
     * // => true
     *
     * _.includes([1, 2, 3], 1, 2);
     * // => false
     *
     * _.includes({ 'a': 1, 'b': 2 }, 1);
     * // => true
     *
     * _.includes('abcd', 'bc');
     * // => true
     */function includes(collection,value,fromIndex,guard){collection=isArrayLike(collection)?collection:values(collection);fromIndex=fromIndex&&!guard?toInteger(fromIndex):0;var length=collection.length;if(fromIndex<0){fromIndex=nativeMax(length+fromIndex,0);}return isString(collection)?fromIndex<=length&&collection.indexOf(value,fromIndex)>-1:!!length&&baseIndexOf(collection,value,fromIndex)>-1;}/**
     * Invokes the method at `path` of each element in `collection`, returning
     * an array of the results of each invoked method. Any additional arguments
     * are provided to each invoked method. If `path` is a function, it's invoked
     * for, and `this` bound to, each element in `collection`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Array|Function|string} path The path of the method to invoke or
     *  the function invoked per iteration.
     * @param {...*} [args] The arguments to invoke each method with.
     * @returns {Array} Returns the array of results.
     * @example
     *
     * _.invokeMap([[5, 1, 7], [3, 2, 1]], 'sort');
     * // => [[1, 5, 7], [1, 2, 3]]
     *
     * _.invokeMap([123, 456], String.prototype.split, '');
     * // => [['1', '2', '3'], ['4', '5', '6']]
     */var invokeMap=baseRest(function(collection,path,args){var index=-1,isFunc=typeof path=='function',result=isArrayLike(collection)?Array(collection.length):[];baseEach(collection,function(value){result[++index]=isFunc?apply(path,value,args):baseInvoke(value,path,args);});return result;});/**
     * Creates an object composed of keys generated from the results of running
     * each element of `collection` thru `iteratee`. The corresponding value of
     * each key is the last element responsible for generating the key. The
     * iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [iteratee=_.identity] The iteratee to transform keys.
     * @returns {Object} Returns the composed aggregate object.
     * @example
     *
     * var array = [
     *   { 'dir': 'left', 'code': 97 },
     *   { 'dir': 'right', 'code': 100 }
     * ];
     *
     * _.keyBy(array, function(o) {
     *   return String.fromCharCode(o.code);
     * });
     * // => { 'a': { 'dir': 'left', 'code': 97 }, 'd': { 'dir': 'right', 'code': 100 } }
     *
     * _.keyBy(array, 'dir');
     * // => { 'left': { 'dir': 'left', 'code': 97 }, 'right': { 'dir': 'right', 'code': 100 } }
     */var keyBy=createAggregator(function(result,value,key){baseAssignValue(result,key,value);});/**
     * Creates an array of values by running each element in `collection` thru
     * `iteratee`. The iteratee is invoked with three arguments:
     * (value, index|key, collection).
     *
     * Many lodash methods are guarded to work as iteratees for methods like
     * `_.every`, `_.filter`, `_.map`, `_.mapValues`, `_.reject`, and `_.some`.
     *
     * The guarded methods are:
     * `ary`, `chunk`, `curry`, `curryRight`, `drop`, `dropRight`, `every`,
     * `fill`, `invert`, `parseInt`, `random`, `range`, `rangeRight`, `repeat`,
     * `sampleSize`, `slice`, `some`, `sortBy`, `split`, `take`, `takeRight`,
     * `template`, `trim`, `trimEnd`, `trimStart`, and `words`
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the new mapped array.
     * @example
     *
     * function square(n) {
     *   return n * n;
     * }
     *
     * _.map([4, 8], square);
     * // => [16, 64]
     *
     * _.map({ 'a': 4, 'b': 8 }, square);
     * // => [16, 64] (iteration order is not guaranteed)
     *
     * var users = [
     *   { 'user': 'barney' },
     *   { 'user': 'fred' }
     * ];
     *
     * // The `_.property` iteratee shorthand.
     * _.map(users, 'user');
     * // => ['barney', 'fred']
     */function map(collection,iteratee){var func=isArray(collection)?arrayMap:baseMap;return func(collection,getIteratee(iteratee,3));}/**
     * This method is like `_.sortBy` except that it allows specifying the sort
     * orders of the iteratees to sort by. If `orders` is unspecified, all values
     * are sorted in ascending order. Otherwise, specify an order of "desc" for
     * descending or "asc" for ascending sort order of corresponding values.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Array[]|Function[]|Object[]|string[]} [iteratees=[_.identity]]
     *  The iteratees to sort by.
     * @param {string[]} [orders] The sort orders of `iteratees`.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.reduce`.
     * @returns {Array} Returns the new sorted array.
     * @example
     *
     * var users = [
     *   { 'user': 'fred',   'age': 48 },
     *   { 'user': 'barney', 'age': 34 },
     *   { 'user': 'fred',   'age': 40 },
     *   { 'user': 'barney', 'age': 36 }
     * ];
     *
     * // Sort by `user` in ascending order and by `age` in descending order.
     * _.orderBy(users, ['user', 'age'], ['asc', 'desc']);
     * // => objects for [['barney', 36], ['barney', 34], ['fred', 48], ['fred', 40]]
     */function orderBy(collection,iteratees,orders,guard){if(collection==null){return[];}if(!isArray(iteratees)){iteratees=iteratees==null?[]:[iteratees];}orders=guard?undefined:orders;if(!isArray(orders)){orders=orders==null?[]:[orders];}return baseOrderBy(collection,iteratees,orders);}/**
     * Creates an array of elements split into two groups, the first of which
     * contains elements `predicate` returns truthy for, the second of which
     * contains elements `predicate` returns falsey for. The predicate is
     * invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [predicate=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the array of grouped elements.
     * @example
     *
     * var users = [
     *   { 'user': 'barney',  'age': 36, 'active': false },
     *   { 'user': 'fred',    'age': 40, 'active': true },
     *   { 'user': 'pebbles', 'age': 1,  'active': false }
     * ];
     *
     * _.partition(users, function(o) { return o.active; });
     * // => objects for [['fred'], ['barney', 'pebbles']]
     *
     * // The `_.matches` iteratee shorthand.
     * _.partition(users, { 'age': 1, 'active': false });
     * // => objects for [['pebbles'], ['barney', 'fred']]
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.partition(users, ['active', false]);
     * // => objects for [['barney', 'pebbles'], ['fred']]
     *
     * // The `_.property` iteratee shorthand.
     * _.partition(users, 'active');
     * // => objects for [['fred'], ['barney', 'pebbles']]
     */var partition=createAggregator(function(result,value,key){result[key?0:1].push(value);},function(){return[[],[]];});/**
     * Reduces `collection` to a value which is the accumulated result of running
     * each element in `collection` thru `iteratee`, where each successive
     * invocation is supplied the return value of the previous. If `accumulator`
     * is not given, the first element of `collection` is used as the initial
     * value. The iteratee is invoked with four arguments:
     * (accumulator, value, index|key, collection).
     *
     * Many lodash methods are guarded to work as iteratees for methods like
     * `_.reduce`, `_.reduceRight`, and `_.transform`.
     *
     * The guarded methods are:
     * `assign`, `defaults`, `defaultsDeep`, `includes`, `merge`, `orderBy`,
     * and `sortBy`
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @param {*} [accumulator] The initial value.
     * @returns {*} Returns the accumulated value.
     * @see _.reduceRight
     * @example
     *
     * _.reduce([1, 2], function(sum, n) {
     *   return sum + n;
     * }, 0);
     * // => 3
     *
     * _.reduce({ 'a': 1, 'b': 2, 'c': 1 }, function(result, value, key) {
     *   (result[value] || (result[value] = [])).push(key);
     *   return result;
     * }, {});
     * // => { '1': ['a', 'c'], '2': ['b'] } (iteration order is not guaranteed)
     */function reduce(collection,iteratee,accumulator){var func=isArray(collection)?arrayReduce:baseReduce,initAccum=arguments.length<3;return func(collection,getIteratee(iteratee,4),accumulator,initAccum,baseEach);}/**
     * This method is like `_.reduce` except that it iterates over elements of
     * `collection` from right to left.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @param {*} [accumulator] The initial value.
     * @returns {*} Returns the accumulated value.
     * @see _.reduce
     * @example
     *
     * var array = [[0, 1], [2, 3], [4, 5]];
     *
     * _.reduceRight(array, function(flattened, other) {
     *   return flattened.concat(other);
     * }, []);
     * // => [4, 5, 2, 3, 0, 1]
     */function reduceRight(collection,iteratee,accumulator){var func=isArray(collection)?arrayReduceRight:baseReduce,initAccum=arguments.length<3;return func(collection,getIteratee(iteratee,4),accumulator,initAccum,baseEachRight);}/**
     * The opposite of `_.filter`; this method returns the elements of `collection`
     * that `predicate` does **not** return truthy for.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [predicate=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the new filtered array.
     * @see _.filter
     * @example
     *
     * var users = [
     *   { 'user': 'barney', 'age': 36, 'active': false },
     *   { 'user': 'fred',   'age': 40, 'active': true }
     * ];
     *
     * _.reject(users, function(o) { return !o.active; });
     * // => objects for ['fred']
     *
     * // The `_.matches` iteratee shorthand.
     * _.reject(users, { 'age': 40, 'active': true });
     * // => objects for ['barney']
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.reject(users, ['active', false]);
     * // => objects for ['fred']
     *
     * // The `_.property` iteratee shorthand.
     * _.reject(users, 'active');
     * // => objects for ['barney']
     */function reject(collection,predicate){var func=isArray(collection)?arrayFilter:baseFilter;return func(collection,negate(getIteratee(predicate,3)));}/**
     * Gets a random element from `collection`.
     *
     * @static
     * @memberOf _
     * @since 2.0.0
     * @category Collection
     * @param {Array|Object} collection The collection to sample.
     * @returns {*} Returns the random element.
     * @example
     *
     * _.sample([1, 2, 3, 4]);
     * // => 2
     */function sample(collection){var func=isArray(collection)?arraySample:baseSample;return func(collection);}/**
     * Gets `n` random elements at unique keys from `collection` up to the
     * size of `collection`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Collection
     * @param {Array|Object} collection The collection to sample.
     * @param {number} [n=1] The number of elements to sample.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {Array} Returns the random elements.
     * @example
     *
     * _.sampleSize([1, 2, 3], 2);
     * // => [3, 1]
     *
     * _.sampleSize([1, 2, 3], 4);
     * // => [2, 3, 1]
     */function sampleSize(collection,n,guard){if(guard?isIterateeCall(collection,n,guard):n===undefined){n=1;}else{n=toInteger(n);}var func=isArray(collection)?arraySampleSize:baseSampleSize;return func(collection,n);}/**
     * Creates an array of shuffled values, using a version of the
     * [Fisher-Yates shuffle](https://en.wikipedia.org/wiki/Fisher-Yates_shuffle).
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Collection
     * @param {Array|Object} collection The collection to shuffle.
     * @returns {Array} Returns the new shuffled array.
     * @example
     *
     * _.shuffle([1, 2, 3, 4]);
     * // => [4, 1, 3, 2]
     */function shuffle(collection){var func=isArray(collection)?arrayShuffle:baseShuffle;return func(collection);}/**
     * Gets the size of `collection` by returning its length for array-like
     * values or the number of own enumerable string keyed properties for objects.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Collection
     * @param {Array|Object|string} collection The collection to inspect.
     * @returns {number} Returns the collection size.
     * @example
     *
     * _.size([1, 2, 3]);
     * // => 3
     *
     * _.size({ 'a': 1, 'b': 2 });
     * // => 2
     *
     * _.size('pebbles');
     * // => 7
     */function size(collection){if(collection==null){return 0;}if(isArrayLike(collection)){return isString(collection)?stringSize(collection):collection.length;}var tag=getTag(collection);if(tag==mapTag||tag==setTag){return collection.size;}return baseKeys(collection).length;}/**
     * Checks if `predicate` returns truthy for **any** element of `collection`.
     * Iteration is stopped once `predicate` returns truthy. The predicate is
     * invoked with three arguments: (value, index|key, collection).
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {Function} [predicate=_.identity] The function invoked per iteration.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {boolean} Returns `true` if any element passes the predicate check,
     *  else `false`.
     * @example
     *
     * _.some([null, 0, 'yes', false], Boolean);
     * // => true
     *
     * var users = [
     *   { 'user': 'barney', 'active': true },
     *   { 'user': 'fred',   'active': false }
     * ];
     *
     * // The `_.matches` iteratee shorthand.
     * _.some(users, { 'user': 'barney', 'active': false });
     * // => false
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.some(users, ['active', false]);
     * // => true
     *
     * // The `_.property` iteratee shorthand.
     * _.some(users, 'active');
     * // => true
     */function some(collection,predicate,guard){var func=isArray(collection)?arraySome:baseSome;if(guard&&isIterateeCall(collection,predicate,guard)){predicate=undefined;}return func(collection,getIteratee(predicate,3));}/**
     * Creates an array of elements, sorted in ascending order by the results of
     * running each element in a collection thru each iteratee. This method
     * performs a stable sort, that is, it preserves the original sort order of
     * equal elements. The iteratees are invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Collection
     * @param {Array|Object} collection The collection to iterate over.
     * @param {...(Function|Function[])} [iteratees=[_.identity]]
     *  The iteratees to sort by.
     * @returns {Array} Returns the new sorted array.
     * @example
     *
     * var users = [
     *   { 'user': 'fred',   'age': 48 },
     *   { 'user': 'barney', 'age': 36 },
     *   { 'user': 'fred',   'age': 40 },
     *   { 'user': 'barney', 'age': 34 }
     * ];
     *
     * _.sortBy(users, [function(o) { return o.user; }]);
     * // => objects for [['barney', 36], ['barney', 34], ['fred', 48], ['fred', 40]]
     *
     * _.sortBy(users, ['user', 'age']);
     * // => objects for [['barney', 34], ['barney', 36], ['fred', 40], ['fred', 48]]
     */var sortBy=baseRest(function(collection,iteratees){if(collection==null){return[];}var length=iteratees.length;if(length>1&&isIterateeCall(collection,iteratees[0],iteratees[1])){iteratees=[];}else if(length>2&&isIterateeCall(iteratees[0],iteratees[1],iteratees[2])){iteratees=[iteratees[0]];}return baseOrderBy(collection,baseFlatten(iteratees,1),[]);});/*------------------------------------------------------------------------*//**
     * Gets the timestamp of the number of milliseconds that have elapsed since
     * the Unix epoch (1 January 1970 00:00:00 UTC).
     *
     * @static
     * @memberOf _
     * @since 2.4.0
     * @category Date
     * @returns {number} Returns the timestamp.
     * @example
     *
     * _.defer(function(stamp) {
     *   console.log(_.now() - stamp);
     * }, _.now());
     * // => Logs the number of milliseconds it took for the deferred invocation.
     */var now=ctxNow||function(){return root.Date.now();};/*------------------------------------------------------------------------*//**
     * The opposite of `_.before`; this method creates a function that invokes
     * `func` once it's called `n` or more times.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Function
     * @param {number} n The number of calls before `func` is invoked.
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var saves = ['profile', 'settings'];
     *
     * var done = _.after(saves.length, function() {
     *   console.log('done saving!');
     * });
     *
     * _.forEach(saves, function(type) {
     *   asyncSave({ 'type': type, 'complete': done });
     * });
     * // => Logs 'done saving!' after the two async saves have completed.
     */function after(n,func){if(typeof func!='function'){throw new TypeError(FUNC_ERROR_TEXT);}n=toInteger(n);return function(){if(--n<1){return func.apply(this,arguments);}};}/**
     * Creates a function that invokes `func`, with up to `n` arguments,
     * ignoring any additional arguments.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Function
     * @param {Function} func The function to cap arguments for.
     * @param {number} [n=func.length] The arity cap.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {Function} Returns the new capped function.
     * @example
     *
     * _.map(['6', '8', '10'], _.ary(parseInt, 1));
     * // => [6, 8, 10]
     */function ary(func,n,guard){n=guard?undefined:n;n=func&&n==null?func.length:n;return createWrap(func,WRAP_ARY_FLAG,undefined,undefined,undefined,undefined,n);}/**
     * Creates a function that invokes `func`, with the `this` binding and arguments
     * of the created function, while it's called less than `n` times. Subsequent
     * calls to the created function return the result of the last `func` invocation.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Function
     * @param {number} n The number of calls at which `func` is no longer invoked.
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * jQuery(element).on('click', _.before(5, addContactToList));
     * // => Allows adding up to 4 contacts to the list.
     */function before(n,func){var result;if(typeof func!='function'){throw new TypeError(FUNC_ERROR_TEXT);}n=toInteger(n);return function(){if(--n>0){result=func.apply(this,arguments);}if(n<=1){func=undefined;}return result;};}/**
     * Creates a function that invokes `func` with the `this` binding of `thisArg`
     * and `partials` prepended to the arguments it receives.
     *
     * The `_.bind.placeholder` value, which defaults to `_` in monolithic builds,
     * may be used as a placeholder for partially applied arguments.
     *
     * **Note:** Unlike native `Function#bind`, this method doesn't set the "length"
     * property of bound functions.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Function
     * @param {Function} func The function to bind.
     * @param {*} thisArg The `this` binding of `func`.
     * @param {...*} [partials] The arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * function greet(greeting, punctuation) {
     *   return greeting + ' ' + this.user + punctuation;
     * }
     *
     * var object = { 'user': 'fred' };
     *
     * var bound = _.bind(greet, object, 'hi');
     * bound('!');
     * // => 'hi fred!'
     *
     * // Bound with placeholders.
     * var bound = _.bind(greet, object, _, '!');
     * bound('hi');
     * // => 'hi fred!'
     */var bind=baseRest(function(func,thisArg,partials){var bitmask=WRAP_BIND_FLAG;if(partials.length){var holders=replaceHolders(partials,getHolder(bind));bitmask|=WRAP_PARTIAL_FLAG;}return createWrap(func,bitmask,thisArg,partials,holders);});/**
     * Creates a function that invokes the method at `object[key]` with `partials`
     * prepended to the arguments it receives.
     *
     * This method differs from `_.bind` by allowing bound functions to reference
     * methods that may be redefined or don't yet exist. See
     * [Peter Michaux's article](http://peter.michaux.ca/articles/lazy-function-definition-pattern)
     * for more details.
     *
     * The `_.bindKey.placeholder` value, which defaults to `_` in monolithic
     * builds, may be used as a placeholder for partially applied arguments.
     *
     * @static
     * @memberOf _
     * @since 0.10.0
     * @category Function
     * @param {Object} object The object to invoke the method on.
     * @param {string} key The key of the method.
     * @param {...*} [partials] The arguments to be partially applied.
     * @returns {Function} Returns the new bound function.
     * @example
     *
     * var object = {
     *   'user': 'fred',
     *   'greet': function(greeting, punctuation) {
     *     return greeting + ' ' + this.user + punctuation;
     *   }
     * };
     *
     * var bound = _.bindKey(object, 'greet', 'hi');
     * bound('!');
     * // => 'hi fred!'
     *
     * object.greet = function(greeting, punctuation) {
     *   return greeting + 'ya ' + this.user + punctuation;
     * };
     *
     * bound('!');
     * // => 'hiya fred!'
     *
     * // Bound with placeholders.
     * var bound = _.bindKey(object, 'greet', _, '!');
     * bound('hi');
     * // => 'hiya fred!'
     */var bindKey=baseRest(function(object,key,partials){var bitmask=WRAP_BIND_FLAG|WRAP_BIND_KEY_FLAG;if(partials.length){var holders=replaceHolders(partials,getHolder(bindKey));bitmask|=WRAP_PARTIAL_FLAG;}return createWrap(key,bitmask,object,partials,holders);});/**
     * Creates a function that accepts arguments of `func` and either invokes
     * `func` returning its result, if at least `arity` number of arguments have
     * been provided, or returns a function that accepts the remaining `func`
     * arguments, and so on. The arity of `func` may be specified if `func.length`
     * is not sufficient.
     *
     * The `_.curry.placeholder` value, which defaults to `_` in monolithic builds,
     * may be used as a placeholder for provided arguments.
     *
     * **Note:** This method doesn't set the "length" property of curried functions.
     *
     * @static
     * @memberOf _
     * @since 2.0.0
     * @category Function
     * @param {Function} func The function to curry.
     * @param {number} [arity=func.length] The arity of `func`.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {Function} Returns the new curried function.
     * @example
     *
     * var abc = function(a, b, c) {
     *   return [a, b, c];
     * };
     *
     * var curried = _.curry(abc);
     *
     * curried(1)(2)(3);
     * // => [1, 2, 3]
     *
     * curried(1, 2)(3);
     * // => [1, 2, 3]
     *
     * curried(1, 2, 3);
     * // => [1, 2, 3]
     *
     * // Curried with placeholders.
     * curried(1)(_, 3)(2);
     * // => [1, 2, 3]
     */function curry(func,arity,guard){arity=guard?undefined:arity;var result=createWrap(func,WRAP_CURRY_FLAG,undefined,undefined,undefined,undefined,undefined,arity);result.placeholder=curry.placeholder;return result;}/**
     * This method is like `_.curry` except that arguments are applied to `func`
     * in the manner of `_.partialRight` instead of `_.partial`.
     *
     * The `_.curryRight.placeholder` value, which defaults to `_` in monolithic
     * builds, may be used as a placeholder for provided arguments.
     *
     * **Note:** This method doesn't set the "length" property of curried functions.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Function
     * @param {Function} func The function to curry.
     * @param {number} [arity=func.length] The arity of `func`.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {Function} Returns the new curried function.
     * @example
     *
     * var abc = function(a, b, c) {
     *   return [a, b, c];
     * };
     *
     * var curried = _.curryRight(abc);
     *
     * curried(3)(2)(1);
     * // => [1, 2, 3]
     *
     * curried(2, 3)(1);
     * // => [1, 2, 3]
     *
     * curried(1, 2, 3);
     * // => [1, 2, 3]
     *
     * // Curried with placeholders.
     * curried(3)(1, _)(2);
     * // => [1, 2, 3]
     */function curryRight(func,arity,guard){arity=guard?undefined:arity;var result=createWrap(func,WRAP_CURRY_RIGHT_FLAG,undefined,undefined,undefined,undefined,undefined,arity);result.placeholder=curryRight.placeholder;return result;}/**
     * Creates a debounced function that delays invoking `func` until after `wait`
     * milliseconds have elapsed since the last time the debounced function was
     * invoked. The debounced function comes with a `cancel` method to cancel
     * delayed `func` invocations and a `flush` method to immediately invoke them.
     * Provide `options` to indicate whether `func` should be invoked on the
     * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
     * with the last arguments provided to the debounced function. Subsequent
     * calls to the debounced function return the result of the last `func`
     * invocation.
     *
     * **Note:** If `leading` and `trailing` options are `true`, `func` is
     * invoked on the trailing edge of the timeout only if the debounced function
     * is invoked more than once during the `wait` timeout.
     *
     * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
     * until to the next tick, similar to `setTimeout` with a timeout of `0`.
     *
     * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
     * for details over the differences between `_.debounce` and `_.throttle`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Function
     * @param {Function} func The function to debounce.
     * @param {number} [wait=0] The number of milliseconds to delay.
     * @param {Object} [options={}] The options object.
     * @param {boolean} [options.leading=false]
     *  Specify invoking on the leading edge of the timeout.
     * @param {number} [options.maxWait]
     *  The maximum time `func` is allowed to be delayed before it's invoked.
     * @param {boolean} [options.trailing=true]
     *  Specify invoking on the trailing edge of the timeout.
     * @returns {Function} Returns the new debounced function.
     * @example
     *
     * // Avoid costly calculations while the window size is in flux.
     * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
     *
     * // Invoke `sendMail` when clicked, debouncing subsequent calls.
     * jQuery(element).on('click', _.debounce(sendMail, 300, {
     *   'leading': true,
     *   'trailing': false
     * }));
     *
     * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
     * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
     * var source = new EventSource('/stream');
     * jQuery(source).on('message', debounced);
     *
     * // Cancel the trailing debounced invocation.
     * jQuery(window).on('popstate', debounced.cancel);
     */function debounce(func,wait,options){var lastArgs,lastThis,maxWait,result,timerId,lastCallTime,lastInvokeTime=0,leading=false,maxing=false,trailing=true;if(typeof func!='function'){throw new TypeError(FUNC_ERROR_TEXT);}wait=toNumber(wait)||0;if(isObject(options)){leading=!!options.leading;maxing='maxWait'in options;maxWait=maxing?nativeMax(toNumber(options.maxWait)||0,wait):maxWait;trailing='trailing'in options?!!options.trailing:trailing;}function invokeFunc(time){var args=lastArgs,thisArg=lastThis;lastArgs=lastThis=undefined;lastInvokeTime=time;result=func.apply(thisArg,args);return result;}function leadingEdge(time){// Reset any `maxWait` timer.
lastInvokeTime=time;// Start the timer for the trailing edge.
timerId=setTimeout(timerExpired,wait);// Invoke the leading edge.
return leading?invokeFunc(time):result;}function remainingWait(time){var timeSinceLastCall=time-lastCallTime,timeSinceLastInvoke=time-lastInvokeTime,result=wait-timeSinceLastCall;return maxing?nativeMin(result,maxWait-timeSinceLastInvoke):result;}function shouldInvoke(time){var timeSinceLastCall=time-lastCallTime,timeSinceLastInvoke=time-lastInvokeTime;// Either this is the first call, activity has stopped and we're at the
// trailing edge, the system time has gone backwards and we're treating
// it as the trailing edge, or we've hit the `maxWait` limit.
return lastCallTime===undefined||timeSinceLastCall>=wait||timeSinceLastCall<0||maxing&&timeSinceLastInvoke>=maxWait;}function timerExpired(){var time=now();if(shouldInvoke(time)){return trailingEdge(time);}// Restart the timer.
timerId=setTimeout(timerExpired,remainingWait(time));}function trailingEdge(time){timerId=undefined;// Only invoke if we have `lastArgs` which means `func` has been
// debounced at least once.
if(trailing&&lastArgs){return invokeFunc(time);}lastArgs=lastThis=undefined;return result;}function cancel(){if(timerId!==undefined){clearTimeout(timerId);}lastInvokeTime=0;lastArgs=lastCallTime=lastThis=timerId=undefined;}function flush(){return timerId===undefined?result:trailingEdge(now());}function debounced(){var time=now(),isInvoking=shouldInvoke(time);lastArgs=arguments;lastThis=this;lastCallTime=time;if(isInvoking){if(timerId===undefined){return leadingEdge(lastCallTime);}if(maxing){// Handle invocations in a tight loop.
timerId=setTimeout(timerExpired,wait);return invokeFunc(lastCallTime);}}if(timerId===undefined){timerId=setTimeout(timerExpired,wait);}return result;}debounced.cancel=cancel;debounced.flush=flush;return debounced;}/**
     * Defers invoking the `func` until the current call stack has cleared. Any
     * additional arguments are provided to `func` when it's invoked.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Function
     * @param {Function} func The function to defer.
     * @param {...*} [args] The arguments to invoke `func` with.
     * @returns {number} Returns the timer id.
     * @example
     *
     * _.defer(function(text) {
     *   console.log(text);
     * }, 'deferred');
     * // => Logs 'deferred' after one millisecond.
     */var defer=baseRest(function(func,args){return baseDelay(func,1,args);});/**
     * Invokes `func` after `wait` milliseconds. Any additional arguments are
     * provided to `func` when it's invoked.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Function
     * @param {Function} func The function to delay.
     * @param {number} wait The number of milliseconds to delay invocation.
     * @param {...*} [args] The arguments to invoke `func` with.
     * @returns {number} Returns the timer id.
     * @example
     *
     * _.delay(function(text) {
     *   console.log(text);
     * }, 1000, 'later');
     * // => Logs 'later' after one second.
     */var delay=baseRest(function(func,wait,args){return baseDelay(func,toNumber(wait)||0,args);});/**
     * Creates a function that invokes `func` with arguments reversed.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Function
     * @param {Function} func The function to flip arguments for.
     * @returns {Function} Returns the new flipped function.
     * @example
     *
     * var flipped = _.flip(function() {
     *   return _.toArray(arguments);
     * });
     *
     * flipped('a', 'b', 'c', 'd');
     * // => ['d', 'c', 'b', 'a']
     */function flip(func){return createWrap(func,WRAP_FLIP_FLAG);}/**
     * Creates a function that memoizes the result of `func`. If `resolver` is
     * provided, it determines the cache key for storing the result based on the
     * arguments provided to the memoized function. By default, the first argument
     * provided to the memoized function is used as the map cache key. The `func`
     * is invoked with the `this` binding of the memoized function.
     *
     * **Note:** The cache is exposed as the `cache` property on the memoized
     * function. Its creation may be customized by replacing the `_.memoize.Cache`
     * constructor with one whose instances implement the
     * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
     * method interface of `clear`, `delete`, `get`, `has`, and `set`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Function
     * @param {Function} func The function to have its output memoized.
     * @param {Function} [resolver] The function to resolve the cache key.
     * @returns {Function} Returns the new memoized function.
     * @example
     *
     * var object = { 'a': 1, 'b': 2 };
     * var other = { 'c': 3, 'd': 4 };
     *
     * var values = _.memoize(_.values);
     * values(object);
     * // => [1, 2]
     *
     * values(other);
     * // => [3, 4]
     *
     * object.a = 2;
     * values(object);
     * // => [1, 2]
     *
     * // Modify the result cache.
     * values.cache.set(object, ['a', 'b']);
     * values(object);
     * // => ['a', 'b']
     *
     * // Replace `_.memoize.Cache`.
     * _.memoize.Cache = WeakMap;
     */function memoize(func,resolver){if(typeof func!='function'||resolver!=null&&typeof resolver!='function'){throw new TypeError(FUNC_ERROR_TEXT);}var memoized=function memoized(){var args=arguments,key=resolver?resolver.apply(this,args):args[0],cache=memoized.cache;if(cache.has(key)){return cache.get(key);}var result=func.apply(this,args);memoized.cache=cache.set(key,result)||cache;return result;};memoized.cache=new(memoize.Cache||MapCache)();return memoized;}// Expose `MapCache`.
memoize.Cache=MapCache;/**
     * Creates a function that negates the result of the predicate `func`. The
     * `func` predicate is invoked with the `this` binding and arguments of the
     * created function.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Function
     * @param {Function} predicate The predicate to negate.
     * @returns {Function} Returns the new negated function.
     * @example
     *
     * function isEven(n) {
     *   return n % 2 == 0;
     * }
     *
     * _.filter([1, 2, 3, 4, 5, 6], _.negate(isEven));
     * // => [1, 3, 5]
     */function negate(predicate){if(typeof predicate!='function'){throw new TypeError(FUNC_ERROR_TEXT);}return function(){var args=arguments;switch(args.length){case 0:return!predicate.call(this);case 1:return!predicate.call(this,args[0]);case 2:return!predicate.call(this,args[0],args[1]);case 3:return!predicate.call(this,args[0],args[1],args[2]);}return!predicate.apply(this,args);};}/**
     * Creates a function that is restricted to invoking `func` once. Repeat calls
     * to the function return the value of the first invocation. The `func` is
     * invoked with the `this` binding and arguments of the created function.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Function
     * @param {Function} func The function to restrict.
     * @returns {Function} Returns the new restricted function.
     * @example
     *
     * var initialize = _.once(createApplication);
     * initialize();
     * initialize();
     * // => `createApplication` is invoked once
     */function once(func){return before(2,func);}/**
     * Creates a function that invokes `func` with its arguments transformed.
     *
     * @static
     * @since 4.0.0
     * @memberOf _
     * @category Function
     * @param {Function} func The function to wrap.
     * @param {...(Function|Function[])} [transforms=[_.identity]]
     *  The argument transforms.
     * @returns {Function} Returns the new function.
     * @example
     *
     * function doubled(n) {
     *   return n * 2;
     * }
     *
     * function square(n) {
     *   return n * n;
     * }
     *
     * var func = _.overArgs(function(x, y) {
     *   return [x, y];
     * }, [square, doubled]);
     *
     * func(9, 3);
     * // => [81, 6]
     *
     * func(10, 5);
     * // => [100, 10]
     */var overArgs=castRest(function(func,transforms){transforms=transforms.length==1&&isArray(transforms[0])?arrayMap(transforms[0],baseUnary(getIteratee())):arrayMap(baseFlatten(transforms,1),baseUnary(getIteratee()));var funcsLength=transforms.length;return baseRest(function(args){var index=-1,length=nativeMin(args.length,funcsLength);while(++index<length){args[index]=transforms[index].call(this,args[index]);}return apply(func,this,args);});});/**
     * Creates a function that invokes `func` with `partials` prepended to the
     * arguments it receives. This method is like `_.bind` except it does **not**
     * alter the `this` binding.
     *
     * The `_.partial.placeholder` value, which defaults to `_` in monolithic
     * builds, may be used as a placeholder for partially applied arguments.
     *
     * **Note:** This method doesn't set the "length" property of partially
     * applied functions.
     *
     * @static
     * @memberOf _
     * @since 0.2.0
     * @category Function
     * @param {Function} func The function to partially apply arguments to.
     * @param {...*} [partials] The arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * function greet(greeting, name) {
     *   return greeting + ' ' + name;
     * }
     *
     * var sayHelloTo = _.partial(greet, 'hello');
     * sayHelloTo('fred');
     * // => 'hello fred'
     *
     * // Partially applied with placeholders.
     * var greetFred = _.partial(greet, _, 'fred');
     * greetFred('hi');
     * // => 'hi fred'
     */var partial=baseRest(function(func,partials){var holders=replaceHolders(partials,getHolder(partial));return createWrap(func,WRAP_PARTIAL_FLAG,undefined,partials,holders);});/**
     * This method is like `_.partial` except that partially applied arguments
     * are appended to the arguments it receives.
     *
     * The `_.partialRight.placeholder` value, which defaults to `_` in monolithic
     * builds, may be used as a placeholder for partially applied arguments.
     *
     * **Note:** This method doesn't set the "length" property of partially
     * applied functions.
     *
     * @static
     * @memberOf _
     * @since 1.0.0
     * @category Function
     * @param {Function} func The function to partially apply arguments to.
     * @param {...*} [partials] The arguments to be partially applied.
     * @returns {Function} Returns the new partially applied function.
     * @example
     *
     * function greet(greeting, name) {
     *   return greeting + ' ' + name;
     * }
     *
     * var greetFred = _.partialRight(greet, 'fred');
     * greetFred('hi');
     * // => 'hi fred'
     *
     * // Partially applied with placeholders.
     * var sayHelloTo = _.partialRight(greet, 'hello', _);
     * sayHelloTo('fred');
     * // => 'hello fred'
     */var partialRight=baseRest(function(func,partials){var holders=replaceHolders(partials,getHolder(partialRight));return createWrap(func,WRAP_PARTIAL_RIGHT_FLAG,undefined,partials,holders);});/**
     * Creates a function that invokes `func` with arguments arranged according
     * to the specified `indexes` where the argument value at the first index is
     * provided as the first argument, the argument value at the second index is
     * provided as the second argument, and so on.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Function
     * @param {Function} func The function to rearrange arguments for.
     * @param {...(number|number[])} indexes The arranged argument indexes.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var rearged = _.rearg(function(a, b, c) {
     *   return [a, b, c];
     * }, [2, 0, 1]);
     *
     * rearged('b', 'c', 'a')
     * // => ['a', 'b', 'c']
     */var rearg=flatRest(function(func,indexes){return createWrap(func,WRAP_REARG_FLAG,undefined,undefined,undefined,indexes);});/**
     * Creates a function that invokes `func` with the `this` binding of the
     * created function and arguments from `start` and beyond provided as
     * an array.
     *
     * **Note:** This method is based on the
     * [rest parameter](https://mdn.io/rest_parameters).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Function
     * @param {Function} func The function to apply a rest parameter to.
     * @param {number} [start=func.length-1] The start position of the rest parameter.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var say = _.rest(function(what, names) {
     *   return what + ' ' + _.initial(names).join(', ') +
     *     (_.size(names) > 1 ? ', & ' : '') + _.last(names);
     * });
     *
     * say('hello', 'fred', 'barney', 'pebbles');
     * // => 'hello fred, barney, & pebbles'
     */function rest(func,start){if(typeof func!='function'){throw new TypeError(FUNC_ERROR_TEXT);}start=start===undefined?start:toInteger(start);return baseRest(func,start);}/**
     * Creates a function that invokes `func` with the `this` binding of the
     * create function and an array of arguments much like
     * [`Function#apply`](http://www.ecma-international.org/ecma-262/7.0/#sec-function.prototype.apply).
     *
     * **Note:** This method is based on the
     * [spread operator](https://mdn.io/spread_operator).
     *
     * @static
     * @memberOf _
     * @since 3.2.0
     * @category Function
     * @param {Function} func The function to spread arguments over.
     * @param {number} [start=0] The start position of the spread.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var say = _.spread(function(who, what) {
     *   return who + ' says ' + what;
     * });
     *
     * say(['fred', 'hello']);
     * // => 'fred says hello'
     *
     * var numbers = Promise.all([
     *   Promise.resolve(40),
     *   Promise.resolve(36)
     * ]);
     *
     * numbers.then(_.spread(function(x, y) {
     *   return x + y;
     * }));
     * // => a Promise of 76
     */function spread(func,start){if(typeof func!='function'){throw new TypeError(FUNC_ERROR_TEXT);}start=start==null?0:nativeMax(toInteger(start),0);return baseRest(function(args){var array=args[start],otherArgs=castSlice(args,0,start);if(array){arrayPush(otherArgs,array);}return apply(func,this,otherArgs);});}/**
     * Creates a throttled function that only invokes `func` at most once per
     * every `wait` milliseconds. The throttled function comes with a `cancel`
     * method to cancel delayed `func` invocations and a `flush` method to
     * immediately invoke them. Provide `options` to indicate whether `func`
     * should be invoked on the leading and/or trailing edge of the `wait`
     * timeout. The `func` is invoked with the last arguments provided to the
     * throttled function. Subsequent calls to the throttled function return the
     * result of the last `func` invocation.
     *
     * **Note:** If `leading` and `trailing` options are `true`, `func` is
     * invoked on the trailing edge of the timeout only if the throttled function
     * is invoked more than once during the `wait` timeout.
     *
     * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
     * until to the next tick, similar to `setTimeout` with a timeout of `0`.
     *
     * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
     * for details over the differences between `_.throttle` and `_.debounce`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Function
     * @param {Function} func The function to throttle.
     * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
     * @param {Object} [options={}] The options object.
     * @param {boolean} [options.leading=true]
     *  Specify invoking on the leading edge of the timeout.
     * @param {boolean} [options.trailing=true]
     *  Specify invoking on the trailing edge of the timeout.
     * @returns {Function} Returns the new throttled function.
     * @example
     *
     * // Avoid excessively updating the position while scrolling.
     * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
     *
     * // Invoke `renewToken` when the click event is fired, but not more than once every 5 minutes.
     * var throttled = _.throttle(renewToken, 300000, { 'trailing': false });
     * jQuery(element).on('click', throttled);
     *
     * // Cancel the trailing throttled invocation.
     * jQuery(window).on('popstate', throttled.cancel);
     */function throttle(func,wait,options){var leading=true,trailing=true;if(typeof func!='function'){throw new TypeError(FUNC_ERROR_TEXT);}if(isObject(options)){leading='leading'in options?!!options.leading:leading;trailing='trailing'in options?!!options.trailing:trailing;}return debounce(func,wait,{'leading':leading,'maxWait':wait,'trailing':trailing});}/**
     * Creates a function that accepts up to one argument, ignoring any
     * additional arguments.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Function
     * @param {Function} func The function to cap arguments for.
     * @returns {Function} Returns the new capped function.
     * @example
     *
     * _.map(['6', '8', '10'], _.unary(parseInt));
     * // => [6, 8, 10]
     */function unary(func){return ary(func,1);}/**
     * Creates a function that provides `value` to `wrapper` as its first
     * argument. Any additional arguments provided to the function are appended
     * to those provided to the `wrapper`. The wrapper is invoked with the `this`
     * binding of the created function.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Function
     * @param {*} value The value to wrap.
     * @param {Function} [wrapper=identity] The wrapper function.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var p = _.wrap(_.escape, function(func, text) {
     *   return '<p>' + func(text) + '</p>';
     * });
     *
     * p('fred, barney, & pebbles');
     * // => '<p>fred, barney, &amp; pebbles</p>'
     */function wrap(value,wrapper){return partial(castFunction(wrapper),value);}/*------------------------------------------------------------------------*//**
     * Casts `value` as an array if it's not one.
     *
     * @static
     * @memberOf _
     * @since 4.4.0
     * @category Lang
     * @param {*} value The value to inspect.
     * @returns {Array} Returns the cast array.
     * @example
     *
     * _.castArray(1);
     * // => [1]
     *
     * _.castArray({ 'a': 1 });
     * // => [{ 'a': 1 }]
     *
     * _.castArray('abc');
     * // => ['abc']
     *
     * _.castArray(null);
     * // => [null]
     *
     * _.castArray(undefined);
     * // => [undefined]
     *
     * _.castArray();
     * // => []
     *
     * var array = [1, 2, 3];
     * console.log(_.castArray(array) === array);
     * // => true
     */function castArray(){if(!arguments.length){return[];}var value=arguments[0];return isArray(value)?value:[value];}/**
     * Creates a shallow clone of `value`.
     *
     * **Note:** This method is loosely based on the
     * [structured clone algorithm](https://mdn.io/Structured_clone_algorithm)
     * and supports cloning arrays, array buffers, booleans, date objects, maps,
     * numbers, `Object` objects, regexes, sets, strings, symbols, and typed
     * arrays. The own enumerable properties of `arguments` objects are cloned
     * as plain objects. An empty object is returned for uncloneable values such
     * as error objects, functions, DOM nodes, and WeakMaps.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to clone.
     * @returns {*} Returns the cloned value.
     * @see _.cloneDeep
     * @example
     *
     * var objects = [{ 'a': 1 }, { 'b': 2 }];
     *
     * var shallow = _.clone(objects);
     * console.log(shallow[0] === objects[0]);
     * // => true
     */function clone(value){return baseClone(value,CLONE_SYMBOLS_FLAG);}/**
     * This method is like `_.clone` except that it accepts `customizer` which
     * is invoked to produce the cloned value. If `customizer` returns `undefined`,
     * cloning is handled by the method instead. The `customizer` is invoked with
     * up to four arguments; (value [, index|key, object, stack]).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to clone.
     * @param {Function} [customizer] The function to customize cloning.
     * @returns {*} Returns the cloned value.
     * @see _.cloneDeepWith
     * @example
     *
     * function customizer(value) {
     *   if (_.isElement(value)) {
     *     return value.cloneNode(false);
     *   }
     * }
     *
     * var el = _.cloneWith(document.body, customizer);
     *
     * console.log(el === document.body);
     * // => false
     * console.log(el.nodeName);
     * // => 'BODY'
     * console.log(el.childNodes.length);
     * // => 0
     */function cloneWith(value,customizer){customizer=typeof customizer=='function'?customizer:undefined;return baseClone(value,CLONE_SYMBOLS_FLAG,customizer);}/**
     * This method is like `_.clone` except that it recursively clones `value`.
     *
     * @static
     * @memberOf _
     * @since 1.0.0
     * @category Lang
     * @param {*} value The value to recursively clone.
     * @returns {*} Returns the deep cloned value.
     * @see _.clone
     * @example
     *
     * var objects = [{ 'a': 1 }, { 'b': 2 }];
     *
     * var deep = _.cloneDeep(objects);
     * console.log(deep[0] === objects[0]);
     * // => false
     */function cloneDeep(value){return baseClone(value,CLONE_DEEP_FLAG|CLONE_SYMBOLS_FLAG);}/**
     * This method is like `_.cloneWith` except that it recursively clones `value`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to recursively clone.
     * @param {Function} [customizer] The function to customize cloning.
     * @returns {*} Returns the deep cloned value.
     * @see _.cloneWith
     * @example
     *
     * function customizer(value) {
     *   if (_.isElement(value)) {
     *     return value.cloneNode(true);
     *   }
     * }
     *
     * var el = _.cloneDeepWith(document.body, customizer);
     *
     * console.log(el === document.body);
     * // => false
     * console.log(el.nodeName);
     * // => 'BODY'
     * console.log(el.childNodes.length);
     * // => 20
     */function cloneDeepWith(value,customizer){customizer=typeof customizer=='function'?customizer:undefined;return baseClone(value,CLONE_DEEP_FLAG|CLONE_SYMBOLS_FLAG,customizer);}/**
     * Checks if `object` conforms to `source` by invoking the predicate
     * properties of `source` with the corresponding property values of `object`.
     *
     * **Note:** This method is equivalent to `_.conforms` when `source` is
     * partially applied.
     *
     * @static
     * @memberOf _
     * @since 4.14.0
     * @category Lang
     * @param {Object} object The object to inspect.
     * @param {Object} source The object of property predicates to conform to.
     * @returns {boolean} Returns `true` if `object` conforms, else `false`.
     * @example
     *
     * var object = { 'a': 1, 'b': 2 };
     *
     * _.conformsTo(object, { 'b': function(n) { return n > 1; } });
     * // => true
     *
     * _.conformsTo(object, { 'b': function(n) { return n > 2; } });
     * // => false
     */function conformsTo(object,source){return source==null||baseConformsTo(object,source,keys(source));}/**
     * Performs a
     * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
     * comparison between two values to determine if they are equivalent.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * var object = { 'a': 1 };
     * var other = { 'a': 1 };
     *
     * _.eq(object, object);
     * // => true
     *
     * _.eq(object, other);
     * // => false
     *
     * _.eq('a', 'a');
     * // => true
     *
     * _.eq('a', Object('a'));
     * // => false
     *
     * _.eq(NaN, NaN);
     * // => true
     */function eq(value,other){return value===other||value!==value&&other!==other;}/**
     * Checks if `value` is greater than `other`.
     *
     * @static
     * @memberOf _
     * @since 3.9.0
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if `value` is greater than `other`,
     *  else `false`.
     * @see _.lt
     * @example
     *
     * _.gt(3, 1);
     * // => true
     *
     * _.gt(3, 3);
     * // => false
     *
     * _.gt(1, 3);
     * // => false
     */var gt=createRelationalOperation(baseGt);/**
     * Checks if `value` is greater than or equal to `other`.
     *
     * @static
     * @memberOf _
     * @since 3.9.0
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if `value` is greater than or equal to
     *  `other`, else `false`.
     * @see _.lte
     * @example
     *
     * _.gte(3, 1);
     * // => true
     *
     * _.gte(3, 3);
     * // => true
     *
     * _.gte(1, 3);
     * // => false
     */var gte=createRelationalOperation(function(value,other){return value>=other;});/**
     * Checks if `value` is likely an `arguments` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an `arguments` object,
     *  else `false`.
     * @example
     *
     * _.isArguments(function() { return arguments; }());
     * // => true
     *
     * _.isArguments([1, 2, 3]);
     * // => false
     */var isArguments=baseIsArguments(function(){return arguments;}())?baseIsArguments:function(value){return isObjectLike(value)&&hasOwnProperty.call(value,'callee')&&!propertyIsEnumerable.call(value,'callee');};/**
     * Checks if `value` is classified as an `Array` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an array, else `false`.
     * @example
     *
     * _.isArray([1, 2, 3]);
     * // => true
     *
     * _.isArray(document.body.children);
     * // => false
     *
     * _.isArray('abc');
     * // => false
     *
     * _.isArray(_.noop);
     * // => false
     */var isArray=Array.isArray;/**
     * Checks if `value` is classified as an `ArrayBuffer` object.
     *
     * @static
     * @memberOf _
     * @since 4.3.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an array buffer, else `false`.
     * @example
     *
     * _.isArrayBuffer(new ArrayBuffer(2));
     * // => true
     *
     * _.isArrayBuffer(new Array(2));
     * // => false
     */var isArrayBuffer=nodeIsArrayBuffer?baseUnary(nodeIsArrayBuffer):baseIsArrayBuffer;/**
     * Checks if `value` is array-like. A value is considered array-like if it's
     * not a function and has a `value.length` that's an integer greater than or
     * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
     * @example
     *
     * _.isArrayLike([1, 2, 3]);
     * // => true
     *
     * _.isArrayLike(document.body.children);
     * // => true
     *
     * _.isArrayLike('abc');
     * // => true
     *
     * _.isArrayLike(_.noop);
     * // => false
     */function isArrayLike(value){return value!=null&&isLength(value.length)&&!isFunction(value);}/**
     * This method is like `_.isArrayLike` except that it also checks if `value`
     * is an object.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an array-like object,
     *  else `false`.
     * @example
     *
     * _.isArrayLikeObject([1, 2, 3]);
     * // => true
     *
     * _.isArrayLikeObject(document.body.children);
     * // => true
     *
     * _.isArrayLikeObject('abc');
     * // => false
     *
     * _.isArrayLikeObject(_.noop);
     * // => false
     */function isArrayLikeObject(value){return isObjectLike(value)&&isArrayLike(value);}/**
     * Checks if `value` is classified as a boolean primitive or object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a boolean, else `false`.
     * @example
     *
     * _.isBoolean(false);
     * // => true
     *
     * _.isBoolean(null);
     * // => false
     */function isBoolean(value){return value===true||value===false||isObjectLike(value)&&baseGetTag(value)==boolTag;}/**
     * Checks if `value` is a buffer.
     *
     * @static
     * @memberOf _
     * @since 4.3.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
     * @example
     *
     * _.isBuffer(new Buffer(2));
     * // => true
     *
     * _.isBuffer(new Uint8Array(2));
     * // => false
     */var isBuffer=nativeIsBuffer||stubFalse;/**
     * Checks if `value` is classified as a `Date` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a date object, else `false`.
     * @example
     *
     * _.isDate(new Date);
     * // => true
     *
     * _.isDate('Mon April 23 2012');
     * // => false
     */var isDate=nodeIsDate?baseUnary(nodeIsDate):baseIsDate;/**
     * Checks if `value` is likely a DOM element.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a DOM element, else `false`.
     * @example
     *
     * _.isElement(document.body);
     * // => true
     *
     * _.isElement('<body>');
     * // => false
     */function isElement(value){return isObjectLike(value)&&value.nodeType===1&&!isPlainObject(value);}/**
     * Checks if `value` is an empty object, collection, map, or set.
     *
     * Objects are considered empty if they have no own enumerable string keyed
     * properties.
     *
     * Array-like values such as `arguments` objects, arrays, buffers, strings, or
     * jQuery-like collections are considered empty if they have a `length` of `0`.
     * Similarly, maps and sets are considered empty if they have a `size` of `0`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is empty, else `false`.
     * @example
     *
     * _.isEmpty(null);
     * // => true
     *
     * _.isEmpty(true);
     * // => true
     *
     * _.isEmpty(1);
     * // => true
     *
     * _.isEmpty([1, 2, 3]);
     * // => false
     *
     * _.isEmpty({ 'a': 1 });
     * // => false
     */function isEmpty(value){if(value==null){return true;}if(isArrayLike(value)&&(isArray(value)||typeof value=='string'||typeof value.splice=='function'||isBuffer(value)||isTypedArray(value)||isArguments(value))){return!value.length;}var tag=getTag(value);if(tag==mapTag||tag==setTag){return!value.size;}if(isPrototype(value)){return!baseKeys(value).length;}for(var key in value){if(hasOwnProperty.call(value,key)){return false;}}return true;}/**
     * Performs a deep comparison between two values to determine if they are
     * equivalent.
     *
     * **Note:** This method supports comparing arrays, array buffers, booleans,
     * date objects, error objects, maps, numbers, `Object` objects, regexes,
     * sets, strings, symbols, and typed arrays. `Object` objects are compared
     * by their own, not inherited, enumerable properties. Functions and DOM
     * nodes are compared by strict equality, i.e. `===`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * var object = { 'a': 1 };
     * var other = { 'a': 1 };
     *
     * _.isEqual(object, other);
     * // => true
     *
     * object === other;
     * // => false
     */function isEqual(value,other){return baseIsEqual(value,other);}/**
     * This method is like `_.isEqual` except that it accepts `customizer` which
     * is invoked to compare values. If `customizer` returns `undefined`, comparisons
     * are handled by the method instead. The `customizer` is invoked with up to
     * six arguments: (objValue, othValue [, index|key, object, other, stack]).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @param {Function} [customizer] The function to customize comparisons.
     * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
     * @example
     *
     * function isGreeting(value) {
     *   return /^h(?:i|ello)$/.test(value);
     * }
     *
     * function customizer(objValue, othValue) {
     *   if (isGreeting(objValue) && isGreeting(othValue)) {
     *     return true;
     *   }
     * }
     *
     * var array = ['hello', 'goodbye'];
     * var other = ['hi', 'goodbye'];
     *
     * _.isEqualWith(array, other, customizer);
     * // => true
     */function isEqualWith(value,other,customizer){customizer=typeof customizer=='function'?customizer:undefined;var result=customizer?customizer(value,other):undefined;return result===undefined?baseIsEqual(value,other,undefined,customizer):!!result;}/**
     * Checks if `value` is an `Error`, `EvalError`, `RangeError`, `ReferenceError`,
     * `SyntaxError`, `TypeError`, or `URIError` object.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an error object, else `false`.
     * @example
     *
     * _.isError(new Error);
     * // => true
     *
     * _.isError(Error);
     * // => false
     */function isError(value){if(!isObjectLike(value)){return false;}var tag=baseGetTag(value);return tag==errorTag||tag==domExcTag||typeof value.message=='string'&&typeof value.name=='string'&&!isPlainObject(value);}/**
     * Checks if `value` is a finite primitive number.
     *
     * **Note:** This method is based on
     * [`Number.isFinite`](https://mdn.io/Number/isFinite).
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a finite number, else `false`.
     * @example
     *
     * _.isFinite(3);
     * // => true
     *
     * _.isFinite(Number.MIN_VALUE);
     * // => true
     *
     * _.isFinite(Infinity);
     * // => false
     *
     * _.isFinite('3');
     * // => false
     */function isFinite(value){return typeof value=='number'&&nativeIsFinite(value);}/**
     * Checks if `value` is classified as a `Function` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a function, else `false`.
     * @example
     *
     * _.isFunction(_);
     * // => true
     *
     * _.isFunction(/abc/);
     * // => false
     */function isFunction(value){if(!isObject(value)){return false;}// The use of `Object#toString` avoids issues with the `typeof` operator
// in Safari 9 which returns 'object' for typed arrays and other constructors.
var tag=baseGetTag(value);return tag==funcTag||tag==genTag||tag==asyncTag||tag==proxyTag;}/**
     * Checks if `value` is an integer.
     *
     * **Note:** This method is based on
     * [`Number.isInteger`](https://mdn.io/Number/isInteger).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an integer, else `false`.
     * @example
     *
     * _.isInteger(3);
     * // => true
     *
     * _.isInteger(Number.MIN_VALUE);
     * // => false
     *
     * _.isInteger(Infinity);
     * // => false
     *
     * _.isInteger('3');
     * // => false
     */function isInteger(value){return typeof value=='number'&&value==toInteger(value);}/**
     * Checks if `value` is a valid array-like length.
     *
     * **Note:** This method is loosely based on
     * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
     * @example
     *
     * _.isLength(3);
     * // => true
     *
     * _.isLength(Number.MIN_VALUE);
     * // => false
     *
     * _.isLength(Infinity);
     * // => false
     *
     * _.isLength('3');
     * // => false
     */function isLength(value){return typeof value=='number'&&value>-1&&value%1==0&&value<=MAX_SAFE_INTEGER;}/**
     * Checks if `value` is the
     * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
     * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is an object, else `false`.
     * @example
     *
     * _.isObject({});
     * // => true
     *
     * _.isObject([1, 2, 3]);
     * // => true
     *
     * _.isObject(_.noop);
     * // => true
     *
     * _.isObject(null);
     * // => false
     */function isObject(value){var type=typeof value==='undefined'?'undefined':_typeof(value);return value!=null&&(type=='object'||type=='function');}/**
     * Checks if `value` is object-like. A value is object-like if it's not `null`
     * and has a `typeof` result of "object".
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
     * @example
     *
     * _.isObjectLike({});
     * // => true
     *
     * _.isObjectLike([1, 2, 3]);
     * // => true
     *
     * _.isObjectLike(_.noop);
     * // => false
     *
     * _.isObjectLike(null);
     * // => false
     */function isObjectLike(value){return value!=null&&(typeof value==='undefined'?'undefined':_typeof(value))=='object';}/**
     * Checks if `value` is classified as a `Map` object.
     *
     * @static
     * @memberOf _
     * @since 4.3.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a map, else `false`.
     * @example
     *
     * _.isMap(new Map);
     * // => true
     *
     * _.isMap(new WeakMap);
     * // => false
     */var isMap=nodeIsMap?baseUnary(nodeIsMap):baseIsMap;/**
     * Performs a partial deep comparison between `object` and `source` to
     * determine if `object` contains equivalent property values.
     *
     * **Note:** This method is equivalent to `_.matches` when `source` is
     * partially applied.
     *
     * Partial comparisons will match empty array and empty object `source`
     * values against any array or object value, respectively. See `_.isEqual`
     * for a list of supported value comparisons.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Lang
     * @param {Object} object The object to inspect.
     * @param {Object} source The object of property values to match.
     * @returns {boolean} Returns `true` if `object` is a match, else `false`.
     * @example
     *
     * var object = { 'a': 1, 'b': 2 };
     *
     * _.isMatch(object, { 'b': 2 });
     * // => true
     *
     * _.isMatch(object, { 'b': 1 });
     * // => false
     */function isMatch(object,source){return object===source||baseIsMatch(object,source,getMatchData(source));}/**
     * This method is like `_.isMatch` except that it accepts `customizer` which
     * is invoked to compare values. If `customizer` returns `undefined`, comparisons
     * are handled by the method instead. The `customizer` is invoked with five
     * arguments: (objValue, srcValue, index|key, object, source).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {Object} object The object to inspect.
     * @param {Object} source The object of property values to match.
     * @param {Function} [customizer] The function to customize comparisons.
     * @returns {boolean} Returns `true` if `object` is a match, else `false`.
     * @example
     *
     * function isGreeting(value) {
     *   return /^h(?:i|ello)$/.test(value);
     * }
     *
     * function customizer(objValue, srcValue) {
     *   if (isGreeting(objValue) && isGreeting(srcValue)) {
     *     return true;
     *   }
     * }
     *
     * var object = { 'greeting': 'hello' };
     * var source = { 'greeting': 'hi' };
     *
     * _.isMatchWith(object, source, customizer);
     * // => true
     */function isMatchWith(object,source,customizer){customizer=typeof customizer=='function'?customizer:undefined;return baseIsMatch(object,source,getMatchData(source),customizer);}/**
     * Checks if `value` is `NaN`.
     *
     * **Note:** This method is based on
     * [`Number.isNaN`](https://mdn.io/Number/isNaN) and is not the same as
     * global [`isNaN`](https://mdn.io/isNaN) which returns `true` for
     * `undefined` and other non-number values.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
     * @example
     *
     * _.isNaN(NaN);
     * // => true
     *
     * _.isNaN(new Number(NaN));
     * // => true
     *
     * isNaN(undefined);
     * // => true
     *
     * _.isNaN(undefined);
     * // => false
     */function isNaN(value){// An `NaN` primitive is the only value that is not equal to itself.
// Perform the `toStringTag` check first to avoid errors with some
// ActiveX objects in IE.
return isNumber(value)&&value!=+value;}/**
     * Checks if `value` is a pristine native function.
     *
     * **Note:** This method can't reliably detect native functions in the presence
     * of the core-js package because core-js circumvents this kind of detection.
     * Despite multiple requests, the core-js maintainer has made it clear: any
     * attempt to fix the detection will be obstructed. As a result, we're left
     * with little choice but to throw an error. Unfortunately, this also affects
     * packages, like [babel-polyfill](https://www.npmjs.com/package/babel-polyfill),
     * which rely on core-js.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a native function,
     *  else `false`.
     * @example
     *
     * _.isNative(Array.prototype.push);
     * // => true
     *
     * _.isNative(_);
     * // => false
     */function isNative(value){if(isMaskable(value)){throw new Error(CORE_ERROR_TEXT);}return baseIsNative(value);}/**
     * Checks if `value` is `null`.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is `null`, else `false`.
     * @example
     *
     * _.isNull(null);
     * // => true
     *
     * _.isNull(void 0);
     * // => false
     */function isNull(value){return value===null;}/**
     * Checks if `value` is `null` or `undefined`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is nullish, else `false`.
     * @example
     *
     * _.isNil(null);
     * // => true
     *
     * _.isNil(void 0);
     * // => true
     *
     * _.isNil(NaN);
     * // => false
     */function isNil(value){return value==null;}/**
     * Checks if `value` is classified as a `Number` primitive or object.
     *
     * **Note:** To exclude `Infinity`, `-Infinity`, and `NaN`, which are
     * classified as numbers, use the `_.isFinite` method.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a number, else `false`.
     * @example
     *
     * _.isNumber(3);
     * // => true
     *
     * _.isNumber(Number.MIN_VALUE);
     * // => true
     *
     * _.isNumber(Infinity);
     * // => true
     *
     * _.isNumber('3');
     * // => false
     */function isNumber(value){return typeof value=='number'||isObjectLike(value)&&baseGetTag(value)==numberTag;}/**
     * Checks if `value` is a plain object, that is, an object created by the
     * `Object` constructor or one with a `[[Prototype]]` of `null`.
     *
     * @static
     * @memberOf _
     * @since 0.8.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     * }
     *
     * _.isPlainObject(new Foo);
     * // => false
     *
     * _.isPlainObject([1, 2, 3]);
     * // => false
     *
     * _.isPlainObject({ 'x': 0, 'y': 0 });
     * // => true
     *
     * _.isPlainObject(Object.create(null));
     * // => true
     */function isPlainObject(value){if(!isObjectLike(value)||baseGetTag(value)!=objectTag){return false;}var proto=getPrototype(value);if(proto===null){return true;}var Ctor=hasOwnProperty.call(proto,'constructor')&&proto.constructor;return typeof Ctor=='function'&&Ctor instanceof Ctor&&funcToString.call(Ctor)==objectCtorString;}/**
     * Checks if `value` is classified as a `RegExp` object.
     *
     * @static
     * @memberOf _
     * @since 0.1.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a regexp, else `false`.
     * @example
     *
     * _.isRegExp(/abc/);
     * // => true
     *
     * _.isRegExp('/abc/');
     * // => false
     */var isRegExp=nodeIsRegExp?baseUnary(nodeIsRegExp):baseIsRegExp;/**
     * Checks if `value` is a safe integer. An integer is safe if it's an IEEE-754
     * double precision number which isn't the result of a rounded unsafe integer.
     *
     * **Note:** This method is based on
     * [`Number.isSafeInteger`](https://mdn.io/Number/isSafeInteger).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a safe integer, else `false`.
     * @example
     *
     * _.isSafeInteger(3);
     * // => true
     *
     * _.isSafeInteger(Number.MIN_VALUE);
     * // => false
     *
     * _.isSafeInteger(Infinity);
     * // => false
     *
     * _.isSafeInteger('3');
     * // => false
     */function isSafeInteger(value){return isInteger(value)&&value>=-MAX_SAFE_INTEGER&&value<=MAX_SAFE_INTEGER;}/**
     * Checks if `value` is classified as a `Set` object.
     *
     * @static
     * @memberOf _
     * @since 4.3.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a set, else `false`.
     * @example
     *
     * _.isSet(new Set);
     * // => true
     *
     * _.isSet(new WeakSet);
     * // => false
     */var isSet=nodeIsSet?baseUnary(nodeIsSet):baseIsSet;/**
     * Checks if `value` is classified as a `String` primitive or object.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a string, else `false`.
     * @example
     *
     * _.isString('abc');
     * // => true
     *
     * _.isString(1);
     * // => false
     */function isString(value){return typeof value=='string'||!isArray(value)&&isObjectLike(value)&&baseGetTag(value)==stringTag;}/**
     * Checks if `value` is classified as a `Symbol` primitive or object.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
     * @example
     *
     * _.isSymbol(Symbol.iterator);
     * // => true
     *
     * _.isSymbol('abc');
     * // => false
     */function isSymbol(value){return(typeof value==='undefined'?'undefined':_typeof(value))=='symbol'||isObjectLike(value)&&baseGetTag(value)==symbolTag;}/**
     * Checks if `value` is classified as a typed array.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
     * @example
     *
     * _.isTypedArray(new Uint8Array);
     * // => true
     *
     * _.isTypedArray([]);
     * // => false
     */var isTypedArray=nodeIsTypedArray?baseUnary(nodeIsTypedArray):baseIsTypedArray;/**
     * Checks if `value` is `undefined`.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is `undefined`, else `false`.
     * @example
     *
     * _.isUndefined(void 0);
     * // => true
     *
     * _.isUndefined(null);
     * // => false
     */function isUndefined(value){return value===undefined;}/**
     * Checks if `value` is classified as a `WeakMap` object.
     *
     * @static
     * @memberOf _
     * @since 4.3.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a weak map, else `false`.
     * @example
     *
     * _.isWeakMap(new WeakMap);
     * // => true
     *
     * _.isWeakMap(new Map);
     * // => false
     */function isWeakMap(value){return isObjectLike(value)&&getTag(value)==weakMapTag;}/**
     * Checks if `value` is classified as a `WeakSet` object.
     *
     * @static
     * @memberOf _
     * @since 4.3.0
     * @category Lang
     * @param {*} value The value to check.
     * @returns {boolean} Returns `true` if `value` is a weak set, else `false`.
     * @example
     *
     * _.isWeakSet(new WeakSet);
     * // => true
     *
     * _.isWeakSet(new Set);
     * // => false
     */function isWeakSet(value){return isObjectLike(value)&&baseGetTag(value)==weakSetTag;}/**
     * Checks if `value` is less than `other`.
     *
     * @static
     * @memberOf _
     * @since 3.9.0
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if `value` is less than `other`,
     *  else `false`.
     * @see _.gt
     * @example
     *
     * _.lt(1, 3);
     * // => true
     *
     * _.lt(3, 3);
     * // => false
     *
     * _.lt(3, 1);
     * // => false
     */var lt=createRelationalOperation(baseLt);/**
     * Checks if `value` is less than or equal to `other`.
     *
     * @static
     * @memberOf _
     * @since 3.9.0
     * @category Lang
     * @param {*} value The value to compare.
     * @param {*} other The other value to compare.
     * @returns {boolean} Returns `true` if `value` is less than or equal to
     *  `other`, else `false`.
     * @see _.gte
     * @example
     *
     * _.lte(1, 3);
     * // => true
     *
     * _.lte(3, 3);
     * // => true
     *
     * _.lte(3, 1);
     * // => false
     */var lte=createRelationalOperation(function(value,other){return value<=other;});/**
     * Converts `value` to an array.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {Array} Returns the converted array.
     * @example
     *
     * _.toArray({ 'a': 1, 'b': 2 });
     * // => [1, 2]
     *
     * _.toArray('abc');
     * // => ['a', 'b', 'c']
     *
     * _.toArray(1);
     * // => []
     *
     * _.toArray(null);
     * // => []
     */function toArray(value){if(!value){return[];}if(isArrayLike(value)){return isString(value)?stringToArray(value):copyArray(value);}if(symIterator&&value[symIterator]){return iteratorToArray(value[symIterator]());}var tag=getTag(value),func=tag==mapTag?mapToArray:tag==setTag?setToArray:values;return func(value);}/**
     * Converts `value` to a finite number.
     *
     * @static
     * @memberOf _
     * @since 4.12.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {number} Returns the converted number.
     * @example
     *
     * _.toFinite(3.2);
     * // => 3.2
     *
     * _.toFinite(Number.MIN_VALUE);
     * // => 5e-324
     *
     * _.toFinite(Infinity);
     * // => 1.7976931348623157e+308
     *
     * _.toFinite('3.2');
     * // => 3.2
     */function toFinite(value){if(!value){return value===0?value:0;}value=toNumber(value);if(value===INFINITY||value===-INFINITY){var sign=value<0?-1:1;return sign*MAX_INTEGER;}return value===value?value:0;}/**
     * Converts `value` to an integer.
     *
     * **Note:** This method is loosely based on
     * [`ToInteger`](http://www.ecma-international.org/ecma-262/7.0/#sec-tointeger).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {number} Returns the converted integer.
     * @example
     *
     * _.toInteger(3.2);
     * // => 3
     *
     * _.toInteger(Number.MIN_VALUE);
     * // => 0
     *
     * _.toInteger(Infinity);
     * // => 1.7976931348623157e+308
     *
     * _.toInteger('3.2');
     * // => 3
     */function toInteger(value){var result=toFinite(value),remainder=result%1;return result===result?remainder?result-remainder:result:0;}/**
     * Converts `value` to an integer suitable for use as the length of an
     * array-like object.
     *
     * **Note:** This method is based on
     * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {number} Returns the converted integer.
     * @example
     *
     * _.toLength(3.2);
     * // => 3
     *
     * _.toLength(Number.MIN_VALUE);
     * // => 0
     *
     * _.toLength(Infinity);
     * // => 4294967295
     *
     * _.toLength('3.2');
     * // => 3
     */function toLength(value){return value?baseClamp(toInteger(value),0,MAX_ARRAY_LENGTH):0;}/**
     * Converts `value` to a number.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to process.
     * @returns {number} Returns the number.
     * @example
     *
     * _.toNumber(3.2);
     * // => 3.2
     *
     * _.toNumber(Number.MIN_VALUE);
     * // => 5e-324
     *
     * _.toNumber(Infinity);
     * // => Infinity
     *
     * _.toNumber('3.2');
     * // => 3.2
     */function toNumber(value){if(typeof value=='number'){return value;}if(isSymbol(value)){return NAN;}if(isObject(value)){var other=typeof value.valueOf=='function'?value.valueOf():value;value=isObject(other)?other+'':other;}if(typeof value!='string'){return value===0?value:+value;}value=value.replace(reTrim,'');var isBinary=reIsBinary.test(value);return isBinary||reIsOctal.test(value)?freeParseInt(value.slice(2),isBinary?2:8):reIsBadHex.test(value)?NAN:+value;}/**
     * Converts `value` to a plain object flattening inherited enumerable string
     * keyed properties of `value` to own properties of the plain object.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {Object} Returns the converted plain object.
     * @example
     *
     * function Foo() {
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.assign({ 'a': 1 }, new Foo);
     * // => { 'a': 1, 'b': 2 }
     *
     * _.assign({ 'a': 1 }, _.toPlainObject(new Foo));
     * // => { 'a': 1, 'b': 2, 'c': 3 }
     */function toPlainObject(value){return copyObject(value,keysIn(value));}/**
     * Converts `value` to a safe integer. A safe integer can be compared and
     * represented correctly.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {number} Returns the converted integer.
     * @example
     *
     * _.toSafeInteger(3.2);
     * // => 3
     *
     * _.toSafeInteger(Number.MIN_VALUE);
     * // => 0
     *
     * _.toSafeInteger(Infinity);
     * // => 9007199254740991
     *
     * _.toSafeInteger('3.2');
     * // => 3
     */function toSafeInteger(value){return value?baseClamp(toInteger(value),-MAX_SAFE_INTEGER,MAX_SAFE_INTEGER):value===0?value:0;}/**
     * Converts `value` to a string. An empty string is returned for `null`
     * and `undefined` values. The sign of `-0` is preserved.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Lang
     * @param {*} value The value to convert.
     * @returns {string} Returns the converted string.
     * @example
     *
     * _.toString(null);
     * // => ''
     *
     * _.toString(-0);
     * // => '-0'
     *
     * _.toString([1, 2, 3]);
     * // => '1,2,3'
     */function toString(value){return value==null?'':baseToString(value);}/*------------------------------------------------------------------------*//**
     * Assigns own enumerable string keyed properties of source objects to the
     * destination object. Source objects are applied from left to right.
     * Subsequent sources overwrite property assignments of previous sources.
     *
     * **Note:** This method mutates `object` and is loosely based on
     * [`Object.assign`](https://mdn.io/Object/assign).
     *
     * @static
     * @memberOf _
     * @since 0.10.0
     * @category Object
     * @param {Object} object The destination object.
     * @param {...Object} [sources] The source objects.
     * @returns {Object} Returns `object`.
     * @see _.assignIn
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     * }
     *
     * function Bar() {
     *   this.c = 3;
     * }
     *
     * Foo.prototype.b = 2;
     * Bar.prototype.d = 4;
     *
     * _.assign({ 'a': 0 }, new Foo, new Bar);
     * // => { 'a': 1, 'c': 3 }
     */var assign=createAssigner(function(object,source){if(isPrototype(source)||isArrayLike(source)){copyObject(source,keys(source),object);return;}for(var key in source){if(hasOwnProperty.call(source,key)){assignValue(object,key,source[key]);}}});/**
     * This method is like `_.assign` except that it iterates over own and
     * inherited source properties.
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @alias extend
     * @category Object
     * @param {Object} object The destination object.
     * @param {...Object} [sources] The source objects.
     * @returns {Object} Returns `object`.
     * @see _.assign
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     * }
     *
     * function Bar() {
     *   this.c = 3;
     * }
     *
     * Foo.prototype.b = 2;
     * Bar.prototype.d = 4;
     *
     * _.assignIn({ 'a': 0 }, new Foo, new Bar);
     * // => { 'a': 1, 'b': 2, 'c': 3, 'd': 4 }
     */var assignIn=createAssigner(function(object,source){copyObject(source,keysIn(source),object);});/**
     * This method is like `_.assignIn` except that it accepts `customizer`
     * which is invoked to produce the assigned values. If `customizer` returns
     * `undefined`, assignment is handled by the method instead. The `customizer`
     * is invoked with five arguments: (objValue, srcValue, key, object, source).
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @alias extendWith
     * @category Object
     * @param {Object} object The destination object.
     * @param {...Object} sources The source objects.
     * @param {Function} [customizer] The function to customize assigned values.
     * @returns {Object} Returns `object`.
     * @see _.assignWith
     * @example
     *
     * function customizer(objValue, srcValue) {
     *   return _.isUndefined(objValue) ? srcValue : objValue;
     * }
     *
     * var defaults = _.partialRight(_.assignInWith, customizer);
     *
     * defaults({ 'a': 1 }, { 'b': 2 }, { 'a': 3 });
     * // => { 'a': 1, 'b': 2 }
     */var assignInWith=createAssigner(function(object,source,srcIndex,customizer){copyObject(source,keysIn(source),object,customizer);});/**
     * This method is like `_.assign` except that it accepts `customizer`
     * which is invoked to produce the assigned values. If `customizer` returns
     * `undefined`, assignment is handled by the method instead. The `customizer`
     * is invoked with five arguments: (objValue, srcValue, key, object, source).
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Object
     * @param {Object} object The destination object.
     * @param {...Object} sources The source objects.
     * @param {Function} [customizer] The function to customize assigned values.
     * @returns {Object} Returns `object`.
     * @see _.assignInWith
     * @example
     *
     * function customizer(objValue, srcValue) {
     *   return _.isUndefined(objValue) ? srcValue : objValue;
     * }
     *
     * var defaults = _.partialRight(_.assignWith, customizer);
     *
     * defaults({ 'a': 1 }, { 'b': 2 }, { 'a': 3 });
     * // => { 'a': 1, 'b': 2 }
     */var assignWith=createAssigner(function(object,source,srcIndex,customizer){copyObject(source,keys(source),object,customizer);});/**
     * Creates an array of values corresponding to `paths` of `object`.
     *
     * @static
     * @memberOf _
     * @since 1.0.0
     * @category Object
     * @param {Object} object The object to iterate over.
     * @param {...(string|string[])} [paths] The property paths to pick.
     * @returns {Array} Returns the picked values.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c': 3 } }, 4] };
     *
     * _.at(object, ['a[0].b.c', 'a[1]']);
     * // => [3, 4]
     */var at=flatRest(baseAt);/**
     * Creates an object that inherits from the `prototype` object. If a
     * `properties` object is given, its own enumerable string keyed properties
     * are assigned to the created object.
     *
     * @static
     * @memberOf _
     * @since 2.3.0
     * @category Object
     * @param {Object} prototype The object to inherit from.
     * @param {Object} [properties] The properties to assign to the object.
     * @returns {Object} Returns the new object.
     * @example
     *
     * function Shape() {
     *   this.x = 0;
     *   this.y = 0;
     * }
     *
     * function Circle() {
     *   Shape.call(this);
     * }
     *
     * Circle.prototype = _.create(Shape.prototype, {
     *   'constructor': Circle
     * });
     *
     * var circle = new Circle;
     * circle instanceof Circle;
     * // => true
     *
     * circle instanceof Shape;
     * // => true
     */function create(prototype,properties){var result=baseCreate(prototype);return properties==null?result:baseAssign(result,properties);}/**
     * Assigns own and inherited enumerable string keyed properties of source
     * objects to the destination object for all destination properties that
     * resolve to `undefined`. Source objects are applied from left to right.
     * Once a property is set, additional values of the same property are ignored.
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Object
     * @param {Object} object The destination object.
     * @param {...Object} [sources] The source objects.
     * @returns {Object} Returns `object`.
     * @see _.defaultsDeep
     * @example
     *
     * _.defaults({ 'a': 1 }, { 'b': 2 }, { 'a': 3 });
     * // => { 'a': 1, 'b': 2 }
     */var defaults=baseRest(function(args){args.push(undefined,customDefaultsAssignIn);return apply(assignInWith,undefined,args);});/**
     * This method is like `_.defaults` except that it recursively assigns
     * default properties.
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @since 3.10.0
     * @category Object
     * @param {Object} object The destination object.
     * @param {...Object} [sources] The source objects.
     * @returns {Object} Returns `object`.
     * @see _.defaults
     * @example
     *
     * _.defaultsDeep({ 'a': { 'b': 2 } }, { 'a': { 'b': 1, 'c': 3 } });
     * // => { 'a': { 'b': 2, 'c': 3 } }
     */var defaultsDeep=baseRest(function(args){args.push(undefined,customDefaultsMerge);return apply(mergeWith,undefined,args);});/**
     * This method is like `_.find` except that it returns the key of the first
     * element `predicate` returns truthy for instead of the element itself.
     *
     * @static
     * @memberOf _
     * @since 1.1.0
     * @category Object
     * @param {Object} object The object to inspect.
     * @param {Function} [predicate=_.identity] The function invoked per iteration.
     * @returns {string|undefined} Returns the key of the matched element,
     *  else `undefined`.
     * @example
     *
     * var users = {
     *   'barney':  { 'age': 36, 'active': true },
     *   'fred':    { 'age': 40, 'active': false },
     *   'pebbles': { 'age': 1,  'active': true }
     * };
     *
     * _.findKey(users, function(o) { return o.age < 40; });
     * // => 'barney' (iteration order is not guaranteed)
     *
     * // The `_.matches` iteratee shorthand.
     * _.findKey(users, { 'age': 1, 'active': true });
     * // => 'pebbles'
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.findKey(users, ['active', false]);
     * // => 'fred'
     *
     * // The `_.property` iteratee shorthand.
     * _.findKey(users, 'active');
     * // => 'barney'
     */function findKey(object,predicate){return baseFindKey(object,getIteratee(predicate,3),baseForOwn);}/**
     * This method is like `_.findKey` except that it iterates over elements of
     * a collection in the opposite order.
     *
     * @static
     * @memberOf _
     * @since 2.0.0
     * @category Object
     * @param {Object} object The object to inspect.
     * @param {Function} [predicate=_.identity] The function invoked per iteration.
     * @returns {string|undefined} Returns the key of the matched element,
     *  else `undefined`.
     * @example
     *
     * var users = {
     *   'barney':  { 'age': 36, 'active': true },
     *   'fred':    { 'age': 40, 'active': false },
     *   'pebbles': { 'age': 1,  'active': true }
     * };
     *
     * _.findLastKey(users, function(o) { return o.age < 40; });
     * // => returns 'pebbles' assuming `_.findKey` returns 'barney'
     *
     * // The `_.matches` iteratee shorthand.
     * _.findLastKey(users, { 'age': 36, 'active': true });
     * // => 'barney'
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.findLastKey(users, ['active', false]);
     * // => 'fred'
     *
     * // The `_.property` iteratee shorthand.
     * _.findLastKey(users, 'active');
     * // => 'pebbles'
     */function findLastKey(object,predicate){return baseFindKey(object,getIteratee(predicate,3),baseForOwnRight);}/**
     * Iterates over own and inherited enumerable string keyed properties of an
     * object and invokes `iteratee` for each property. The iteratee is invoked
     * with three arguments: (value, key, object). Iteratee functions may exit
     * iteration early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @since 0.3.0
     * @category Object
     * @param {Object} object The object to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Object} Returns `object`.
     * @see _.forInRight
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.forIn(new Foo, function(value, key) {
     *   console.log(key);
     * });
     * // => Logs 'a', 'b', then 'c' (iteration order is not guaranteed).
     */function forIn(object,iteratee){return object==null?object:baseFor(object,getIteratee(iteratee,3),keysIn);}/**
     * This method is like `_.forIn` except that it iterates over properties of
     * `object` in the opposite order.
     *
     * @static
     * @memberOf _
     * @since 2.0.0
     * @category Object
     * @param {Object} object The object to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Object} Returns `object`.
     * @see _.forIn
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.forInRight(new Foo, function(value, key) {
     *   console.log(key);
     * });
     * // => Logs 'c', 'b', then 'a' assuming `_.forIn` logs 'a', 'b', then 'c'.
     */function forInRight(object,iteratee){return object==null?object:baseForRight(object,getIteratee(iteratee,3),keysIn);}/**
     * Iterates over own enumerable string keyed properties of an object and
     * invokes `iteratee` for each property. The iteratee is invoked with three
     * arguments: (value, key, object). Iteratee functions may exit iteration
     * early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @since 0.3.0
     * @category Object
     * @param {Object} object The object to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Object} Returns `object`.
     * @see _.forOwnRight
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.forOwn(new Foo, function(value, key) {
     *   console.log(key);
     * });
     * // => Logs 'a' then 'b' (iteration order is not guaranteed).
     */function forOwn(object,iteratee){return object&&baseForOwn(object,getIteratee(iteratee,3));}/**
     * This method is like `_.forOwn` except that it iterates over properties of
     * `object` in the opposite order.
     *
     * @static
     * @memberOf _
     * @since 2.0.0
     * @category Object
     * @param {Object} object The object to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Object} Returns `object`.
     * @see _.forOwn
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.forOwnRight(new Foo, function(value, key) {
     *   console.log(key);
     * });
     * // => Logs 'b' then 'a' assuming `_.forOwn` logs 'a' then 'b'.
     */function forOwnRight(object,iteratee){return object&&baseForOwnRight(object,getIteratee(iteratee,3));}/**
     * Creates an array of function property names from own enumerable properties
     * of `object`.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Object
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns the function names.
     * @see _.functionsIn
     * @example
     *
     * function Foo() {
     *   this.a = _.constant('a');
     *   this.b = _.constant('b');
     * }
     *
     * Foo.prototype.c = _.constant('c');
     *
     * _.functions(new Foo);
     * // => ['a', 'b']
     */function functions(object){return object==null?[]:baseFunctions(object,keys(object));}/**
     * Creates an array of function property names from own and inherited
     * enumerable properties of `object`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Object
     * @param {Object} object The object to inspect.
     * @returns {Array} Returns the function names.
     * @see _.functions
     * @example
     *
     * function Foo() {
     *   this.a = _.constant('a');
     *   this.b = _.constant('b');
     * }
     *
     * Foo.prototype.c = _.constant('c');
     *
     * _.functionsIn(new Foo);
     * // => ['a', 'b', 'c']
     */function functionsIn(object){return object==null?[]:baseFunctions(object,keysIn(object));}/**
     * Gets the value at `path` of `object`. If the resolved value is
     * `undefined`, the `defaultValue` is returned in its place.
     *
     * @static
     * @memberOf _
     * @since 3.7.0
     * @category Object
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the property to get.
     * @param {*} [defaultValue] The value returned for `undefined` resolved values.
     * @returns {*} Returns the resolved value.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c': 3 } }] };
     *
     * _.get(object, 'a[0].b.c');
     * // => 3
     *
     * _.get(object, ['a', '0', 'b', 'c']);
     * // => 3
     *
     * _.get(object, 'a.b.c', 'default');
     * // => 'default'
     */function get(object,path,defaultValue){var result=object==null?undefined:baseGet(object,path);return result===undefined?defaultValue:result;}/**
     * Checks if `path` is a direct property of `object`.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @param {Array|string} path The path to check.
     * @returns {boolean} Returns `true` if `path` exists, else `false`.
     * @example
     *
     * var object = { 'a': { 'b': 2 } };
     * var other = _.create({ 'a': _.create({ 'b': 2 }) });
     *
     * _.has(object, 'a');
     * // => true
     *
     * _.has(object, 'a.b');
     * // => true
     *
     * _.has(object, ['a', 'b']);
     * // => true
     *
     * _.has(other, 'a');
     * // => false
     */function has(object,path){return object!=null&&hasPath(object,path,baseHas);}/**
     * Checks if `path` is a direct or inherited property of `object`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Object
     * @param {Object} object The object to query.
     * @param {Array|string} path The path to check.
     * @returns {boolean} Returns `true` if `path` exists, else `false`.
     * @example
     *
     * var object = _.create({ 'a': _.create({ 'b': 2 }) });
     *
     * _.hasIn(object, 'a');
     * // => true
     *
     * _.hasIn(object, 'a.b');
     * // => true
     *
     * _.hasIn(object, ['a', 'b']);
     * // => true
     *
     * _.hasIn(object, 'b');
     * // => false
     */function hasIn(object,path){return object!=null&&hasPath(object,path,baseHasIn);}/**
     * Creates an object composed of the inverted keys and values of `object`.
     * If `object` contains duplicate values, subsequent values overwrite
     * property assignments of previous values.
     *
     * @static
     * @memberOf _
     * @since 0.7.0
     * @category Object
     * @param {Object} object The object to invert.
     * @returns {Object} Returns the new inverted object.
     * @example
     *
     * var object = { 'a': 1, 'b': 2, 'c': 1 };
     *
     * _.invert(object);
     * // => { '1': 'c', '2': 'b' }
     */var invert=createInverter(function(result,value,key){result[value]=key;},constant(identity));/**
     * This method is like `_.invert` except that the inverted object is generated
     * from the results of running each element of `object` thru `iteratee`. The
     * corresponding inverted value of each inverted key is an array of keys
     * responsible for generating the inverted value. The iteratee is invoked
     * with one argument: (value).
     *
     * @static
     * @memberOf _
     * @since 4.1.0
     * @category Object
     * @param {Object} object The object to invert.
     * @param {Function} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {Object} Returns the new inverted object.
     * @example
     *
     * var object = { 'a': 1, 'b': 2, 'c': 1 };
     *
     * _.invertBy(object);
     * // => { '1': ['a', 'c'], '2': ['b'] }
     *
     * _.invertBy(object, function(value) {
     *   return 'group' + value;
     * });
     * // => { 'group1': ['a', 'c'], 'group2': ['b'] }
     */var invertBy=createInverter(function(result,value,key){if(hasOwnProperty.call(result,value)){result[value].push(key);}else{result[value]=[key];}},getIteratee);/**
     * Invokes the method at `path` of `object`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Object
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the method to invoke.
     * @param {...*} [args] The arguments to invoke the method with.
     * @returns {*} Returns the result of the invoked method.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c': [1, 2, 3, 4] } }] };
     *
     * _.invoke(object, 'a[0].b.c.slice', 1, 3);
     * // => [2, 3]
     */var invoke=baseRest(baseInvoke);/**
     * Creates an array of the own enumerable property names of `object`.
     *
     * **Note:** Non-object values are coerced to objects. See the
     * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
     * for more details.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.keys(new Foo);
     * // => ['a', 'b'] (iteration order is not guaranteed)
     *
     * _.keys('hi');
     * // => ['0', '1']
     */function keys(object){return isArrayLike(object)?arrayLikeKeys(object):baseKeys(object);}/**
     * Creates an array of the own and inherited enumerable property names of `object`.
     *
     * **Note:** Non-object values are coerced to objects.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property names.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.keysIn(new Foo);
     * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
     */function keysIn(object){return isArrayLike(object)?arrayLikeKeys(object,true):baseKeysIn(object);}/**
     * The opposite of `_.mapValues`; this method creates an object with the
     * same values as `object` and keys generated by running each own enumerable
     * string keyed property of `object` thru `iteratee`. The iteratee is invoked
     * with three arguments: (value, key, object).
     *
     * @static
     * @memberOf _
     * @since 3.8.0
     * @category Object
     * @param {Object} object The object to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Object} Returns the new mapped object.
     * @see _.mapValues
     * @example
     *
     * _.mapKeys({ 'a': 1, 'b': 2 }, function(value, key) {
     *   return key + value;
     * });
     * // => { 'a1': 1, 'b2': 2 }
     */function mapKeys(object,iteratee){var result={};iteratee=getIteratee(iteratee,3);baseForOwn(object,function(value,key,object){baseAssignValue(result,iteratee(value,key,object),value);});return result;}/**
     * Creates an object with the same keys as `object` and values generated
     * by running each own enumerable string keyed property of `object` thru
     * `iteratee`. The iteratee is invoked with three arguments:
     * (value, key, object).
     *
     * @static
     * @memberOf _
     * @since 2.4.0
     * @category Object
     * @param {Object} object The object to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Object} Returns the new mapped object.
     * @see _.mapKeys
     * @example
     *
     * var users = {
     *   'fred':    { 'user': 'fred',    'age': 40 },
     *   'pebbles': { 'user': 'pebbles', 'age': 1 }
     * };
     *
     * _.mapValues(users, function(o) { return o.age; });
     * // => { 'fred': 40, 'pebbles': 1 } (iteration order is not guaranteed)
     *
     * // The `_.property` iteratee shorthand.
     * _.mapValues(users, 'age');
     * // => { 'fred': 40, 'pebbles': 1 } (iteration order is not guaranteed)
     */function mapValues(object,iteratee){var result={};iteratee=getIteratee(iteratee,3);baseForOwn(object,function(value,key,object){baseAssignValue(result,key,iteratee(value,key,object));});return result;}/**
     * This method is like `_.assign` except that it recursively merges own and
     * inherited enumerable string keyed properties of source objects into the
     * destination object. Source properties that resolve to `undefined` are
     * skipped if a destination value exists. Array and plain object properties
     * are merged recursively. Other objects and value types are overridden by
     * assignment. Source objects are applied from left to right. Subsequent
     * sources overwrite property assignments of previous sources.
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @since 0.5.0
     * @category Object
     * @param {Object} object The destination object.
     * @param {...Object} [sources] The source objects.
     * @returns {Object} Returns `object`.
     * @example
     *
     * var object = {
     *   'a': [{ 'b': 2 }, { 'd': 4 }]
     * };
     *
     * var other = {
     *   'a': [{ 'c': 3 }, { 'e': 5 }]
     * };
     *
     * _.merge(object, other);
     * // => { 'a': [{ 'b': 2, 'c': 3 }, { 'd': 4, 'e': 5 }] }
     */var merge=createAssigner(function(object,source,srcIndex){baseMerge(object,source,srcIndex);});/**
     * This method is like `_.merge` except that it accepts `customizer` which
     * is invoked to produce the merged values of the destination and source
     * properties. If `customizer` returns `undefined`, merging is handled by the
     * method instead. The `customizer` is invoked with six arguments:
     * (objValue, srcValue, key, object, source, stack).
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Object
     * @param {Object} object The destination object.
     * @param {...Object} sources The source objects.
     * @param {Function} customizer The function to customize assigned values.
     * @returns {Object} Returns `object`.
     * @example
     *
     * function customizer(objValue, srcValue) {
     *   if (_.isArray(objValue)) {
     *     return objValue.concat(srcValue);
     *   }
     * }
     *
     * var object = { 'a': [1], 'b': [2] };
     * var other = { 'a': [3], 'b': [4] };
     *
     * _.mergeWith(object, other, customizer);
     * // => { 'a': [1, 3], 'b': [2, 4] }
     */var mergeWith=createAssigner(function(object,source,srcIndex,customizer){baseMerge(object,source,srcIndex,customizer);});/**
     * The opposite of `_.pick`; this method creates an object composed of the
     * own and inherited enumerable property paths of `object` that are not omitted.
     *
     * **Note:** This method is considerably slower than `_.pick`.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Object
     * @param {Object} object The source object.
     * @param {...(string|string[])} [paths] The property paths to omit.
     * @returns {Object} Returns the new object.
     * @example
     *
     * var object = { 'a': 1, 'b': '2', 'c': 3 };
     *
     * _.omit(object, ['a', 'c']);
     * // => { 'b': '2' }
     */var omit=flatRest(function(object,paths){var result={};if(object==null){return result;}var isDeep=false;paths=arrayMap(paths,function(path){path=castPath(path,object);isDeep||(isDeep=path.length>1);return path;});copyObject(object,getAllKeysIn(object),result);if(isDeep){result=baseClone(result,CLONE_DEEP_FLAG|CLONE_FLAT_FLAG|CLONE_SYMBOLS_FLAG,customOmitClone);}var length=paths.length;while(length--){baseUnset(result,paths[length]);}return result;});/**
     * The opposite of `_.pickBy`; this method creates an object composed of
     * the own and inherited enumerable string keyed properties of `object` that
     * `predicate` doesn't return truthy for. The predicate is invoked with two
     * arguments: (value, key).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Object
     * @param {Object} object The source object.
     * @param {Function} [predicate=_.identity] The function invoked per property.
     * @returns {Object} Returns the new object.
     * @example
     *
     * var object = { 'a': 1, 'b': '2', 'c': 3 };
     *
     * _.omitBy(object, _.isNumber);
     * // => { 'b': '2' }
     */function omitBy(object,predicate){return pickBy(object,negate(getIteratee(predicate)));}/**
     * Creates an object composed of the picked `object` properties.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Object
     * @param {Object} object The source object.
     * @param {...(string|string[])} [paths] The property paths to pick.
     * @returns {Object} Returns the new object.
     * @example
     *
     * var object = { 'a': 1, 'b': '2', 'c': 3 };
     *
     * _.pick(object, ['a', 'c']);
     * // => { 'a': 1, 'c': 3 }
     */var pick=flatRest(function(object,paths){return object==null?{}:basePick(object,paths);});/**
     * Creates an object composed of the `object` properties `predicate` returns
     * truthy for. The predicate is invoked with two arguments: (value, key).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Object
     * @param {Object} object The source object.
     * @param {Function} [predicate=_.identity] The function invoked per property.
     * @returns {Object} Returns the new object.
     * @example
     *
     * var object = { 'a': 1, 'b': '2', 'c': 3 };
     *
     * _.pickBy(object, _.isNumber);
     * // => { 'a': 1, 'c': 3 }
     */function pickBy(object,predicate){if(object==null){return{};}var props=arrayMap(getAllKeysIn(object),function(prop){return[prop];});predicate=getIteratee(predicate);return basePickBy(object,props,function(value,path){return predicate(value,path[0]);});}/**
     * This method is like `_.get` except that if the resolved value is a
     * function it's invoked with the `this` binding of its parent object and
     * its result is returned.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @param {Array|string} path The path of the property to resolve.
     * @param {*} [defaultValue] The value returned for `undefined` resolved values.
     * @returns {*} Returns the resolved value.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c1': 3, 'c2': _.constant(4) } }] };
     *
     * _.result(object, 'a[0].b.c1');
     * // => 3
     *
     * _.result(object, 'a[0].b.c2');
     * // => 4
     *
     * _.result(object, 'a[0].b.c3', 'default');
     * // => 'default'
     *
     * _.result(object, 'a[0].b.c3', _.constant('default'));
     * // => 'default'
     */function result(object,path,defaultValue){path=castPath(path,object);var index=-1,length=path.length;// Ensure the loop is entered when path is empty.
if(!length){length=1;object=undefined;}while(++index<length){var value=object==null?undefined:object[toKey(path[index])];if(value===undefined){index=length;value=defaultValue;}object=isFunction(value)?value.call(object):value;}return object;}/**
     * Sets the value at `path` of `object`. If a portion of `path` doesn't exist,
     * it's created. Arrays are created for missing index properties while objects
     * are created for all other missing properties. Use `_.setWith` to customize
     * `path` creation.
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @since 3.7.0
     * @category Object
     * @param {Object} object The object to modify.
     * @param {Array|string} path The path of the property to set.
     * @param {*} value The value to set.
     * @returns {Object} Returns `object`.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c': 3 } }] };
     *
     * _.set(object, 'a[0].b.c', 4);
     * console.log(object.a[0].b.c);
     * // => 4
     *
     * _.set(object, ['x', '0', 'y', 'z'], 5);
     * console.log(object.x[0].y.z);
     * // => 5
     */function set(object,path,value){return object==null?object:baseSet(object,path,value);}/**
     * This method is like `_.set` except that it accepts `customizer` which is
     * invoked to produce the objects of `path`.  If `customizer` returns `undefined`
     * path creation is handled by the method instead. The `customizer` is invoked
     * with three arguments: (nsValue, key, nsObject).
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Object
     * @param {Object} object The object to modify.
     * @param {Array|string} path The path of the property to set.
     * @param {*} value The value to set.
     * @param {Function} [customizer] The function to customize assigned values.
     * @returns {Object} Returns `object`.
     * @example
     *
     * var object = {};
     *
     * _.setWith(object, '[0][1]', 'a', Object);
     * // => { '0': { '1': 'a' } }
     */function setWith(object,path,value,customizer){customizer=typeof customizer=='function'?customizer:undefined;return object==null?object:baseSet(object,path,value,customizer);}/**
     * Creates an array of own enumerable string keyed-value pairs for `object`
     * which can be consumed by `_.fromPairs`. If `object` is a map or set, its
     * entries are returned.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @alias entries
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the key-value pairs.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.toPairs(new Foo);
     * // => [['a', 1], ['b', 2]] (iteration order is not guaranteed)
     */var toPairs=createToPairs(keys);/**
     * Creates an array of own and inherited enumerable string keyed-value pairs
     * for `object` which can be consumed by `_.fromPairs`. If `object` is a map
     * or set, its entries are returned.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @alias entriesIn
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the key-value pairs.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.toPairsIn(new Foo);
     * // => [['a', 1], ['b', 2], ['c', 3]] (iteration order is not guaranteed)
     */var toPairsIn=createToPairs(keysIn);/**
     * An alternative to `_.reduce`; this method transforms `object` to a new
     * `accumulator` object which is the result of running each of its own
     * enumerable string keyed properties thru `iteratee`, with each invocation
     * potentially mutating the `accumulator` object. If `accumulator` is not
     * provided, a new object with the same `[[Prototype]]` will be used. The
     * iteratee is invoked with four arguments: (accumulator, value, key, object).
     * Iteratee functions may exit iteration early by explicitly returning `false`.
     *
     * @static
     * @memberOf _
     * @since 1.3.0
     * @category Object
     * @param {Object} object The object to iterate over.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @param {*} [accumulator] The custom accumulator value.
     * @returns {*} Returns the accumulated value.
     * @example
     *
     * _.transform([2, 3, 4], function(result, n) {
     *   result.push(n *= n);
     *   return n % 2 == 0;
     * }, []);
     * // => [4, 9]
     *
     * _.transform({ 'a': 1, 'b': 2, 'c': 1 }, function(result, value, key) {
     *   (result[value] || (result[value] = [])).push(key);
     * }, {});
     * // => { '1': ['a', 'c'], '2': ['b'] }
     */function transform(object,iteratee,accumulator){var isArr=isArray(object),isArrLike=isArr||isBuffer(object)||isTypedArray(object);iteratee=getIteratee(iteratee,4);if(accumulator==null){var Ctor=object&&object.constructor;if(isArrLike){accumulator=isArr?new Ctor():[];}else if(isObject(object)){accumulator=isFunction(Ctor)?baseCreate(getPrototype(object)):{};}else{accumulator={};}}(isArrLike?arrayEach:baseForOwn)(object,function(value,index,object){return iteratee(accumulator,value,index,object);});return accumulator;}/**
     * Removes the property at `path` of `object`.
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Object
     * @param {Object} object The object to modify.
     * @param {Array|string} path The path of the property to unset.
     * @returns {boolean} Returns `true` if the property is deleted, else `false`.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c': 7 } }] };
     * _.unset(object, 'a[0].b.c');
     * // => true
     *
     * console.log(object);
     * // => { 'a': [{ 'b': {} }] };
     *
     * _.unset(object, ['a', '0', 'b', 'c']);
     * // => true
     *
     * console.log(object);
     * // => { 'a': [{ 'b': {} }] };
     */function unset(object,path){return object==null?true:baseUnset(object,path);}/**
     * This method is like `_.set` except that accepts `updater` to produce the
     * value to set. Use `_.updateWith` to customize `path` creation. The `updater`
     * is invoked with one argument: (value).
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @since 4.6.0
     * @category Object
     * @param {Object} object The object to modify.
     * @param {Array|string} path The path of the property to set.
     * @param {Function} updater The function to produce the updated value.
     * @returns {Object} Returns `object`.
     * @example
     *
     * var object = { 'a': [{ 'b': { 'c': 3 } }] };
     *
     * _.update(object, 'a[0].b.c', function(n) { return n * n; });
     * console.log(object.a[0].b.c);
     * // => 9
     *
     * _.update(object, 'x[0].y.z', function(n) { return n ? n + 1 : 0; });
     * console.log(object.x[0].y.z);
     * // => 0
     */function update(object,path,updater){return object==null?object:baseUpdate(object,path,castFunction(updater));}/**
     * This method is like `_.update` except that it accepts `customizer` which is
     * invoked to produce the objects of `path`.  If `customizer` returns `undefined`
     * path creation is handled by the method instead. The `customizer` is invoked
     * with three arguments: (nsValue, key, nsObject).
     *
     * **Note:** This method mutates `object`.
     *
     * @static
     * @memberOf _
     * @since 4.6.0
     * @category Object
     * @param {Object} object The object to modify.
     * @param {Array|string} path The path of the property to set.
     * @param {Function} updater The function to produce the updated value.
     * @param {Function} [customizer] The function to customize assigned values.
     * @returns {Object} Returns `object`.
     * @example
     *
     * var object = {};
     *
     * _.updateWith(object, '[0][1]', _.constant('a'), Object);
     * // => { '0': { '1': 'a' } }
     */function updateWith(object,path,updater,customizer){customizer=typeof customizer=='function'?customizer:undefined;return object==null?object:baseUpdate(object,path,castFunction(updater),customizer);}/**
     * Creates an array of the own enumerable string keyed property values of `object`.
     *
     * **Note:** Non-object values are coerced to objects.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property values.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.values(new Foo);
     * // => [1, 2] (iteration order is not guaranteed)
     *
     * _.values('hi');
     * // => ['h', 'i']
     */function values(object){return object==null?[]:baseValues(object,keys(object));}/**
     * Creates an array of the own and inherited enumerable string keyed property
     * values of `object`.
     *
     * **Note:** Non-object values are coerced to objects.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Object
     * @param {Object} object The object to query.
     * @returns {Array} Returns the array of property values.
     * @example
     *
     * function Foo() {
     *   this.a = 1;
     *   this.b = 2;
     * }
     *
     * Foo.prototype.c = 3;
     *
     * _.valuesIn(new Foo);
     * // => [1, 2, 3] (iteration order is not guaranteed)
     */function valuesIn(object){return object==null?[]:baseValues(object,keysIn(object));}/*------------------------------------------------------------------------*//**
     * Clamps `number` within the inclusive `lower` and `upper` bounds.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Number
     * @param {number} number The number to clamp.
     * @param {number} [lower] The lower bound.
     * @param {number} upper The upper bound.
     * @returns {number} Returns the clamped number.
     * @example
     *
     * _.clamp(-10, -5, 5);
     * // => -5
     *
     * _.clamp(10, -5, 5);
     * // => 5
     */function clamp(number,lower,upper){if(upper===undefined){upper=lower;lower=undefined;}if(upper!==undefined){upper=toNumber(upper);upper=upper===upper?upper:0;}if(lower!==undefined){lower=toNumber(lower);lower=lower===lower?lower:0;}return baseClamp(toNumber(number),lower,upper);}/**
     * Checks if `n` is between `start` and up to, but not including, `end`. If
     * `end` is not specified, it's set to `start` with `start` then set to `0`.
     * If `start` is greater than `end` the params are swapped to support
     * negative ranges.
     *
     * @static
     * @memberOf _
     * @since 3.3.0
     * @category Number
     * @param {number} number The number to check.
     * @param {number} [start=0] The start of the range.
     * @param {number} end The end of the range.
     * @returns {boolean} Returns `true` if `number` is in the range, else `false`.
     * @see _.range, _.rangeRight
     * @example
     *
     * _.inRange(3, 2, 4);
     * // => true
     *
     * _.inRange(4, 8);
     * // => true
     *
     * _.inRange(4, 2);
     * // => false
     *
     * _.inRange(2, 2);
     * // => false
     *
     * _.inRange(1.2, 2);
     * // => true
     *
     * _.inRange(5.2, 4);
     * // => false
     *
     * _.inRange(-3, -2, -6);
     * // => true
     */function inRange(number,start,end){start=toFinite(start);if(end===undefined){end=start;start=0;}else{end=toFinite(end);}number=toNumber(number);return baseInRange(number,start,end);}/**
     * Produces a random number between the inclusive `lower` and `upper` bounds.
     * If only one argument is provided a number between `0` and the given number
     * is returned. If `floating` is `true`, or either `lower` or `upper` are
     * floats, a floating-point number is returned instead of an integer.
     *
     * **Note:** JavaScript follows the IEEE-754 standard for resolving
     * floating-point values which can produce unexpected results.
     *
     * @static
     * @memberOf _
     * @since 0.7.0
     * @category Number
     * @param {number} [lower=0] The lower bound.
     * @param {number} [upper=1] The upper bound.
     * @param {boolean} [floating] Specify returning a floating-point number.
     * @returns {number} Returns the random number.
     * @example
     *
     * _.random(0, 5);
     * // => an integer between 0 and 5
     *
     * _.random(5);
     * // => also an integer between 0 and 5
     *
     * _.random(5, true);
     * // => a floating-point number between 0 and 5
     *
     * _.random(1.2, 5.2);
     * // => a floating-point number between 1.2 and 5.2
     */function random(lower,upper,floating){if(floating&&typeof floating!='boolean'&&isIterateeCall(lower,upper,floating)){upper=floating=undefined;}if(floating===undefined){if(typeof upper=='boolean'){floating=upper;upper=undefined;}else if(typeof lower=='boolean'){floating=lower;lower=undefined;}}if(lower===undefined&&upper===undefined){lower=0;upper=1;}else{lower=toFinite(lower);if(upper===undefined){upper=lower;lower=0;}else{upper=toFinite(upper);}}if(lower>upper){var temp=lower;lower=upper;upper=temp;}if(floating||lower%1||upper%1){var rand=nativeRandom();return nativeMin(lower+rand*(upper-lower+freeParseFloat('1e-'+((rand+'').length-1))),upper);}return baseRandom(lower,upper);}/*------------------------------------------------------------------------*//**
     * Converts `string` to [camel case](https://en.wikipedia.org/wiki/CamelCase).
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the camel cased string.
     * @example
     *
     * _.camelCase('Foo Bar');
     * // => 'fooBar'
     *
     * _.camelCase('--foo-bar--');
     * // => 'fooBar'
     *
     * _.camelCase('__FOO_BAR__');
     * // => 'fooBar'
     */var camelCase=createCompounder(function(result,word,index){word=word.toLowerCase();return result+(index?capitalize(word):word);});/**
     * Converts the first character of `string` to upper case and the remaining
     * to lower case.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to capitalize.
     * @returns {string} Returns the capitalized string.
     * @example
     *
     * _.capitalize('FRED');
     * // => 'Fred'
     */function capitalize(string){return upperFirst(toString(string).toLowerCase());}/**
     * Deburrs `string` by converting
     * [Latin-1 Supplement](https://en.wikipedia.org/wiki/Latin-1_Supplement_(Unicode_block)#Character_table)
     * and [Latin Extended-A](https://en.wikipedia.org/wiki/Latin_Extended-A)
     * letters to basic Latin letters and removing
     * [combining diacritical marks](https://en.wikipedia.org/wiki/Combining_Diacritical_Marks).
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to deburr.
     * @returns {string} Returns the deburred string.
     * @example
     *
     * _.deburr('déjà vu');
     * // => 'deja vu'
     */function deburr(string){string=toString(string);return string&&string.replace(reLatin,deburrLetter).replace(reComboMark,'');}/**
     * Checks if `string` ends with the given target string.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to inspect.
     * @param {string} [target] The string to search for.
     * @param {number} [position=string.length] The position to search up to.
     * @returns {boolean} Returns `true` if `string` ends with `target`,
     *  else `false`.
     * @example
     *
     * _.endsWith('abc', 'c');
     * // => true
     *
     * _.endsWith('abc', 'b');
     * // => false
     *
     * _.endsWith('abc', 'b', 2);
     * // => true
     */function endsWith(string,target,position){string=toString(string);target=baseToString(target);var length=string.length;position=position===undefined?length:baseClamp(toInteger(position),0,length);var end=position;position-=target.length;return position>=0&&string.slice(position,end)==target;}/**
     * Converts the characters "&", "<", ">", '"', and "'" in `string` to their
     * corresponding HTML entities.
     *
     * **Note:** No other characters are escaped. To escape additional
     * characters use a third-party library like [_he_](https://mths.be/he).
     *
     * Though the ">" character is escaped for symmetry, characters like
     * ">" and "/" don't need escaping in HTML and have no special meaning
     * unless they're part of a tag or unquoted attribute value. See
     * [Mathias Bynens's article](https://mathiasbynens.be/notes/ambiguous-ampersands)
     * (under "semi-related fun fact") for more details.
     *
     * When working with HTML you should always
     * [quote attribute values](http://wonko.com/post/html-escaping) to reduce
     * XSS vectors.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category String
     * @param {string} [string=''] The string to escape.
     * @returns {string} Returns the escaped string.
     * @example
     *
     * _.escape('fred, barney, & pebbles');
     * // => 'fred, barney, &amp; pebbles'
     */function escape(string){string=toString(string);return string&&reHasUnescapedHtml.test(string)?string.replace(reUnescapedHtml,escapeHtmlChar):string;}/**
     * Escapes the `RegExp` special characters "^", "$", "\", ".", "*", "+",
     * "?", "(", ")", "[", "]", "{", "}", and "|" in `string`.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to escape.
     * @returns {string} Returns the escaped string.
     * @example
     *
     * _.escapeRegExp('[lodash](https://lodash.com/)');
     * // => '\[lodash\]\(https://lodash\.com/\)'
     */function escapeRegExp(string){string=toString(string);return string&&reHasRegExpChar.test(string)?string.replace(reRegExpChar,'\\$&'):string;}/**
     * Converts `string` to
     * [kebab case](https://en.wikipedia.org/wiki/Letter_case#Special_case_styles).
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the kebab cased string.
     * @example
     *
     * _.kebabCase('Foo Bar');
     * // => 'foo-bar'
     *
     * _.kebabCase('fooBar');
     * // => 'foo-bar'
     *
     * _.kebabCase('__FOO_BAR__');
     * // => 'foo-bar'
     */var kebabCase=createCompounder(function(result,word,index){return result+(index?'-':'')+word.toLowerCase();});/**
     * Converts `string`, as space separated words, to lower case.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the lower cased string.
     * @example
     *
     * _.lowerCase('--Foo-Bar--');
     * // => 'foo bar'
     *
     * _.lowerCase('fooBar');
     * // => 'foo bar'
     *
     * _.lowerCase('__FOO_BAR__');
     * // => 'foo bar'
     */var lowerCase=createCompounder(function(result,word,index){return result+(index?' ':'')+word.toLowerCase();});/**
     * Converts the first character of `string` to lower case.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the converted string.
     * @example
     *
     * _.lowerFirst('Fred');
     * // => 'fred'
     *
     * _.lowerFirst('FRED');
     * // => 'fRED'
     */var lowerFirst=createCaseFirst('toLowerCase');/**
     * Pads `string` on the left and right sides if it's shorter than `length`.
     * Padding characters are truncated if they can't be evenly divided by `length`.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to pad.
     * @param {number} [length=0] The padding length.
     * @param {string} [chars=' '] The string used as padding.
     * @returns {string} Returns the padded string.
     * @example
     *
     * _.pad('abc', 8);
     * // => '  abc   '
     *
     * _.pad('abc', 8, '_-');
     * // => '_-abc_-_'
     *
     * _.pad('abc', 3);
     * // => 'abc'
     */function pad(string,length,chars){string=toString(string);length=toInteger(length);var strLength=length?stringSize(string):0;if(!length||strLength>=length){return string;}var mid=(length-strLength)/2;return createPadding(nativeFloor(mid),chars)+string+createPadding(nativeCeil(mid),chars);}/**
     * Pads `string` on the right side if it's shorter than `length`. Padding
     * characters are truncated if they exceed `length`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category String
     * @param {string} [string=''] The string to pad.
     * @param {number} [length=0] The padding length.
     * @param {string} [chars=' '] The string used as padding.
     * @returns {string} Returns the padded string.
     * @example
     *
     * _.padEnd('abc', 6);
     * // => 'abc   '
     *
     * _.padEnd('abc', 6, '_-');
     * // => 'abc_-_'
     *
     * _.padEnd('abc', 3);
     * // => 'abc'
     */function padEnd(string,length,chars){string=toString(string);length=toInteger(length);var strLength=length?stringSize(string):0;return length&&strLength<length?string+createPadding(length-strLength,chars):string;}/**
     * Pads `string` on the left side if it's shorter than `length`. Padding
     * characters are truncated if they exceed `length`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category String
     * @param {string} [string=''] The string to pad.
     * @param {number} [length=0] The padding length.
     * @param {string} [chars=' '] The string used as padding.
     * @returns {string} Returns the padded string.
     * @example
     *
     * _.padStart('abc', 6);
     * // => '   abc'
     *
     * _.padStart('abc', 6, '_-');
     * // => '_-_abc'
     *
     * _.padStart('abc', 3);
     * // => 'abc'
     */function padStart(string,length,chars){string=toString(string);length=toInteger(length);var strLength=length?stringSize(string):0;return length&&strLength<length?createPadding(length-strLength,chars)+string:string;}/**
     * Converts `string` to an integer of the specified radix. If `radix` is
     * `undefined` or `0`, a `radix` of `10` is used unless `value` is a
     * hexadecimal, in which case a `radix` of `16` is used.
     *
     * **Note:** This method aligns with the
     * [ES5 implementation](https://es5.github.io/#x15.1.2.2) of `parseInt`.
     *
     * @static
     * @memberOf _
     * @since 1.1.0
     * @category String
     * @param {string} string The string to convert.
     * @param {number} [radix=10] The radix to interpret `value` by.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {number} Returns the converted integer.
     * @example
     *
     * _.parseInt('08');
     * // => 8
     *
     * _.map(['6', '08', '10'], _.parseInt);
     * // => [6, 8, 10]
     */function parseInt(string,radix,guard){if(guard||radix==null){radix=0;}else if(radix){radix=+radix;}return nativeParseInt(toString(string).replace(reTrimStart,''),radix||0);}/**
     * Repeats the given string `n` times.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to repeat.
     * @param {number} [n=1] The number of times to repeat the string.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {string} Returns the repeated string.
     * @example
     *
     * _.repeat('*', 3);
     * // => '***'
     *
     * _.repeat('abc', 2);
     * // => 'abcabc'
     *
     * _.repeat('abc', 0);
     * // => ''
     */function repeat(string,n,guard){if(guard?isIterateeCall(string,n,guard):n===undefined){n=1;}else{n=toInteger(n);}return baseRepeat(toString(string),n);}/**
     * Replaces matches for `pattern` in `string` with `replacement`.
     *
     * **Note:** This method is based on
     * [`String#replace`](https://mdn.io/String/replace).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category String
     * @param {string} [string=''] The string to modify.
     * @param {RegExp|string} pattern The pattern to replace.
     * @param {Function|string} replacement The match replacement.
     * @returns {string} Returns the modified string.
     * @example
     *
     * _.replace('Hi Fred', 'Fred', 'Barney');
     * // => 'Hi Barney'
     */function replace(){var args=arguments,string=toString(args[0]);return args.length<3?string:string.replace(args[1],args[2]);}/**
     * Converts `string` to
     * [snake case](https://en.wikipedia.org/wiki/Snake_case).
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the snake cased string.
     * @example
     *
     * _.snakeCase('Foo Bar');
     * // => 'foo_bar'
     *
     * _.snakeCase('fooBar');
     * // => 'foo_bar'
     *
     * _.snakeCase('--FOO-BAR--');
     * // => 'foo_bar'
     */var snakeCase=createCompounder(function(result,word,index){return result+(index?'_':'')+word.toLowerCase();});/**
     * Splits `string` by `separator`.
     *
     * **Note:** This method is based on
     * [`String#split`](https://mdn.io/String/split).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category String
     * @param {string} [string=''] The string to split.
     * @param {RegExp|string} separator The separator pattern to split by.
     * @param {number} [limit] The length to truncate results to.
     * @returns {Array} Returns the string segments.
     * @example
     *
     * _.split('a-b-c', '-', 2);
     * // => ['a', 'b']
     */function split(string,separator,limit){if(limit&&typeof limit!='number'&&isIterateeCall(string,separator,limit)){separator=limit=undefined;}limit=limit===undefined?MAX_ARRAY_LENGTH:limit>>>0;if(!limit){return[];}string=toString(string);if(string&&(typeof separator=='string'||separator!=null&&!isRegExp(separator))){separator=baseToString(separator);if(!separator&&hasUnicode(string)){return castSlice(stringToArray(string),0,limit);}}return string.split(separator,limit);}/**
     * Converts `string` to
     * [start case](https://en.wikipedia.org/wiki/Letter_case#Stylistic_or_specialised_usage).
     *
     * @static
     * @memberOf _
     * @since 3.1.0
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the start cased string.
     * @example
     *
     * _.startCase('--foo-bar--');
     * // => 'Foo Bar'
     *
     * _.startCase('fooBar');
     * // => 'Foo Bar'
     *
     * _.startCase('__FOO_BAR__');
     * // => 'FOO BAR'
     */var startCase=createCompounder(function(result,word,index){return result+(index?' ':'')+upperFirst(word);});/**
     * Checks if `string` starts with the given target string.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to inspect.
     * @param {string} [target] The string to search for.
     * @param {number} [position=0] The position to search from.
     * @returns {boolean} Returns `true` if `string` starts with `target`,
     *  else `false`.
     * @example
     *
     * _.startsWith('abc', 'a');
     * // => true
     *
     * _.startsWith('abc', 'b');
     * // => false
     *
     * _.startsWith('abc', 'b', 1);
     * // => true
     */function startsWith(string,target,position){string=toString(string);position=position==null?0:baseClamp(toInteger(position),0,string.length);target=baseToString(target);return string.slice(position,position+target.length)==target;}/**
     * Creates a compiled template function that can interpolate data properties
     * in "interpolate" delimiters, HTML-escape interpolated data properties in
     * "escape" delimiters, and execute JavaScript in "evaluate" delimiters. Data
     * properties may be accessed as free variables in the template. If a setting
     * object is given, it takes precedence over `_.templateSettings` values.
     *
     * **Note:** In the development build `_.template` utilizes
     * [sourceURLs](http://www.html5rocks.com/en/tutorials/developertools/sourcemaps/#toc-sourceurl)
     * for easier debugging.
     *
     * For more information on precompiling templates see
     * [lodash's custom builds documentation](https://lodash.com/custom-builds).
     *
     * For more information on Chrome extension sandboxes see
     * [Chrome's extensions documentation](https://developer.chrome.com/extensions/sandboxingEval).
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category String
     * @param {string} [string=''] The template string.
     * @param {Object} [options={}] The options object.
     * @param {RegExp} [options.escape=_.templateSettings.escape]
     *  The HTML "escape" delimiter.
     * @param {RegExp} [options.evaluate=_.templateSettings.evaluate]
     *  The "evaluate" delimiter.
     * @param {Object} [options.imports=_.templateSettings.imports]
     *  An object to import into the template as free variables.
     * @param {RegExp} [options.interpolate=_.templateSettings.interpolate]
     *  The "interpolate" delimiter.
     * @param {string} [options.sourceURL='lodash.templateSources[n]']
     *  The sourceURL of the compiled template.
     * @param {string} [options.variable='obj']
     *  The data object variable name.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {Function} Returns the compiled template function.
     * @example
     *
     * // Use the "interpolate" delimiter to create a compiled template.
     * var compiled = _.template('hello <%= user %>!');
     * compiled({ 'user': 'fred' });
     * // => 'hello fred!'
     *
     * // Use the HTML "escape" delimiter to escape data property values.
     * var compiled = _.template('<b><%- value %></b>');
     * compiled({ 'value': '<script>' });
     * // => '<b>&lt;script&gt;</b>'
     *
     * // Use the "evaluate" delimiter to execute JavaScript and generate HTML.
     * var compiled = _.template('<% _.forEach(users, function(user) { %><li><%- user %></li><% }); %>');
     * compiled({ 'users': ['fred', 'barney'] });
     * // => '<li>fred</li><li>barney</li>'
     *
     * // Use the internal `print` function in "evaluate" delimiters.
     * var compiled = _.template('<% print("hello " + user); %>!');
     * compiled({ 'user': 'barney' });
     * // => 'hello barney!'
     *
     * // Use the ES template literal delimiter as an "interpolate" delimiter.
     * // Disable support by replacing the "interpolate" delimiter.
     * var compiled = _.template('hello ${ user }!');
     * compiled({ 'user': 'pebbles' });
     * // => 'hello pebbles!'
     *
     * // Use backslashes to treat delimiters as plain text.
     * var compiled = _.template('<%= "\\<%- value %\\>" %>');
     * compiled({ 'value': 'ignored' });
     * // => '<%- value %>'
     *
     * // Use the `imports` option to import `jQuery` as `jq`.
     * var text = '<% jq.each(users, function(user) { %><li><%- user %></li><% }); %>';
     * var compiled = _.template(text, { 'imports': { 'jq': jQuery } });
     * compiled({ 'users': ['fred', 'barney'] });
     * // => '<li>fred</li><li>barney</li>'
     *
     * // Use the `sourceURL` option to specify a custom sourceURL for the template.
     * var compiled = _.template('hello <%= user %>!', { 'sourceURL': '/basic/greeting.jst' });
     * compiled(data);
     * // => Find the source of "greeting.jst" under the Sources tab or Resources panel of the web inspector.
     *
     * // Use the `variable` option to ensure a with-statement isn't used in the compiled template.
     * var compiled = _.template('hi <%= data.user %>!', { 'variable': 'data' });
     * compiled.source;
     * // => function(data) {
     * //   var __t, __p = '';
     * //   __p += 'hi ' + ((__t = ( data.user )) == null ? '' : __t) + '!';
     * //   return __p;
     * // }
     *
     * // Use custom template delimiters.
     * _.templateSettings.interpolate = /{{([\s\S]+?)}}/g;
     * var compiled = _.template('hello {{ user }}!');
     * compiled({ 'user': 'mustache' });
     * // => 'hello mustache!'
     *
     * // Use the `source` property to inline compiled templates for meaningful
     * // line numbers in error messages and stack traces.
     * fs.writeFileSync(path.join(process.cwd(), 'jst.js'), '\
     *   var JST = {\
     *     "main": ' + _.template(mainText).source + '\
     *   };\
     * ');
     */function template(string,options,guard){// Based on John Resig's `tmpl` implementation
// (http://ejohn.org/blog/javascript-micro-templating/)
// and Laura Doktorova's doT.js (https://github.com/olado/doT).
var settings=lodash.templateSettings;if(guard&&isIterateeCall(string,options,guard)){options=undefined;}string=toString(string);options=assignInWith({},options,settings,customDefaultsAssignIn);var imports=assignInWith({},options.imports,settings.imports,customDefaultsAssignIn),importsKeys=keys(imports),importsValues=baseValues(imports,importsKeys);var isEscaping,isEvaluating,index=0,interpolate=options.interpolate||reNoMatch,source="__p += '";// Compile the regexp to match each delimiter.
var reDelimiters=RegExp((options.escape||reNoMatch).source+'|'+interpolate.source+'|'+(interpolate===reInterpolate?reEsTemplate:reNoMatch).source+'|'+(options.evaluate||reNoMatch).source+'|$','g');// Use a sourceURL for easier debugging.
var sourceURL='//# sourceURL='+('sourceURL'in options?options.sourceURL:'lodash.templateSources['+ ++templateCounter+']')+'\n';string.replace(reDelimiters,function(match,escapeValue,interpolateValue,esTemplateValue,evaluateValue,offset){interpolateValue||(interpolateValue=esTemplateValue);// Escape characters that can't be included in string literals.
source+=string.slice(index,offset).replace(reUnescapedString,escapeStringChar);// Replace delimiters with snippets.
if(escapeValue){isEscaping=true;source+="' +\n__e("+escapeValue+") +\n'";}if(evaluateValue){isEvaluating=true;source+="';\n"+evaluateValue+";\n__p += '";}if(interpolateValue){source+="' +\n((__t = ("+interpolateValue+")) == null ? '' : __t) +\n'";}index=offset+match.length;// The JS engine embedded in Adobe products needs `match` returned in
// order to produce the correct `offset` value.
return match;});source+="';\n";// If `variable` is not specified wrap a with-statement around the generated
// code to add the data object to the top of the scope chain.
var variable=options.variable;if(!variable){source='with (obj) {\n'+source+'\n}\n';}// Cleanup code by stripping empty strings.
source=(isEvaluating?source.replace(reEmptyStringLeading,''):source).replace(reEmptyStringMiddle,'$1').replace(reEmptyStringTrailing,'$1;');// Frame code as the function body.
source='function('+(variable||'obj')+') {\n'+(variable?'':'obj || (obj = {});\n')+"var __t, __p = ''"+(isEscaping?', __e = _.escape':'')+(isEvaluating?', __j = Array.prototype.join;\n'+"function print() { __p += __j.call(arguments, '') }\n":';\n')+source+'return __p\n}';var result=attempt(function(){return Function(importsKeys,sourceURL+'return '+source).apply(undefined,importsValues);});// Provide the compiled function's source by its `toString` method or
// the `source` property as a convenience for inlining compiled templates.
result.source=source;if(isError(result)){throw result;}return result;}/**
     * Converts `string`, as a whole, to lower case just like
     * [String#toLowerCase](https://mdn.io/toLowerCase).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the lower cased string.
     * @example
     *
     * _.toLower('--Foo-Bar--');
     * // => '--foo-bar--'
     *
     * _.toLower('fooBar');
     * // => 'foobar'
     *
     * _.toLower('__FOO_BAR__');
     * // => '__foo_bar__'
     */function toLower(value){return toString(value).toLowerCase();}/**
     * Converts `string`, as a whole, to upper case just like
     * [String#toUpperCase](https://mdn.io/toUpperCase).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the upper cased string.
     * @example
     *
     * _.toUpper('--foo-bar--');
     * // => '--FOO-BAR--'
     *
     * _.toUpper('fooBar');
     * // => 'FOOBAR'
     *
     * _.toUpper('__foo_bar__');
     * // => '__FOO_BAR__'
     */function toUpper(value){return toString(value).toUpperCase();}/**
     * Removes leading and trailing whitespace or specified characters from `string`.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to trim.
     * @param {string} [chars=whitespace] The characters to trim.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {string} Returns the trimmed string.
     * @example
     *
     * _.trim('  abc  ');
     * // => 'abc'
     *
     * _.trim('-_-abc-_-', '_-');
     * // => 'abc'
     *
     * _.map(['  foo  ', '  bar  '], _.trim);
     * // => ['foo', 'bar']
     */function trim(string,chars,guard){string=toString(string);if(string&&(guard||chars===undefined)){return string.replace(reTrim,'');}if(!string||!(chars=baseToString(chars))){return string;}var strSymbols=stringToArray(string),chrSymbols=stringToArray(chars),start=charsStartIndex(strSymbols,chrSymbols),end=charsEndIndex(strSymbols,chrSymbols)+1;return castSlice(strSymbols,start,end).join('');}/**
     * Removes trailing whitespace or specified characters from `string`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category String
     * @param {string} [string=''] The string to trim.
     * @param {string} [chars=whitespace] The characters to trim.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {string} Returns the trimmed string.
     * @example
     *
     * _.trimEnd('  abc  ');
     * // => '  abc'
     *
     * _.trimEnd('-_-abc-_-', '_-');
     * // => '-_-abc'
     */function trimEnd(string,chars,guard){string=toString(string);if(string&&(guard||chars===undefined)){return string.replace(reTrimEnd,'');}if(!string||!(chars=baseToString(chars))){return string;}var strSymbols=stringToArray(string),end=charsEndIndex(strSymbols,stringToArray(chars))+1;return castSlice(strSymbols,0,end).join('');}/**
     * Removes leading whitespace or specified characters from `string`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category String
     * @param {string} [string=''] The string to trim.
     * @param {string} [chars=whitespace] The characters to trim.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {string} Returns the trimmed string.
     * @example
     *
     * _.trimStart('  abc  ');
     * // => 'abc  '
     *
     * _.trimStart('-_-abc-_-', '_-');
     * // => 'abc-_-'
     */function trimStart(string,chars,guard){string=toString(string);if(string&&(guard||chars===undefined)){return string.replace(reTrimStart,'');}if(!string||!(chars=baseToString(chars))){return string;}var strSymbols=stringToArray(string),start=charsStartIndex(strSymbols,stringToArray(chars));return castSlice(strSymbols,start).join('');}/**
     * Truncates `string` if it's longer than the given maximum string length.
     * The last characters of the truncated string are replaced with the omission
     * string which defaults to "...".
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category String
     * @param {string} [string=''] The string to truncate.
     * @param {Object} [options={}] The options object.
     * @param {number} [options.length=30] The maximum string length.
     * @param {string} [options.omission='...'] The string to indicate text is omitted.
     * @param {RegExp|string} [options.separator] The separator pattern to truncate to.
     * @returns {string} Returns the truncated string.
     * @example
     *
     * _.truncate('hi-diddly-ho there, neighborino');
     * // => 'hi-diddly-ho there, neighbo...'
     *
     * _.truncate('hi-diddly-ho there, neighborino', {
     *   'length': 24,
     *   'separator': ' '
     * });
     * // => 'hi-diddly-ho there,...'
     *
     * _.truncate('hi-diddly-ho there, neighborino', {
     *   'length': 24,
     *   'separator': /,? +/
     * });
     * // => 'hi-diddly-ho there...'
     *
     * _.truncate('hi-diddly-ho there, neighborino', {
     *   'omission': ' [...]'
     * });
     * // => 'hi-diddly-ho there, neig [...]'
     */function truncate(string,options){var length=DEFAULT_TRUNC_LENGTH,omission=DEFAULT_TRUNC_OMISSION;if(isObject(options)){var separator='separator'in options?options.separator:separator;length='length'in options?toInteger(options.length):length;omission='omission'in options?baseToString(options.omission):omission;}string=toString(string);var strLength=string.length;if(hasUnicode(string)){var strSymbols=stringToArray(string);strLength=strSymbols.length;}if(length>=strLength){return string;}var end=length-stringSize(omission);if(end<1){return omission;}var result=strSymbols?castSlice(strSymbols,0,end).join(''):string.slice(0,end);if(separator===undefined){return result+omission;}if(strSymbols){end+=result.length-end;}if(isRegExp(separator)){if(string.slice(end).search(separator)){var match,substring=result;if(!separator.global){separator=RegExp(separator.source,toString(reFlags.exec(separator))+'g');}separator.lastIndex=0;while(match=separator.exec(substring)){var newEnd=match.index;}result=result.slice(0,newEnd===undefined?end:newEnd);}}else if(string.indexOf(baseToString(separator),end)!=end){var index=result.lastIndexOf(separator);if(index>-1){result=result.slice(0,index);}}return result+omission;}/**
     * The inverse of `_.escape`; this method converts the HTML entities
     * `&amp;`, `&lt;`, `&gt;`, `&quot;`, and `&#39;` in `string` to
     * their corresponding characters.
     *
     * **Note:** No other HTML entities are unescaped. To unescape additional
     * HTML entities use a third-party library like [_he_](https://mths.be/he).
     *
     * @static
     * @memberOf _
     * @since 0.6.0
     * @category String
     * @param {string} [string=''] The string to unescape.
     * @returns {string} Returns the unescaped string.
     * @example
     *
     * _.unescape('fred, barney, &amp; pebbles');
     * // => 'fred, barney, & pebbles'
     */function unescape(string){string=toString(string);return string&&reHasEscapedHtml.test(string)?string.replace(reEscapedHtml,unescapeHtmlChar):string;}/**
     * Converts `string`, as space separated words, to upper case.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the upper cased string.
     * @example
     *
     * _.upperCase('--foo-bar');
     * // => 'FOO BAR'
     *
     * _.upperCase('fooBar');
     * // => 'FOO BAR'
     *
     * _.upperCase('__foo_bar__');
     * // => 'FOO BAR'
     */var upperCase=createCompounder(function(result,word,index){return result+(index?' ':'')+word.toUpperCase();});/**
     * Converts the first character of `string` to upper case.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category String
     * @param {string} [string=''] The string to convert.
     * @returns {string} Returns the converted string.
     * @example
     *
     * _.upperFirst('fred');
     * // => 'Fred'
     *
     * _.upperFirst('FRED');
     * // => 'FRED'
     */var upperFirst=createCaseFirst('toUpperCase');/**
     * Splits `string` into an array of its words.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category String
     * @param {string} [string=''] The string to inspect.
     * @param {RegExp|string} [pattern] The pattern to match words.
     * @param- {Object} [guard] Enables use as an iteratee for methods like `_.map`.
     * @returns {Array} Returns the words of `string`.
     * @example
     *
     * _.words('fred, barney, & pebbles');
     * // => ['fred', 'barney', 'pebbles']
     *
     * _.words('fred, barney, & pebbles', /[^, ]+/g);
     * // => ['fred', 'barney', '&', 'pebbles']
     */function words(string,pattern,guard){string=toString(string);pattern=guard?undefined:pattern;if(pattern===undefined){return hasUnicodeWord(string)?unicodeWords(string):asciiWords(string);}return string.match(pattern)||[];}/*------------------------------------------------------------------------*//**
     * Attempts to invoke `func`, returning either the result or the caught error
     * object. Any additional arguments are provided to `func` when it's invoked.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Util
     * @param {Function} func The function to attempt.
     * @param {...*} [args] The arguments to invoke `func` with.
     * @returns {*} Returns the `func` result or error object.
     * @example
     *
     * // Avoid throwing errors for invalid selectors.
     * var elements = _.attempt(function(selector) {
     *   return document.querySelectorAll(selector);
     * }, '>_>');
     *
     * if (_.isError(elements)) {
     *   elements = [];
     * }
     */var attempt=baseRest(function(func,args){try{return apply(func,undefined,args);}catch(e){return isError(e)?e:new Error(e);}});/**
     * Binds methods of an object to the object itself, overwriting the existing
     * method.
     *
     * **Note:** This method doesn't set the "length" property of bound functions.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Util
     * @param {Object} object The object to bind and assign the bound methods to.
     * @param {...(string|string[])} methodNames The object method names to bind.
     * @returns {Object} Returns `object`.
     * @example
     *
     * var view = {
     *   'label': 'docs',
     *   'click': function() {
     *     console.log('clicked ' + this.label);
     *   }
     * };
     *
     * _.bindAll(view, ['click']);
     * jQuery(element).on('click', view.click);
     * // => Logs 'clicked docs' when clicked.
     */var bindAll=flatRest(function(object,methodNames){arrayEach(methodNames,function(key){key=toKey(key);baseAssignValue(object,key,bind(object[key],object));});return object;});/**
     * Creates a function that iterates over `pairs` and invokes the corresponding
     * function of the first predicate to return truthy. The predicate-function
     * pairs are invoked with the `this` binding and arguments of the created
     * function.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Util
     * @param {Array} pairs The predicate-function pairs.
     * @returns {Function} Returns the new composite function.
     * @example
     *
     * var func = _.cond([
     *   [_.matches({ 'a': 1 }),           _.constant('matches A')],
     *   [_.conforms({ 'b': _.isNumber }), _.constant('matches B')],
     *   [_.stubTrue,                      _.constant('no match')]
     * ]);
     *
     * func({ 'a': 1, 'b': 2 });
     * // => 'matches A'
     *
     * func({ 'a': 0, 'b': 1 });
     * // => 'matches B'
     *
     * func({ 'a': '1', 'b': '2' });
     * // => 'no match'
     */function cond(pairs){var length=pairs==null?0:pairs.length,toIteratee=getIteratee();pairs=!length?[]:arrayMap(pairs,function(pair){if(typeof pair[1]!='function'){throw new TypeError(FUNC_ERROR_TEXT);}return[toIteratee(pair[0]),pair[1]];});return baseRest(function(args){var index=-1;while(++index<length){var pair=pairs[index];if(apply(pair[0],this,args)){return apply(pair[1],this,args);}}});}/**
     * Creates a function that invokes the predicate properties of `source` with
     * the corresponding property values of a given object, returning `true` if
     * all predicates return truthy, else `false`.
     *
     * **Note:** The created function is equivalent to `_.conformsTo` with
     * `source` partially applied.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Util
     * @param {Object} source The object of property predicates to conform to.
     * @returns {Function} Returns the new spec function.
     * @example
     *
     * var objects = [
     *   { 'a': 2, 'b': 1 },
     *   { 'a': 1, 'b': 2 }
     * ];
     *
     * _.filter(objects, _.conforms({ 'b': function(n) { return n > 1; } }));
     * // => [{ 'a': 1, 'b': 2 }]
     */function conforms(source){return baseConforms(baseClone(source,CLONE_DEEP_FLAG));}/**
     * Creates a function that returns `value`.
     *
     * @static
     * @memberOf _
     * @since 2.4.0
     * @category Util
     * @param {*} value The value to return from the new function.
     * @returns {Function} Returns the new constant function.
     * @example
     *
     * var objects = _.times(2, _.constant({ 'a': 1 }));
     *
     * console.log(objects);
     * // => [{ 'a': 1 }, { 'a': 1 }]
     *
     * console.log(objects[0] === objects[1]);
     * // => true
     */function constant(value){return function(){return value;};}/**
     * Checks `value` to determine whether a default value should be returned in
     * its place. The `defaultValue` is returned if `value` is `NaN`, `null`,
     * or `undefined`.
     *
     * @static
     * @memberOf _
     * @since 4.14.0
     * @category Util
     * @param {*} value The value to check.
     * @param {*} defaultValue The default value.
     * @returns {*} Returns the resolved value.
     * @example
     *
     * _.defaultTo(1, 10);
     * // => 1
     *
     * _.defaultTo(undefined, 10);
     * // => 10
     */function defaultTo(value,defaultValue){return value==null||value!==value?defaultValue:value;}/**
     * Creates a function that returns the result of invoking the given functions
     * with the `this` binding of the created function, where each successive
     * invocation is supplied the return value of the previous.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Util
     * @param {...(Function|Function[])} [funcs] The functions to invoke.
     * @returns {Function} Returns the new composite function.
     * @see _.flowRight
     * @example
     *
     * function square(n) {
     *   return n * n;
     * }
     *
     * var addSquare = _.flow([_.add, square]);
     * addSquare(1, 2);
     * // => 9
     */var flow=createFlow();/**
     * This method is like `_.flow` except that it creates a function that
     * invokes the given functions from right to left.
     *
     * @static
     * @since 3.0.0
     * @memberOf _
     * @category Util
     * @param {...(Function|Function[])} [funcs] The functions to invoke.
     * @returns {Function} Returns the new composite function.
     * @see _.flow
     * @example
     *
     * function square(n) {
     *   return n * n;
     * }
     *
     * var addSquare = _.flowRight([square, _.add]);
     * addSquare(1, 2);
     * // => 9
     */var flowRight=createFlow(true);/**
     * This method returns the first argument it receives.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Util
     * @param {*} value Any value.
     * @returns {*} Returns `value`.
     * @example
     *
     * var object = { 'a': 1 };
     *
     * console.log(_.identity(object) === object);
     * // => true
     */function identity(value){return value;}/**
     * Creates a function that invokes `func` with the arguments of the created
     * function. If `func` is a property name, the created function returns the
     * property value for a given element. If `func` is an array or object, the
     * created function returns `true` for elements that contain the equivalent
     * source properties, otherwise it returns `false`.
     *
     * @static
     * @since 4.0.0
     * @memberOf _
     * @category Util
     * @param {*} [func=_.identity] The value to convert to a callback.
     * @returns {Function} Returns the callback.
     * @example
     *
     * var users = [
     *   { 'user': 'barney', 'age': 36, 'active': true },
     *   { 'user': 'fred',   'age': 40, 'active': false }
     * ];
     *
     * // The `_.matches` iteratee shorthand.
     * _.filter(users, _.iteratee({ 'user': 'barney', 'active': true }));
     * // => [{ 'user': 'barney', 'age': 36, 'active': true }]
     *
     * // The `_.matchesProperty` iteratee shorthand.
     * _.filter(users, _.iteratee(['user', 'fred']));
     * // => [{ 'user': 'fred', 'age': 40 }]
     *
     * // The `_.property` iteratee shorthand.
     * _.map(users, _.iteratee('user'));
     * // => ['barney', 'fred']
     *
     * // Create custom iteratee shorthands.
     * _.iteratee = _.wrap(_.iteratee, function(iteratee, func) {
     *   return !_.isRegExp(func) ? iteratee(func) : function(string) {
     *     return func.test(string);
     *   };
     * });
     *
     * _.filter(['abc', 'def'], /ef/);
     * // => ['def']
     */function iteratee(func){return baseIteratee(typeof func=='function'?func:baseClone(func,CLONE_DEEP_FLAG));}/**
     * Creates a function that performs a partial deep comparison between a given
     * object and `source`, returning `true` if the given object has equivalent
     * property values, else `false`.
     *
     * **Note:** The created function is equivalent to `_.isMatch` with `source`
     * partially applied.
     *
     * Partial comparisons will match empty array and empty object `source`
     * values against any array or object value, respectively. See `_.isEqual`
     * for a list of supported value comparisons.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Util
     * @param {Object} source The object of property values to match.
     * @returns {Function} Returns the new spec function.
     * @example
     *
     * var objects = [
     *   { 'a': 1, 'b': 2, 'c': 3 },
     *   { 'a': 4, 'b': 5, 'c': 6 }
     * ];
     *
     * _.filter(objects, _.matches({ 'a': 4, 'c': 6 }));
     * // => [{ 'a': 4, 'b': 5, 'c': 6 }]
     */function matches(source){return baseMatches(baseClone(source,CLONE_DEEP_FLAG));}/**
     * Creates a function that performs a partial deep comparison between the
     * value at `path` of a given object to `srcValue`, returning `true` if the
     * object value is equivalent, else `false`.
     *
     * **Note:** Partial comparisons will match empty array and empty object
     * `srcValue` values against any array or object value, respectively. See
     * `_.isEqual` for a list of supported value comparisons.
     *
     * @static
     * @memberOf _
     * @since 3.2.0
     * @category Util
     * @param {Array|string} path The path of the property to get.
     * @param {*} srcValue The value to match.
     * @returns {Function} Returns the new spec function.
     * @example
     *
     * var objects = [
     *   { 'a': 1, 'b': 2, 'c': 3 },
     *   { 'a': 4, 'b': 5, 'c': 6 }
     * ];
     *
     * _.find(objects, _.matchesProperty('a', 4));
     * // => { 'a': 4, 'b': 5, 'c': 6 }
     */function matchesProperty(path,srcValue){return baseMatchesProperty(path,baseClone(srcValue,CLONE_DEEP_FLAG));}/**
     * Creates a function that invokes the method at `path` of a given object.
     * Any additional arguments are provided to the invoked method.
     *
     * @static
     * @memberOf _
     * @since 3.7.0
     * @category Util
     * @param {Array|string} path The path of the method to invoke.
     * @param {...*} [args] The arguments to invoke the method with.
     * @returns {Function} Returns the new invoker function.
     * @example
     *
     * var objects = [
     *   { 'a': { 'b': _.constant(2) } },
     *   { 'a': { 'b': _.constant(1) } }
     * ];
     *
     * _.map(objects, _.method('a.b'));
     * // => [2, 1]
     *
     * _.map(objects, _.method(['a', 'b']));
     * // => [2, 1]
     */var method=baseRest(function(path,args){return function(object){return baseInvoke(object,path,args);};});/**
     * The opposite of `_.method`; this method creates a function that invokes
     * the method at a given path of `object`. Any additional arguments are
     * provided to the invoked method.
     *
     * @static
     * @memberOf _
     * @since 3.7.0
     * @category Util
     * @param {Object} object The object to query.
     * @param {...*} [args] The arguments to invoke the method with.
     * @returns {Function} Returns the new invoker function.
     * @example
     *
     * var array = _.times(3, _.constant),
     *     object = { 'a': array, 'b': array, 'c': array };
     *
     * _.map(['a[2]', 'c[0]'], _.methodOf(object));
     * // => [2, 0]
     *
     * _.map([['a', '2'], ['c', '0']], _.methodOf(object));
     * // => [2, 0]
     */var methodOf=baseRest(function(object,args){return function(path){return baseInvoke(object,path,args);};});/**
     * Adds all own enumerable string keyed function properties of a source
     * object to the destination object. If `object` is a function, then methods
     * are added to its prototype as well.
     *
     * **Note:** Use `_.runInContext` to create a pristine `lodash` function to
     * avoid conflicts caused by modifying the original.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Util
     * @param {Function|Object} [object=lodash] The destination object.
     * @param {Object} source The object of functions to add.
     * @param {Object} [options={}] The options object.
     * @param {boolean} [options.chain=true] Specify whether mixins are chainable.
     * @returns {Function|Object} Returns `object`.
     * @example
     *
     * function vowels(string) {
     *   return _.filter(string, function(v) {
     *     return /[aeiou]/i.test(v);
     *   });
     * }
     *
     * _.mixin({ 'vowels': vowels });
     * _.vowels('fred');
     * // => ['e']
     *
     * _('fred').vowels().value();
     * // => ['e']
     *
     * _.mixin({ 'vowels': vowels }, { 'chain': false });
     * _('fred').vowels();
     * // => ['e']
     */function mixin(object,source,options){var props=keys(source),methodNames=baseFunctions(source,props);if(options==null&&!(isObject(source)&&(methodNames.length||!props.length))){options=source;source=object;object=this;methodNames=baseFunctions(source,keys(source));}var chain=!(isObject(options)&&'chain'in options)||!!options.chain,isFunc=isFunction(object);arrayEach(methodNames,function(methodName){var func=source[methodName];object[methodName]=func;if(isFunc){object.prototype[methodName]=function(){var chainAll=this.__chain__;if(chain||chainAll){var result=object(this.__wrapped__),actions=result.__actions__=copyArray(this.__actions__);actions.push({'func':func,'args':arguments,'thisArg':object});result.__chain__=chainAll;return result;}return func.apply(object,arrayPush([this.value()],arguments));};}});return object;}/**
     * Reverts the `_` variable to its previous value and returns a reference to
     * the `lodash` function.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Util
     * @returns {Function} Returns the `lodash` function.
     * @example
     *
     * var lodash = _.noConflict();
     */function noConflict(){if(root._===this){root._=oldDash;}return this;}/**
     * This method returns `undefined`.
     *
     * @static
     * @memberOf _
     * @since 2.3.0
     * @category Util
     * @example
     *
     * _.times(2, _.noop);
     * // => [undefined, undefined]
     */function noop(){}// No operation performed.
/**
     * Creates a function that gets the argument at index `n`. If `n` is negative,
     * the nth argument from the end is returned.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Util
     * @param {number} [n=0] The index of the argument to return.
     * @returns {Function} Returns the new pass-thru function.
     * @example
     *
     * var func = _.nthArg(1);
     * func('a', 'b', 'c', 'd');
     * // => 'b'
     *
     * var func = _.nthArg(-2);
     * func('a', 'b', 'c', 'd');
     * // => 'c'
     */function nthArg(n){n=toInteger(n);return baseRest(function(args){return baseNth(args,n);});}/**
     * Creates a function that invokes `iteratees` with the arguments it receives
     * and returns their results.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Util
     * @param {...(Function|Function[])} [iteratees=[_.identity]]
     *  The iteratees to invoke.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var func = _.over([Math.max, Math.min]);
     *
     * func(1, 2, 3, 4);
     * // => [4, 1]
     */var over=createOver(arrayMap);/**
     * Creates a function that checks if **all** of the `predicates` return
     * truthy when invoked with the arguments it receives.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Util
     * @param {...(Function|Function[])} [predicates=[_.identity]]
     *  The predicates to check.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var func = _.overEvery([Boolean, isFinite]);
     *
     * func('1');
     * // => true
     *
     * func(null);
     * // => false
     *
     * func(NaN);
     * // => false
     */var overEvery=createOver(arrayEvery);/**
     * Creates a function that checks if **any** of the `predicates` return
     * truthy when invoked with the arguments it receives.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Util
     * @param {...(Function|Function[])} [predicates=[_.identity]]
     *  The predicates to check.
     * @returns {Function} Returns the new function.
     * @example
     *
     * var func = _.overSome([Boolean, isFinite]);
     *
     * func('1');
     * // => true
     *
     * func(null);
     * // => true
     *
     * func(NaN);
     * // => false
     */var overSome=createOver(arraySome);/**
     * Creates a function that returns the value at `path` of a given object.
     *
     * @static
     * @memberOf _
     * @since 2.4.0
     * @category Util
     * @param {Array|string} path The path of the property to get.
     * @returns {Function} Returns the new accessor function.
     * @example
     *
     * var objects = [
     *   { 'a': { 'b': 2 } },
     *   { 'a': { 'b': 1 } }
     * ];
     *
     * _.map(objects, _.property('a.b'));
     * // => [2, 1]
     *
     * _.map(_.sortBy(objects, _.property(['a', 'b'])), 'a.b');
     * // => [1, 2]
     */function property(path){return isKey(path)?baseProperty(toKey(path)):basePropertyDeep(path);}/**
     * The opposite of `_.property`; this method creates a function that returns
     * the value at a given path of `object`.
     *
     * @static
     * @memberOf _
     * @since 3.0.0
     * @category Util
     * @param {Object} object The object to query.
     * @returns {Function} Returns the new accessor function.
     * @example
     *
     * var array = [0, 1, 2],
     *     object = { 'a': array, 'b': array, 'c': array };
     *
     * _.map(['a[2]', 'c[0]'], _.propertyOf(object));
     * // => [2, 0]
     *
     * _.map([['a', '2'], ['c', '0']], _.propertyOf(object));
     * // => [2, 0]
     */function propertyOf(object){return function(path){return object==null?undefined:baseGet(object,path);};}/**
     * Creates an array of numbers (positive and/or negative) progressing from
     * `start` up to, but not including, `end`. A step of `-1` is used if a negative
     * `start` is specified without an `end` or `step`. If `end` is not specified,
     * it's set to `start` with `start` then set to `0`.
     *
     * **Note:** JavaScript follows the IEEE-754 standard for resolving
     * floating-point values which can produce unexpected results.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Util
     * @param {number} [start=0] The start of the range.
     * @param {number} end The end of the range.
     * @param {number} [step=1] The value to increment or decrement by.
     * @returns {Array} Returns the range of numbers.
     * @see _.inRange, _.rangeRight
     * @example
     *
     * _.range(4);
     * // => [0, 1, 2, 3]
     *
     * _.range(-4);
     * // => [0, -1, -2, -3]
     *
     * _.range(1, 5);
     * // => [1, 2, 3, 4]
     *
     * _.range(0, 20, 5);
     * // => [0, 5, 10, 15]
     *
     * _.range(0, -4, -1);
     * // => [0, -1, -2, -3]
     *
     * _.range(1, 4, 0);
     * // => [1, 1, 1]
     *
     * _.range(0);
     * // => []
     */var range=createRange();/**
     * This method is like `_.range` except that it populates values in
     * descending order.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Util
     * @param {number} [start=0] The start of the range.
     * @param {number} end The end of the range.
     * @param {number} [step=1] The value to increment or decrement by.
     * @returns {Array} Returns the range of numbers.
     * @see _.inRange, _.range
     * @example
     *
     * _.rangeRight(4);
     * // => [3, 2, 1, 0]
     *
     * _.rangeRight(-4);
     * // => [-3, -2, -1, 0]
     *
     * _.rangeRight(1, 5);
     * // => [4, 3, 2, 1]
     *
     * _.rangeRight(0, 20, 5);
     * // => [15, 10, 5, 0]
     *
     * _.rangeRight(0, -4, -1);
     * // => [-3, -2, -1, 0]
     *
     * _.rangeRight(1, 4, 0);
     * // => [1, 1, 1]
     *
     * _.rangeRight(0);
     * // => []
     */var rangeRight=createRange(true);/**
     * This method returns a new empty array.
     *
     * @static
     * @memberOf _
     * @since 4.13.0
     * @category Util
     * @returns {Array} Returns the new empty array.
     * @example
     *
     * var arrays = _.times(2, _.stubArray);
     *
     * console.log(arrays);
     * // => [[], []]
     *
     * console.log(arrays[0] === arrays[1]);
     * // => false
     */function stubArray(){return[];}/**
     * This method returns `false`.
     *
     * @static
     * @memberOf _
     * @since 4.13.0
     * @category Util
     * @returns {boolean} Returns `false`.
     * @example
     *
     * _.times(2, _.stubFalse);
     * // => [false, false]
     */function stubFalse(){return false;}/**
     * This method returns a new empty object.
     *
     * @static
     * @memberOf _
     * @since 4.13.0
     * @category Util
     * @returns {Object} Returns the new empty object.
     * @example
     *
     * var objects = _.times(2, _.stubObject);
     *
     * console.log(objects);
     * // => [{}, {}]
     *
     * console.log(objects[0] === objects[1]);
     * // => false
     */function stubObject(){return{};}/**
     * This method returns an empty string.
     *
     * @static
     * @memberOf _
     * @since 4.13.0
     * @category Util
     * @returns {string} Returns the empty string.
     * @example
     *
     * _.times(2, _.stubString);
     * // => ['', '']
     */function stubString(){return'';}/**
     * This method returns `true`.
     *
     * @static
     * @memberOf _
     * @since 4.13.0
     * @category Util
     * @returns {boolean} Returns `true`.
     * @example
     *
     * _.times(2, _.stubTrue);
     * // => [true, true]
     */function stubTrue(){return true;}/**
     * Invokes the iteratee `n` times, returning an array of the results of
     * each invocation. The iteratee is invoked with one argument; (index).
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Util
     * @param {number} n The number of times to invoke `iteratee`.
     * @param {Function} [iteratee=_.identity] The function invoked per iteration.
     * @returns {Array} Returns the array of results.
     * @example
     *
     * _.times(3, String);
     * // => ['0', '1', '2']
     *
     *  _.times(4, _.constant(0));
     * // => [0, 0, 0, 0]
     */function times(n,iteratee){n=toInteger(n);if(n<1||n>MAX_SAFE_INTEGER){return[];}var index=MAX_ARRAY_LENGTH,length=nativeMin(n,MAX_ARRAY_LENGTH);iteratee=getIteratee(iteratee);n-=MAX_ARRAY_LENGTH;var result=baseTimes(length,iteratee);while(++index<n){iteratee(index);}return result;}/**
     * Converts `value` to a property path array.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Util
     * @param {*} value The value to convert.
     * @returns {Array} Returns the new property path array.
     * @example
     *
     * _.toPath('a.b.c');
     * // => ['a', 'b', 'c']
     *
     * _.toPath('a[0].b.c');
     * // => ['a', '0', 'b', 'c']
     */function toPath(value){if(isArray(value)){return arrayMap(value,toKey);}return isSymbol(value)?[value]:copyArray(stringToPath(toString(value)));}/**
     * Generates a unique ID. If `prefix` is given, the ID is appended to it.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Util
     * @param {string} [prefix=''] The value to prefix the ID with.
     * @returns {string} Returns the unique ID.
     * @example
     *
     * _.uniqueId('contact_');
     * // => 'contact_104'
     *
     * _.uniqueId();
     * // => '105'
     */function uniqueId(prefix){var id=++idCounter;return toString(prefix)+id;}/*------------------------------------------------------------------------*//**
     * Adds two numbers.
     *
     * @static
     * @memberOf _
     * @since 3.4.0
     * @category Math
     * @param {number} augend The first number in an addition.
     * @param {number} addend The second number in an addition.
     * @returns {number} Returns the total.
     * @example
     *
     * _.add(6, 4);
     * // => 10
     */var add=createMathOperation(function(augend,addend){return augend+addend;},0);/**
     * Computes `number` rounded up to `precision`.
     *
     * @static
     * @memberOf _
     * @since 3.10.0
     * @category Math
     * @param {number} number The number to round up.
     * @param {number} [precision=0] The precision to round up to.
     * @returns {number} Returns the rounded up number.
     * @example
     *
     * _.ceil(4.006);
     * // => 5
     *
     * _.ceil(6.004, 2);
     * // => 6.01
     *
     * _.ceil(6040, -2);
     * // => 6100
     */var ceil=createRound('ceil');/**
     * Divide two numbers.
     *
     * @static
     * @memberOf _
     * @since 4.7.0
     * @category Math
     * @param {number} dividend The first number in a division.
     * @param {number} divisor The second number in a division.
     * @returns {number} Returns the quotient.
     * @example
     *
     * _.divide(6, 4);
     * // => 1.5
     */var divide=createMathOperation(function(dividend,divisor){return dividend/divisor;},1);/**
     * Computes `number` rounded down to `precision`.
     *
     * @static
     * @memberOf _
     * @since 3.10.0
     * @category Math
     * @param {number} number The number to round down.
     * @param {number} [precision=0] The precision to round down to.
     * @returns {number} Returns the rounded down number.
     * @example
     *
     * _.floor(4.006);
     * // => 4
     *
     * _.floor(0.046, 2);
     * // => 0.04
     *
     * _.floor(4060, -2);
     * // => 4000
     */var floor=createRound('floor');/**
     * Computes the maximum value of `array`. If `array` is empty or falsey,
     * `undefined` is returned.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Math
     * @param {Array} array The array to iterate over.
     * @returns {*} Returns the maximum value.
     * @example
     *
     * _.max([4, 2, 8, 6]);
     * // => 8
     *
     * _.max([]);
     * // => undefined
     */function max(array){return array&&array.length?baseExtremum(array,identity,baseGt):undefined;}/**
     * This method is like `_.max` except that it accepts `iteratee` which is
     * invoked for each element in `array` to generate the criterion by which
     * the value is ranked. The iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Math
     * @param {Array} array The array to iterate over.
     * @param {Function} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {*} Returns the maximum value.
     * @example
     *
     * var objects = [{ 'n': 1 }, { 'n': 2 }];
     *
     * _.maxBy(objects, function(o) { return o.n; });
     * // => { 'n': 2 }
     *
     * // The `_.property` iteratee shorthand.
     * _.maxBy(objects, 'n');
     * // => { 'n': 2 }
     */function maxBy(array,iteratee){return array&&array.length?baseExtremum(array,getIteratee(iteratee,2),baseGt):undefined;}/**
     * Computes the mean of the values in `array`.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Math
     * @param {Array} array The array to iterate over.
     * @returns {number} Returns the mean.
     * @example
     *
     * _.mean([4, 2, 8, 6]);
     * // => 5
     */function mean(array){return baseMean(array,identity);}/**
     * This method is like `_.mean` except that it accepts `iteratee` which is
     * invoked for each element in `array` to generate the value to be averaged.
     * The iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @since 4.7.0
     * @category Math
     * @param {Array} array The array to iterate over.
     * @param {Function} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {number} Returns the mean.
     * @example
     *
     * var objects = [{ 'n': 4 }, { 'n': 2 }, { 'n': 8 }, { 'n': 6 }];
     *
     * _.meanBy(objects, function(o) { return o.n; });
     * // => 5
     *
     * // The `_.property` iteratee shorthand.
     * _.meanBy(objects, 'n');
     * // => 5
     */function meanBy(array,iteratee){return baseMean(array,getIteratee(iteratee,2));}/**
     * Computes the minimum value of `array`. If `array` is empty or falsey,
     * `undefined` is returned.
     *
     * @static
     * @since 0.1.0
     * @memberOf _
     * @category Math
     * @param {Array} array The array to iterate over.
     * @returns {*} Returns the minimum value.
     * @example
     *
     * _.min([4, 2, 8, 6]);
     * // => 2
     *
     * _.min([]);
     * // => undefined
     */function min(array){return array&&array.length?baseExtremum(array,identity,baseLt):undefined;}/**
     * This method is like `_.min` except that it accepts `iteratee` which is
     * invoked for each element in `array` to generate the criterion by which
     * the value is ranked. The iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Math
     * @param {Array} array The array to iterate over.
     * @param {Function} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {*} Returns the minimum value.
     * @example
     *
     * var objects = [{ 'n': 1 }, { 'n': 2 }];
     *
     * _.minBy(objects, function(o) { return o.n; });
     * // => { 'n': 1 }
     *
     * // The `_.property` iteratee shorthand.
     * _.minBy(objects, 'n');
     * // => { 'n': 1 }
     */function minBy(array,iteratee){return array&&array.length?baseExtremum(array,getIteratee(iteratee,2),baseLt):undefined;}/**
     * Multiply two numbers.
     *
     * @static
     * @memberOf _
     * @since 4.7.0
     * @category Math
     * @param {number} multiplier The first number in a multiplication.
     * @param {number} multiplicand The second number in a multiplication.
     * @returns {number} Returns the product.
     * @example
     *
     * _.multiply(6, 4);
     * // => 24
     */var multiply=createMathOperation(function(multiplier,multiplicand){return multiplier*multiplicand;},1);/**
     * Computes `number` rounded to `precision`.
     *
     * @static
     * @memberOf _
     * @since 3.10.0
     * @category Math
     * @param {number} number The number to round.
     * @param {number} [precision=0] The precision to round to.
     * @returns {number} Returns the rounded number.
     * @example
     *
     * _.round(4.006);
     * // => 4
     *
     * _.round(4.006, 2);
     * // => 4.01
     *
     * _.round(4060, -2);
     * // => 4100
     */var round=createRound('round');/**
     * Subtract two numbers.
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Math
     * @param {number} minuend The first number in a subtraction.
     * @param {number} subtrahend The second number in a subtraction.
     * @returns {number} Returns the difference.
     * @example
     *
     * _.subtract(6, 4);
     * // => 2
     */var subtract=createMathOperation(function(minuend,subtrahend){return minuend-subtrahend;},0);/**
     * Computes the sum of the values in `array`.
     *
     * @static
     * @memberOf _
     * @since 3.4.0
     * @category Math
     * @param {Array} array The array to iterate over.
     * @returns {number} Returns the sum.
     * @example
     *
     * _.sum([4, 2, 8, 6]);
     * // => 20
     */function sum(array){return array&&array.length?baseSum(array,identity):0;}/**
     * This method is like `_.sum` except that it accepts `iteratee` which is
     * invoked for each element in `array` to generate the value to be summed.
     * The iteratee is invoked with one argument: (value).
     *
     * @static
     * @memberOf _
     * @since 4.0.0
     * @category Math
     * @param {Array} array The array to iterate over.
     * @param {Function} [iteratee=_.identity] The iteratee invoked per element.
     * @returns {number} Returns the sum.
     * @example
     *
     * var objects = [{ 'n': 4 }, { 'n': 2 }, { 'n': 8 }, { 'n': 6 }];
     *
     * _.sumBy(objects, function(o) { return o.n; });
     * // => 20
     *
     * // The `_.property` iteratee shorthand.
     * _.sumBy(objects, 'n');
     * // => 20
     */function sumBy(array,iteratee){return array&&array.length?baseSum(array,getIteratee(iteratee,2)):0;}/*------------------------------------------------------------------------*/// Add methods that return wrapped values in chain sequences.
lodash.after=after;lodash.ary=ary;lodash.assign=assign;lodash.assignIn=assignIn;lodash.assignInWith=assignInWith;lodash.assignWith=assignWith;lodash.at=at;lodash.before=before;lodash.bind=bind;lodash.bindAll=bindAll;lodash.bindKey=bindKey;lodash.castArray=castArray;lodash.chain=chain;lodash.chunk=chunk;lodash.compact=compact;lodash.concat=concat;lodash.cond=cond;lodash.conforms=conforms;lodash.constant=constant;lodash.countBy=countBy;lodash.create=create;lodash.curry=curry;lodash.curryRight=curryRight;lodash.debounce=debounce;lodash.defaults=defaults;lodash.defaultsDeep=defaultsDeep;lodash.defer=defer;lodash.delay=delay;lodash.difference=difference;lodash.differenceBy=differenceBy;lodash.differenceWith=differenceWith;lodash.drop=drop;lodash.dropRight=dropRight;lodash.dropRightWhile=dropRightWhile;lodash.dropWhile=dropWhile;lodash.fill=fill;lodash.filter=filter;lodash.flatMap=flatMap;lodash.flatMapDeep=flatMapDeep;lodash.flatMapDepth=flatMapDepth;lodash.flatten=flatten;lodash.flattenDeep=flattenDeep;lodash.flattenDepth=flattenDepth;lodash.flip=flip;lodash.flow=flow;lodash.flowRight=flowRight;lodash.fromPairs=fromPairs;lodash.functions=functions;lodash.functionsIn=functionsIn;lodash.groupBy=groupBy;lodash.initial=initial;lodash.intersection=intersection;lodash.intersectionBy=intersectionBy;lodash.intersectionWith=intersectionWith;lodash.invert=invert;lodash.invertBy=invertBy;lodash.invokeMap=invokeMap;lodash.iteratee=iteratee;lodash.keyBy=keyBy;lodash.keys=keys;lodash.keysIn=keysIn;lodash.map=map;lodash.mapKeys=mapKeys;lodash.mapValues=mapValues;lodash.matches=matches;lodash.matchesProperty=matchesProperty;lodash.memoize=memoize;lodash.merge=merge;lodash.mergeWith=mergeWith;lodash.method=method;lodash.methodOf=methodOf;lodash.mixin=mixin;lodash.negate=negate;lodash.nthArg=nthArg;lodash.omit=omit;lodash.omitBy=omitBy;lodash.once=once;lodash.orderBy=orderBy;lodash.over=over;lodash.overArgs=overArgs;lodash.overEvery=overEvery;lodash.overSome=overSome;lodash.partial=partial;lodash.partialRight=partialRight;lodash.partition=partition;lodash.pick=pick;lodash.pickBy=pickBy;lodash.property=property;lodash.propertyOf=propertyOf;lodash.pull=pull;lodash.pullAll=pullAll;lodash.pullAllBy=pullAllBy;lodash.pullAllWith=pullAllWith;lodash.pullAt=pullAt;lodash.range=range;lodash.rangeRight=rangeRight;lodash.rearg=rearg;lodash.reject=reject;lodash.remove=remove;lodash.rest=rest;lodash.reverse=reverse;lodash.sampleSize=sampleSize;lodash.set=set;lodash.setWith=setWith;lodash.shuffle=shuffle;lodash.slice=slice;lodash.sortBy=sortBy;lodash.sortedUniq=sortedUniq;lodash.sortedUniqBy=sortedUniqBy;lodash.split=split;lodash.spread=spread;lodash.tail=tail;lodash.take=take;lodash.takeRight=takeRight;lodash.takeRightWhile=takeRightWhile;lodash.takeWhile=takeWhile;lodash.tap=tap;lodash.throttle=throttle;lodash.thru=thru;lodash.toArray=toArray;lodash.toPairs=toPairs;lodash.toPairsIn=toPairsIn;lodash.toPath=toPath;lodash.toPlainObject=toPlainObject;lodash.transform=transform;lodash.unary=unary;lodash.union=union;lodash.unionBy=unionBy;lodash.unionWith=unionWith;lodash.uniq=uniq;lodash.uniqBy=uniqBy;lodash.uniqWith=uniqWith;lodash.unset=unset;lodash.unzip=unzip;lodash.unzipWith=unzipWith;lodash.update=update;lodash.updateWith=updateWith;lodash.values=values;lodash.valuesIn=valuesIn;lodash.without=without;lodash.words=words;lodash.wrap=wrap;lodash.xor=xor;lodash.xorBy=xorBy;lodash.xorWith=xorWith;lodash.zip=zip;lodash.zipObject=zipObject;lodash.zipObjectDeep=zipObjectDeep;lodash.zipWith=zipWith;// Add aliases.
lodash.entries=toPairs;lodash.entriesIn=toPairsIn;lodash.extend=assignIn;lodash.extendWith=assignInWith;// Add methods to `lodash.prototype`.
mixin(lodash,lodash);/*------------------------------------------------------------------------*/// Add methods that return unwrapped values in chain sequences.
lodash.add=add;lodash.attempt=attempt;lodash.camelCase=camelCase;lodash.capitalize=capitalize;lodash.ceil=ceil;lodash.clamp=clamp;lodash.clone=clone;lodash.cloneDeep=cloneDeep;lodash.cloneDeepWith=cloneDeepWith;lodash.cloneWith=cloneWith;lodash.conformsTo=conformsTo;lodash.deburr=deburr;lodash.defaultTo=defaultTo;lodash.divide=divide;lodash.endsWith=endsWith;lodash.eq=eq;lodash.escape=escape;lodash.escapeRegExp=escapeRegExp;lodash.every=every;lodash.find=find;lodash.findIndex=findIndex;lodash.findKey=findKey;lodash.findLast=findLast;lodash.findLastIndex=findLastIndex;lodash.findLastKey=findLastKey;lodash.floor=floor;lodash.forEach=forEach;lodash.forEachRight=forEachRight;lodash.forIn=forIn;lodash.forInRight=forInRight;lodash.forOwn=forOwn;lodash.forOwnRight=forOwnRight;lodash.get=get;lodash.gt=gt;lodash.gte=gte;lodash.has=has;lodash.hasIn=hasIn;lodash.head=head;lodash.identity=identity;lodash.includes=includes;lodash.indexOf=indexOf;lodash.inRange=inRange;lodash.invoke=invoke;lodash.isArguments=isArguments;lodash.isArray=isArray;lodash.isArrayBuffer=isArrayBuffer;lodash.isArrayLike=isArrayLike;lodash.isArrayLikeObject=isArrayLikeObject;lodash.isBoolean=isBoolean;lodash.isBuffer=isBuffer;lodash.isDate=isDate;lodash.isElement=isElement;lodash.isEmpty=isEmpty;lodash.isEqual=isEqual;lodash.isEqualWith=isEqualWith;lodash.isError=isError;lodash.isFinite=isFinite;lodash.isFunction=isFunction;lodash.isInteger=isInteger;lodash.isLength=isLength;lodash.isMap=isMap;lodash.isMatch=isMatch;lodash.isMatchWith=isMatchWith;lodash.isNaN=isNaN;lodash.isNative=isNative;lodash.isNil=isNil;lodash.isNull=isNull;lodash.isNumber=isNumber;lodash.isObject=isObject;lodash.isObjectLike=isObjectLike;lodash.isPlainObject=isPlainObject;lodash.isRegExp=isRegExp;lodash.isSafeInteger=isSafeInteger;lodash.isSet=isSet;lodash.isString=isString;lodash.isSymbol=isSymbol;lodash.isTypedArray=isTypedArray;lodash.isUndefined=isUndefined;lodash.isWeakMap=isWeakMap;lodash.isWeakSet=isWeakSet;lodash.join=join;lodash.kebabCase=kebabCase;lodash.last=last;lodash.lastIndexOf=lastIndexOf;lodash.lowerCase=lowerCase;lodash.lowerFirst=lowerFirst;lodash.lt=lt;lodash.lte=lte;lodash.max=max;lodash.maxBy=maxBy;lodash.mean=mean;lodash.meanBy=meanBy;lodash.min=min;lodash.minBy=minBy;lodash.stubArray=stubArray;lodash.stubFalse=stubFalse;lodash.stubObject=stubObject;lodash.stubString=stubString;lodash.stubTrue=stubTrue;lodash.multiply=multiply;lodash.nth=nth;lodash.noConflict=noConflict;lodash.noop=noop;lodash.now=now;lodash.pad=pad;lodash.padEnd=padEnd;lodash.padStart=padStart;lodash.parseInt=parseInt;lodash.random=random;lodash.reduce=reduce;lodash.reduceRight=reduceRight;lodash.repeat=repeat;lodash.replace=replace;lodash.result=result;lodash.round=round;lodash.runInContext=runInContext;lodash.sample=sample;lodash.size=size;lodash.snakeCase=snakeCase;lodash.some=some;lodash.sortedIndex=sortedIndex;lodash.sortedIndexBy=sortedIndexBy;lodash.sortedIndexOf=sortedIndexOf;lodash.sortedLastIndex=sortedLastIndex;lodash.sortedLastIndexBy=sortedLastIndexBy;lodash.sortedLastIndexOf=sortedLastIndexOf;lodash.startCase=startCase;lodash.startsWith=startsWith;lodash.subtract=subtract;lodash.sum=sum;lodash.sumBy=sumBy;lodash.template=template;lodash.times=times;lodash.toFinite=toFinite;lodash.toInteger=toInteger;lodash.toLength=toLength;lodash.toLower=toLower;lodash.toNumber=toNumber;lodash.toSafeInteger=toSafeInteger;lodash.toString=toString;lodash.toUpper=toUpper;lodash.trim=trim;lodash.trimEnd=trimEnd;lodash.trimStart=trimStart;lodash.truncate=truncate;lodash.unescape=unescape;lodash.uniqueId=uniqueId;lodash.upperCase=upperCase;lodash.upperFirst=upperFirst;// Add aliases.
lodash.each=forEach;lodash.eachRight=forEachRight;lodash.first=head;mixin(lodash,function(){var source={};baseForOwn(lodash,function(func,methodName){if(!hasOwnProperty.call(lodash.prototype,methodName)){source[methodName]=func;}});return source;}(),{'chain':false});/*------------------------------------------------------------------------*//**
     * The semantic version number.
     *
     * @static
     * @memberOf _
     * @type {string}
     */lodash.VERSION=VERSION;// Assign default placeholders.
arrayEach(['bind','bindKey','curry','curryRight','partial','partialRight'],function(methodName){lodash[methodName].placeholder=lodash;});// Add `LazyWrapper` methods for `_.drop` and `_.take` variants.
arrayEach(['drop','take'],function(methodName,index){LazyWrapper.prototype[methodName]=function(n){n=n===undefined?1:nativeMax(toInteger(n),0);var result=this.__filtered__&&!index?new LazyWrapper(this):this.clone();if(result.__filtered__){result.__takeCount__=nativeMin(n,result.__takeCount__);}else{result.__views__.push({'size':nativeMin(n,MAX_ARRAY_LENGTH),'type':methodName+(result.__dir__<0?'Right':'')});}return result;};LazyWrapper.prototype[methodName+'Right']=function(n){return this.reverse()[methodName](n).reverse();};});// Add `LazyWrapper` methods that accept an `iteratee` value.
arrayEach(['filter','map','takeWhile'],function(methodName,index){var type=index+1,isFilter=type==LAZY_FILTER_FLAG||type==LAZY_WHILE_FLAG;LazyWrapper.prototype[methodName]=function(iteratee){var result=this.clone();result.__iteratees__.push({'iteratee':getIteratee(iteratee,3),'type':type});result.__filtered__=result.__filtered__||isFilter;return result;};});// Add `LazyWrapper` methods for `_.head` and `_.last`.
arrayEach(['head','last'],function(methodName,index){var takeName='take'+(index?'Right':'');LazyWrapper.prototype[methodName]=function(){return this[takeName](1).value()[0];};});// Add `LazyWrapper` methods for `_.initial` and `_.tail`.
arrayEach(['initial','tail'],function(methodName,index){var dropName='drop'+(index?'':'Right');LazyWrapper.prototype[methodName]=function(){return this.__filtered__?new LazyWrapper(this):this[dropName](1);};});LazyWrapper.prototype.compact=function(){return this.filter(identity);};LazyWrapper.prototype.find=function(predicate){return this.filter(predicate).head();};LazyWrapper.prototype.findLast=function(predicate){return this.reverse().find(predicate);};LazyWrapper.prototype.invokeMap=baseRest(function(path,args){if(typeof path=='function'){return new LazyWrapper(this);}return this.map(function(value){return baseInvoke(value,path,args);});});LazyWrapper.prototype.reject=function(predicate){return this.filter(negate(getIteratee(predicate)));};LazyWrapper.prototype.slice=function(start,end){start=toInteger(start);var result=this;if(result.__filtered__&&(start>0||end<0)){return new LazyWrapper(result);}if(start<0){result=result.takeRight(-start);}else if(start){result=result.drop(start);}if(end!==undefined){end=toInteger(end);result=end<0?result.dropRight(-end):result.take(end-start);}return result;};LazyWrapper.prototype.takeRightWhile=function(predicate){return this.reverse().takeWhile(predicate).reverse();};LazyWrapper.prototype.toArray=function(){return this.take(MAX_ARRAY_LENGTH);};// Add `LazyWrapper` methods to `lodash.prototype`.
baseForOwn(LazyWrapper.prototype,function(func,methodName){var checkIteratee=/^(?:filter|find|map|reject)|While$/.test(methodName),isTaker=/^(?:head|last)$/.test(methodName),lodashFunc=lodash[isTaker?'take'+(methodName=='last'?'Right':''):methodName],retUnwrapped=isTaker||/^find/.test(methodName);if(!lodashFunc){return;}lodash.prototype[methodName]=function(){var value=this.__wrapped__,args=isTaker?[1]:arguments,isLazy=value instanceof LazyWrapper,iteratee=args[0],useLazy=isLazy||isArray(value);var interceptor=function interceptor(value){var result=lodashFunc.apply(lodash,arrayPush([value],args));return isTaker&&chainAll?result[0]:result;};if(useLazy&&checkIteratee&&typeof iteratee=='function'&&iteratee.length!=1){// Avoid lazy use if the iteratee has a "length" value other than `1`.
isLazy=useLazy=false;}var chainAll=this.__chain__,isHybrid=!!this.__actions__.length,isUnwrapped=retUnwrapped&&!chainAll,onlyLazy=isLazy&&!isHybrid;if(!retUnwrapped&&useLazy){value=onlyLazy?value:new LazyWrapper(this);var result=func.apply(value,args);result.__actions__.push({'func':thru,'args':[interceptor],'thisArg':undefined});return new LodashWrapper(result,chainAll);}if(isUnwrapped&&onlyLazy){return func.apply(this,args);}result=this.thru(interceptor);return isUnwrapped?isTaker?result.value()[0]:result.value():result;};});// Add `Array` methods to `lodash.prototype`.
arrayEach(['pop','push','shift','sort','splice','unshift'],function(methodName){var func=arrayProto[methodName],chainName=/^(?:push|sort|unshift)$/.test(methodName)?'tap':'thru',retUnwrapped=/^(?:pop|shift)$/.test(methodName);lodash.prototype[methodName]=function(){var args=arguments;if(retUnwrapped&&!this.__chain__){var value=this.value();return func.apply(isArray(value)?value:[],args);}return this[chainName](function(value){return func.apply(isArray(value)?value:[],args);});};});// Map minified method names to their real names.
baseForOwn(LazyWrapper.prototype,function(func,methodName){var lodashFunc=lodash[methodName];if(lodashFunc){var key=lodashFunc.name+'',names=realNames[key]||(realNames[key]=[]);names.push({'name':methodName,'func':lodashFunc});}});realNames[createHybrid(undefined,WRAP_BIND_KEY_FLAG).name]=[{'name':'wrapper','func':undefined}];// Add methods to `LazyWrapper`.
LazyWrapper.prototype.clone=lazyClone;LazyWrapper.prototype.reverse=lazyReverse;LazyWrapper.prototype.value=lazyValue;// Add chain sequence methods to the `lodash` wrapper.
lodash.prototype.at=wrapperAt;lodash.prototype.chain=wrapperChain;lodash.prototype.commit=wrapperCommit;lodash.prototype.next=wrapperNext;lodash.prototype.plant=wrapperPlant;lodash.prototype.reverse=wrapperReverse;lodash.prototype.toJSON=lodash.prototype.valueOf=lodash.prototype.value=wrapperValue;// Add lazy aliases.
lodash.prototype.first=lodash.prototype.head;if(symIterator){lodash.prototype[symIterator]=wrapperToIterator;}return lodash;};/*--------------------------------------------------------------------------*/// Export lodash.
var _=runInContext();// Some AMD build optimizers, like r.js, check for condition patterns like:
if("function"=='function'&&_typeof(__webpack_require__(0))=='object'&&__webpack_require__(0)){// Expose Lodash on the global object to prevent errors when Lodash is
// loaded by a script tag in the presence of an AMD loader.
// See http://requirejs.org/docs/errors.html#mismatch for more details.
// Use `_.noConflict` to remove Lodash from the global object.
root._=_;// Define as an anonymous module so, through path mapping, it can be
// referenced as the "underscore" module.
!(__WEBPACK_AMD_DEFINE_RESULT__ = function(){return _;}.call(exports, __webpack_require__, exports, module),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));}// Check for `exports` after `define` in case a build optimizer adds it.
else if(freeModule){// Export for Node.js.
(freeModule.exports=_)._=_;// Export for CommonJS support.
freeExports._=_;}else{// Export to the global object.
root._=_;}}).call(undefined);
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(21), __webpack_require__(22)(module)))

/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var g;

// This works in non-strict mode
g = function () {
	return this;
}();

try {
	// This works if eval is allowed (see CSP)
	g = g || Function("return this")() || (1, eval)("this");
} catch (e) {
	// This works if the window reference is available
	if ((typeof window === "undefined" ? "undefined" : _typeof(window)) === "object") g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;

/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


module.exports = function (module) {
	if (!module.webpackPolyfill) {
		module.deprecate = function () {};
		module.paths = [];
		// module.parent = undefined by default
		if (!module.children) module.children = [];
		Object.defineProperty(module, "loaded", {
			enumerable: true,
			get: function get() {
				return module.l;
			}
		});
		Object.defineProperty(module, "id", {
			enumerable: true,
			get: function get() {
				return module.i;
			}
		});
		module.webpackPolyfill = 1;
	}
	return module;
};

/***/ })
/******/ ]);