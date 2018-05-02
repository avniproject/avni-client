import ReferenceEntity from "./ReferenceEntity";
import General from "./utility/General";
import EncounterType from "./EncounterType";
import VisitScheduleInterval from "./VisitScheduleInterval";

class VisitScheduleConfig extends ReferenceEntity {
    static schema = {
        name: "VisitScheduleConfig",
        properties: {
            name: 'string',
            encounterType: 'EncounterType',
            interval: "VisitScheduleInterval"
        }
    };

    static fromResource(resource, entityService) {
        const visitScheduleConfig = General.assignFields(resource, new VisitScheduleConfig(), ['uuid', 'name']);
        visitScheduleConfig.encounterType = entityService.findByKey("name", resource.encounterType, EncounterType.schema.name);
        visitScheduleConfig.interval = VisitScheduleInterval.fromResource(resource.interval, entityService);
        return visitScheduleConfig;
    }

    clone() {
        return super.clone(new VisitScheduleConfig());
    }

}

export default VisitScheduleConfig;