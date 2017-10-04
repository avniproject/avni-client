import childProgramConfig from "./child/childProgramConfig";
import motherProgramObservationRules from "./mother/motherProgramObservationRules";

const programConfigExports = {};
programConfigExports.Child = childProgramConfig;

const observationRulesExports = {};
observationRulesExports.Mother = motherProgramObservationRules;

const config = function (programName) {
    return !programName ? programConfigExports : programConfigExports[programName];
};

const observationRules = function (programName) {
    return !programName ? observationRulesExports : observationRulesExports[programName] || [];
};

export {
    config,
    observationRules
};