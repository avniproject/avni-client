import * as Mother from './mother/motherProgramEncounterDecision';
import * as Child from './child/childProgramEncounterDecision';
const allImports = {Mother: Mother, Child: Child};

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

export function getDecisions (programEncounter) {
    return executeProgramEncounterFunc({parameter: programEncounter, fn: "getDecisions", defaultValue: {enrolmentDecisions: [], encounterDecisions: [], registrationDecisions: []}});
}

export function getNextScheduledVisits (programEncounter) {
    return executeProgramEncounterFunc({parameter: programEncounter, fn: "getNextScheduledVisits"});
}

module.exports.executeProgramEncounterFunc = executeProgramEncounterFunc;