const allImports = {};
allImports.Mother = require('./mother/motherProgramEncounterDecision');
allImports.Child = require('./child/childProgramEncounterDecision');

module.exports = {};

function targetFunction(config, programName) {
    return allImports && allImports[programName] && allImports[programName][config.fn];
}

const executeProgramEncounterFunc = function (config) {
    const today = new Date();
    const enrolment = config.parameter.programEnrolment;
    const programName = enrolment.program.name;
    const fn = targetFunction(config, programName);

    if (!fn) {
        console.log('(ProgramExports) Could not find program rule for ' + config.fn + ' for program ' + programName);
        return config.defaultValue || [];
    }

    return fn(config.parameter, today);
};

module.exports.getDecisions = function (programEncounter) {
    return executeProgramEncounterFunc({parameter: programEncounter, fn: "getDecisions", defaultValue: {enrolmentDecisions: [], encounterDecisions: [], registrationDecisions: []}});
};

module.exports.getNextScheduledVisits = function (programEncounter) {
    return executeProgramEncounterFunc({parameter: programEncounter, fn: "getNextScheduledVisits"});
};

module.exports.executeProgramEncounterFunc = executeProgramEncounterFunc;