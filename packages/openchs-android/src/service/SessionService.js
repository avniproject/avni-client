import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {Session} from "avni-models";

@Service("sessionService")
class SessionService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return Session.schema.name;
    }
}

export default SessionService;
