import * as Mother from './mother/motherProgramEncounterDecision';
import * as Child from './child/childProgramEncounterDecision';
import * as Adolescent from './adolescent/adolescentProgramEncounterDecision';
import FormElementStatus from "../../openchs-models/src/application/FormElementStatus";
const allImports = {Mother: Mother, Child: Child, Adolescent: Adolescent};

function targetFunction(fn, programName) {
    return allImports && allImports[programName] && allImports[programName][fn];
}

const executeProgramEncounterFunc = function (config, today = new Date()) {
    const enrolment = config.parameter[0].programEnrolment;
    const programName = enrolment.program.name;
    const fn = targetFunction(config.fn, programName);

    if (!fn) {
        console.log('(ProgramExports) Could not find program rule for ' + config.fn + ' for program ' + programName);
        return config.defaultValue || [];
    }

    return fn(...config.parameter, today);
};

export function getDecisions (programEncounter) {
    return executeProgramEncounterFunc({parameter: [programEncounter], fn: "getDecisions", defaultValue: {enrolmentDecisions: [], encounterDecisions: [], registrationDecisions: []}});
}

export function getNextScheduledVisits (programEncounter) {
    return executeProgramEncounterFunc({parameter: [programEncounter], fn: "getNextScheduledVisits", defaultValue: []});
}

export function filterFormElements(programEncounter, formElementGroup) {
    return executeProgramEncounterFunc({parameter: [programEncounter, formElementGroup], fn: "filterFormElements", defaultValue: formElementGroup.getFormElements().map((formElement) => new FormElementStatus(formElement.uuid, true, undefined))});
}

module.exports.executeProgramEncounterFunc = executeProgramEncounterFunc;