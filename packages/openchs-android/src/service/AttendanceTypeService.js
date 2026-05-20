import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {AttendanceType} from "avni-models";

@Service("attendanceTypeService")
class AttendanceTypeService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return AttendanceType.schema.name;
    }
}

export default AttendanceTypeService;
