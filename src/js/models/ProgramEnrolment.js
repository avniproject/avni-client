import General from "../utility/General";
import ResourceUtil from "../utility/ResourceUtil";
import Program from "./Program";
import ProgramOutcome from "./ProgramOutcome";
import ProgramEncounter from "./ProgramEncounter";
import BaseEntity from "./BaseEntity";
import Individual from "./Individual";
import _ from "lodash";
import moment from "moment";

class ProgramEnrolment extends BaseEntity {
    static schema = {
        name: 'ProgramEnrolment',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            program: 'Program',
            enrolmentDateTime: 'date',
            programExitDateTime: {type: 'date', optional: true},
            programOutcome: {type: 'ProgramOutcome', optional: true},
            individual: 'Individual',
            enrolmentProfile: {type: 'list', objectType: 'Observation'},
            programExitObservations: {type: 'list', objectType: 'Observation'},
            encounters: {type: 'list', objectType: 'ProgramEncounter'}
        }
    };

    get toResource() {
        const resource = _.pick(this, ["uuid"]);
        resource["programUUID"] = this.program.uuid;
        resource.enrolmentDateTime = moment(this.enrolmentDateTime).format();
        if (!_.isNil(this.programExitDateTime)) resource.programExitDateTime = moment(this.programExitDateTime).format();
        if (!_.isNil(this.programOutcome)) resource["programOutcomeUUID"] = this.programOutcome.uuid;
        resource["individualUUID"] = this.individual.uuid;
        return resource;
    }

    static fromResource(resource, entityService) {
        const program = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "programUUID"), Program.schema.name);
        const programOutcomeUUID = ResourceUtil.getUUIDFor(resource, "programOutcomeUUID");
        const individual = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "individualUUID"), Individual.schema.name);

        const programEnrolment = General.assignFields(resource, new ProgramEnrolment(), ["uuid"], ["enrolmentDateTime", "programExitDateTime"], ["enrolmentProfile", "programExitObservations"]);
        programEnrolment.program = program;
        programEnrolment.individual = individual;

        if (!_.isNil(programOutcomeUUID)) {
            programEnrolment.programOutcome = entityService.findByKey("uuid", programOutcomeUUID, ProgramOutcome.schema.name);
        }

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

    static isActive(programEnrolment) {
        return _.isNil(programEnrolment.programExitDateTime);
    }
}

export default ProgramEnrolment;