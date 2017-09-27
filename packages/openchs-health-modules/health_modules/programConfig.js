import childProgramConfig from "./child/childProgramConfig";

const programConfigExports = {};
programConfigExports.Child = childProgramConfig;

const observationRulesExports = {};
observationRulesExports.Mother = require('./mother/motherProgramObservationRules');

const config = function (programName) {
    console.log(programName);
    if (!programName) {
        return programConfigExports;
    }

    if (programName === "Child") {
        console.log("getting config for child")
    }

    console.log(programConfigExports[programName])

    return programConfigExports[programName];
};

const observationRules = function (programName) {
    if (!programName) {
        return observationRulesExports;
    }

    var observationRules = observationRulesExports[programName];
    return observationRules ? observationRules : [];
};

export {
    config,
    observationRules
};