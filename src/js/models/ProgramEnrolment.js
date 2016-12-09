import General from "../utility/General";
import ResourceUtil from '../utility/ResourceUtil';
import Program from './Program';
import ProgramOutcome from './ProgramOutcome';
import ProgramEncounter from "./ProgramEncounter";
import BaseEntity from "./BaseEntity";

class ProgramEnrolment extends BaseEntity {
    static schema = {
        name: 'ProgramEnrolment',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            program: 'Program',
            enrolmentDateTime: 'date',
            programOutcome: 'ProgramOutcome',
            enrolmentProfile: {type: 'list', objectType: 'Observation'},
            encounters: {type: 'list', objectType: 'ProgramEncounter'}
        }
    };

    static fromResource(resource, entityService) {
        var program = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "programUUID"), Program.schema.name);
        var programOutcome = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "programOutcome"), ProgramOutcome.schema.name);

        var programEnrolment = General.assignFields(resource, new ProgramEnrolment(), ["uuid"], ["enrolmentDateTime"], "enrolmentProfile");
        programEnrolment.program = program;
        programEnrolment.programOutcome = programOutcome;

        return programEnrolment;
    }

    static associateChild(child, childEntityClass, childResource, entityService) {
        var programEnrolment = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(childResource, "programEnrolmentUUID"), ProgramEnrolment.schema.name);
        programEnrolment = General.pick(programEnrolment, ["uuid"], ["encounters"]);
        if (childEntityClass === ProgramEncounter)
            BaseEntity.addNewChild(child, programEnrolment.encounters);
        else
            throw `${childEntityClass.name} not support by ${ProgramEnrolment.name}`;
        return programEnrolment;
    }
}

export default ProgramEnrolment;