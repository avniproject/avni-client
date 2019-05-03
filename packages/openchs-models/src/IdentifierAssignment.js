import ResourceUtil from "./utility/ResourceUtil";
import General from "./utility/General";
import BaseEntity from "./BaseEntity";
import Individual from "./Individual";
import ProgramEnrolment from "./ProgramEnrolment";
import IdentifierSource from "./IdentifierSource";
import moment from "moment/moment";
import _ from "lodash";

export default class IdentifierAssignment extends BaseEntity {
    static schema = {
        name: 'IdentifierAssignment',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            identifierSource: 'IdentifierSource',
            identifier: "string",
            assignmentOrder: 'double',
            individual: {type: 'Individual', optional: true},
            voided: {type: 'bool', default: false},
            programEnrolment: {type: 'ProgramEnrolment', optional: true},
        }
    };

    static fromResource(identifierAssignmentResource, entityService) {
        const identifierAssignment = General.assignFields(identifierAssignmentResource, new IdentifierAssignment(),
            ['uuid', "identifier", "assignmentOrder", "voided"]);
        identifierAssignment.identifierSource = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(identifierAssignmentResource, "identifierSourceUUID"), IdentifierSource.schema.name);
        identifierAssignment.individual = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(identifierAssignmentResource, "individualUUID"), Individual.schema.name);
        identifierAssignment.programEnrolment = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(identifierAssignmentResource, "programEnrolmentUUID"), ProgramEnrolment.schema.name);

        return identifierAssignment;
    }

    get toResource() {
        const resource = _.pick(this, ["uuid", "identifier", "assignmentOrder", "voided"]);
        resource.individualUUID = this.individual ? this.individual.uuid: null;
        resource.programEnrolmentUUID = this.programEnrolment ? this.programEnrolment.uuid: null;
        return resource;
    }

    clone() {
        let identifierAssignment = new IdentifierAssignment();
        identifierAssignment.uuid = this.uuid;
        identifierAssignment.identifierSource = this.identifierSource.clone();
        identifierAssignment.identifier = this.identifier;
        identifierAssignment.assignmentOrder = this.assignmentOrder;
        identifierAssignment.individual = this.individual && this.individual.clone();
        identifierAssignment.programEnrolment = this.programEnrolment && this.programEnrolment.clone();
        identifierAssignment.voided = this.voided;
        return identifierAssignment;
    }
}