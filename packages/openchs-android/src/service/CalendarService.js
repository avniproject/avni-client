import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {Calendar} from "avni-models";

@Service("calendarService")
class CalendarService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return Calendar.schema.name;
    }
}

export default CalendarService;
