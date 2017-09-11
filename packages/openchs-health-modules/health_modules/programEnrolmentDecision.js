const allImports = {};
allImports.Mother = require('./mother/motherProgramEnrolmentDecision');
allImports.Child = require('./child/childProgramEnrolmentDecision');

module.exports = {};

module.exports.getDecisions = function (enrolment) {
    return executeProgramEnrolmentFunc({parameter: enrolment, fn: "getDecisions", defaultValue: {enrolmentDecisions: [], encounterDecisions: [], registrationDecisions: []}})
};

module.exports.getNextScheduledVisits = function (enrolment) {
    return executeProgramEnrolmentFunc({parameter: enrolment, fn: "getNextScheduledVisits"})
};

module.exports.getChecklists = function (enrolment) {
    return executeProgramEnrolmentFunc({parameter: enrolment, fn: "getChecklists"});
};

module.exports.validate = function (enrolment) {
    return executeProgramEnrolmentFunc({parameter: enrolment, fn: "validate"});
};

function targetFunction(config, programName) {
    return allImports && allImports[programName] && allImports[programName][config.fn];
}

const executeProgramEnrolmentFunc = function (config) {
    const today = new Date();
    const programName = config.parameter.program.name;
    const fn = targetFunction(config, programName);

    if (!fn) {
        console.log('(ProgramExports) Could not find program rule for ' + config.fn + ' for program ' + programName);
        return config.defaultValue || [];
    }

    return fn(config.parameter, today);
};

module.exports.executeProgramEnrolmentFunc = executeProgramEnrolmentFunc;