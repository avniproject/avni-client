import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import {Concept} from "../models/Concept";
import MessageService from "./MessageService";

@Service("individualService")
class IndividualService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    init() {
    }
}

export default IndividualService;