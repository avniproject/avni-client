const programConfigExports = {};
programConfigExports.Child = require('./child/childProgramConfig');

const observationRulesExports = {};
observationRulesExports.Mother = require('./mother/motherProgramObservationRules');

const config = function (programName) {
    if (!programName) {
        return programConfigExports;
    }

    return programConfigExports[programName];
};

const observationRules = function (programName) {
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