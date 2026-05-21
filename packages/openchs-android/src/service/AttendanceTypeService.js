import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {AttendanceType} from "avni-models";
import _ from "lodash";

@Service("attendanceTypeService")
class AttendanceTypeService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return AttendanceType.schema.name;
    }

    findActiveForSubjectType(subjectTypeUuid: string): AttendanceType[] {
        return _.sortBy(
            this.db.objects(AttendanceType.schema.name)
                .filtered("voided = false AND subjectTypeUUID = $0", subjectTypeUuid)
                .map(_.identity),
            "sortOrder"
        );
    }
}

export default AttendanceTypeService;
