import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {CalendarDateMarker} from "avni-models";
import _ from "lodash";

@Service("calendarDateMarkerService")
class CalendarDateMarkerService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return CalendarDateMarker.schema.name;
    }

    findForCalendar(calendarUuid: string, fromDate: string, toDate: string): CalendarDateMarker[] {
        return this.db.objects(CalendarDateMarker.schema.name)
            .filtered(
                "voided = false AND calendarUUID = $0 AND markerDate >= $1 AND markerDate <= $2",
                calendarUuid, fromDate, toDate
            )
            .map(_.identity);
    }
}

export default CalendarDateMarkerService;
