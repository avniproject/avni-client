const programEncounterExports = {};
programEncounterExports.Mother = require('./mother/motherProgramEncounterDecision');
programEncounterExports.Child = require('./child/childProgramEncounterDecision');

const programEnrolmentExports = {};
programEnrolmentExports.Mother = require('./mother/motherProgramEnrolmentDecision');
programEnrolmentExports.Child = require('./child/childProgramEnrolmentDecision');
programEnrolmentExports.Adolescent = require('./adolescent/adolescentProgramEnrolmentDecision');

const programConfigExports = {};
programConfigExports.Child = require('./child/childProgramConfig');

module.exports = {};

function targetFunction(config, programName) {
    const exports = config.type === 'enrolment' ? programEnrolmentExports : programEncounterExports;
    return exports && exports[programName] && exports[programName][config.fn];
}

module.exports.execute = function (config) {
    const today = new Date();
    const enrolment = config.type === 'enrolment' ? config.parameter : config.parameter.programEnrolment;
    const programName = enrolment.program.name;
    const fn = targetFunction(config, programName);

    if (!fn) {
        console.log('(ProgramExports) Could not find program ' + config.type + ' rule for ' + config.fn + ' for program ' + programName);
        return config.defaultValue || [];
    }

    return fn(config.parameter, today);
};

module.exports.programConfig = programConfigExports;