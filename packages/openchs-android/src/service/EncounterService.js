import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import FormMappingService from "./FormMappingService";
import General from "../utility/General";

@Service("EncounterService")
class EncounterService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    isEncounterTypeCancellable(encounter) {
        if (_.isNil(encounter['programEnrolment'])) {
            General.logDebug('EncounterService.isEncounterTypeCancellable', 'Not a ProgramEncounter');
            return false;
        }

        let formMappingService = this.getService(FormMappingService);
        let form = formMappingService.findFormForCancellingEncounterType(
            encounter.encounterType,
            encounter.programEnrolment.program,
            encounter.subjectType
            );
        if (_.isNil(form)) {
            General.logDebug('EncounterService.isEncounterTypeCancellable', `No form associated with ET=${encounter.encounterType.uuid} and Program=${encounter.programEnrolment.program.uuid}`);
            return false;
        }
        let cancellable = encounter.isCancellable();
        if (!cancellable) {
            General.logDebug('EncounterService.isEncounterTypeCancellable', `${encounter.encounterType.name}, ${encounter.programEnrolment.program.name}, Not Cancellable because of encounter`);
        }
        return cancellable;
    }
}

export default EncounterService;