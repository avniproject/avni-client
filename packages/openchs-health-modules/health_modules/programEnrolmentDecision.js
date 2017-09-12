import * as Mother from './mother/motherProgramEnrolmentDecision';
import * as Child from './child/childProgramEnrolmentDecision';
const allImports = {Mother: Mother, Child: Child};

export function getDecisions (enrolment) {
    return executeProgramEnrolmentFunc({parameter: enrolment, fn: "getDecisions", defaultValue: {enrolmentDecisions: [], encounterDecisions: [], registrationDecisions: []}})
}

export function getNextScheduledVisits(enrolment) {
    return executeProgramEnrolmentFunc({parameter: enrolment, fn: "getNextScheduledVisits"})
}

export function getChecklists (enrolment) {
    return executeProgramEnrolmentFunc({parameter: enrolment, fn: "getChecklists"});
}

export function validate (enrolment) {
    return executeProgramEnrolmentFunc({parameter: enrolment, fn: "validate"});
}

function targetFunction(config, programName) {
    return allImports && allImports[programName] && allImports[programName][config.fn];
}

export function executeProgramEnrolmentFunc (config) {
    const today = new Date();
    const programName = config.parameter.program.name;
    const fn = targetFunction(config, programName);

    if (!fn) {
        console.log('(ProgramExports) Could not find program rule for ' + config.fn + ' for program ' + programName);
        return config.defaultValue || [];
    }

    return fn(config.parameter, today);
}