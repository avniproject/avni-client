import BaseService from "./BaseService";
import Service from "../framework/Service";
import DecisionSupportSessionService from "./DecisionSupportSessionService";

@Service("exportService")
class ExportService extends BaseService {
    constructor(db) {
        super(db);
    }

    export() {
        const decisionSupportSessionService = new DecisionSupportSessionService(this.db);
        const allSessions = decisionSupportSessionService.getAll();
        
    }
}

export default ExportService;