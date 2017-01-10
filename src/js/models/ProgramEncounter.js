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
            actualDateTime: 'date',
            programEnrolment: 'ProgramEnrolment',
            observations: {type: 'list', objectType: 'Observation'}
        }
    };

    static fromResource(resource, entityService) {
        var followupType = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "followupTypeUUID"), FollowupType.schema.name);
        var programEnrolment = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "programEnrolmentUUID"), ProgramEnrolment.schema.name);

        var programEncounter = General.assignFields(resource, new ProgramEncounter(), ["uuid"], ["scheduledDateTime", "actualDateTime"], ["observations"]);
        programEncounter.followupType = followupType;
        programEncounter.programEnrolment = programEnrolment;

        return programEncounter;
    }
}

export default ProgramEncounter;