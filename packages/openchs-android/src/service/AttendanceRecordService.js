import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {AttendanceRecord} from "avni-models";
import _ from "lodash";

@Service("attendanceRecordService")
class AttendanceRecordService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return AttendanceRecord.schema.name;
    }

    findBySession(sessionUuid: string): AttendanceRecord[] {
        return this.db.objects(AttendanceRecord.schema.name)
            .filtered("voided = false AND sessionUUID = $0", sessionUuid)
            .map(_.identity);
    }
}

export default AttendanceRecordService;
