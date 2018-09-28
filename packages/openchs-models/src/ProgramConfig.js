import ReferenceEntity from "./ReferenceEntity";
import Program from './Program';
import _ from 'lodash';
import General from "./utility/General";
import VisitScheduleConfig from "./VisitScheduleConfig";
import ResourceUtil from "./utility/ResourceUtil";
import Concept from "./Concept";

class ProgramConfig extends ReferenceEntity {
    static schema = {
        name: "ProgramConfig",
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            program: 'Program',
            atRiskConcepts: {type: 'list', objectType: 'Concept'},
            visitSchedule: {type: 'list', objectType: 'VisitScheduleConfig'}
        }
    };

    static fromResource(resource, entityService) {
        const programConfig = General.assignFields(resource, new ProgramConfig(), ['uuid']);
        programConfig.visitSchedule = _.get(resource, "visitSchedule", [])
            .map(vs => VisitScheduleConfig.fromResource(vs, entityService));
        programConfig.program = entityService.findByUUID(ResourceUtil.getUUIDFor(resource, "programUUID"), Program.schema.name);
        const conceptUUIDs = ResourceUtil.getUUIDFor(resource, "conceptUUIDs").split(",");
        programConfig.atRiskConcepts = conceptUUIDs.map(conceptUUID => entityService.findByUUID(conceptUUID, Concept.schema.name));
        return programConfig;
    }

    clone() {
        return super.clone(new ProgramConfig());
    }

}

export default ProgramConfig;