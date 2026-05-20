import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {AttendanceRecord} from "avni-models";

@Service("attendanceRecordService")
class AttendanceRecordService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return AttendanceRecord.schema.name;
    }
}

export default AttendanceRecordService;
