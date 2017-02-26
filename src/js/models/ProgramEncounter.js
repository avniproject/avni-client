import General from "../utility/General";
import ResourceUtil from "../utility/ResourceUtil";
import FollowupType from "./FollowupType";
import ProgramEnrolment from './ProgramEnrolment';

class ProgramEncounter {
    static schema = {
        name: 'ProgramEncounter',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            followupType: 'FollowupType',
            scheduledDateTime: {type: 'date', optional: true},
            actualDateTime: {type: 'date', optional: true},
            programEnrolment: 'ProgramEnrolment',
            observations: {type: 'list', objectType: 'Observation'}
        }
    };

    static fromResource(resource, entityService) {
        const followupType = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "followupTypeUUID"), FollowupType.schema.name);
        const programEnrolment = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "programEnrolmentUUID"), ProgramEnrolment.schema.name);

        const programEncounter = General.assignFields(resource, new ProgramEncounter(), ["uuid"], ["scheduledDateTime", "actualDateTime"], ["observations"], entityService);
        programEncounter.followupType = followupType;
        programEncounter.programEnrolment = programEnrolment;

        return programEncounter;
    }
}

export default ProgramEncounter;