import General from "../utility/General";
import ResourceUtil from "../utility/ResourceUtil";
import Program from "./Program";
import ProgramOutcome from "./ProgramOutcome";
import ProgramEncounter from "./ProgramEncounter";
import BaseEntity from "./BaseEntity";
import Individual from "./Individual";
import _ from "lodash";
import moment from "moment";
import ObservationsHolder from "./ObservationsHolder";

class ProgramEnrolment extends ObservationsHolder {
    static schema = {
        name: 'ProgramEnrolment',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            program: 'Program',
            enrolmentDateTime: 'date',
            observations: {type: 'list', objectType: 'Observation'},
            programExitDateTime: {type: 'date', optional: true},
            programExitObservations: {type: 'list', objectType: 'Observation'},
            programOutcome: {type: 'ProgramOutcome', optional: true},
            encounters: {type: 'list', objectType: 'ProgramEncounter'},
            individual: 'Individual'
        }
    };

    static createSafeInstance() {
        const programEnrolment = new ProgramEnrolment();
        programEnrolment.uuid = General.randomUUID();
        programEnrolment.observations = [];
        programEnrolment.programExitObservations = [];
        programEnrolment.encounters = [];
        return programEnrolment;
    }

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

        const programEnrolment = General.assignFields(resource, new ProgramEnrolment(), ["uuid"], ["enrolmentDateTime", "programExitDateTime"], ["observations", "programExitObservations"]);
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

    cloneForEdit() {
        const programEnrolment = new ProgramEnrolment();
        programEnrolment.program = _.isNil(this.program) ? null : this.program.clone();
        programEnrolment.enrolmentDateTime = this.enrolmentDateTime;
        programEnrolment.programExitDateTime = this.programExitDateTime;
        programEnrolment.programOutcome = _.isNil(this.programOutcome) ? null : this.programOutcome.clone();
        programEnrolment.individual = this.individual.cloneAsReference();
        super.clone(programEnrolment);
        programEnrolment.encounters = [];
        this.encounters.forEach((enc) => {
            const programEncounter = new ProgramEncounter();
            programEncounter.uuid = enc.uuid;
            programEnrolment.encounters.push(programEncounter);
        });
        return programEnrolment;
    }

    static validationKeys = {
        ENROLMENT_DATE: 'ENROLMENT_DATE'
    };

    validate() {
        const validationResults = [];
        validationResults.push(this.validateFieldForEmpty(this.enrolmentDateTime, ProgramEnrolment.validationKeys.ENROLMENT_DATE));
        return validationResults;
    }

    get lastFulfilledEncounter() {
        return this.encounters.length > 1 ? this.encounters[this.encounters.length - 2] : null;
    }

    get isActive() {
        return _.isNil(this.programExitDateTime);
    }
}

export default ProgramEnrolment;