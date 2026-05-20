import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {CalendarDateMarker} from "avni-models";

@Service("calendarDateMarkerService")
class CalendarDateMarkerService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return CalendarDateMarker.schema.name;
    }
}

export default CalendarDateMarkerService;
