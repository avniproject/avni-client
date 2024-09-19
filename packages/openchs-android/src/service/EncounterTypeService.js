import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {EncounterType, Privilege} from "openchs-models";
import PrivilegeService from "./PrivilegeService";
import _ from "lodash";
import RealmQueryService from "./query/RealmQueryService";
import FormMappingService from "./FormMappingService";

function getAllowedViewGeneralEncounterTypeUUIDs(privilegeService, subjectTypes) {
    if (subjectTypes.length === 0) return [];

    const viewGeneralEncounterCriteria = `privilege.name = '${Privilege.privilegeName.viewVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}' AND programUuid = null AND  (${RealmQueryService.orKeyValueQuery("subjectTypeUuid", subjectTypes.map(subjectType => subjectType.uuid))})`;
    return privilegeService.allowedEntityTypeUUIDListForCriteria(viewGeneralEncounterCriteria, 'encounterTypeUuid');
}

function getAllowedViewProgramEncounterTypeUUIDs(privilegeService, subjectTypes, programs) {
    if (subjectTypes.length === 0 || programs.length === 0) return [];

    const viewProgramEncounterCriteria = `privilege.name = '${Privilege.privilegeName.viewVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}' AND ${RealmQueryService.orKeyValueQuery('subjectTypeUuid', subjectTypes.map(x => x.uuid))} AND ${RealmQueryService.orKeyValueQuery('programUuid', programs.map(program => program.uuid))}`;
    return privilegeService.allowedEntityTypeUUIDListForCriteria(viewProgramEncounterCriteria, 'encounterTypeUuid');
}

@Service("EncounterTypeService")
class EncounterTypeService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return EncounterType.schema.name;
    }

    getAllowedViewEncounterTypes(subjectTypes, programs) {
        const privilegeService = this.getService(PrivilegeService);
        const formMappingService = this.getService(FormMappingService);
        const encounterTypeUUIDs = _.unionBy(getAllowedViewGeneralEncounterTypeUUIDs(privilegeService, subjectTypes), getAllowedViewProgramEncounterTypeUUIDs(privilegeService, subjectTypes, programs));

        let generalEncounterTypes = [];
        if (programs.length === 0)
            generalEncounterTypes = formMappingService.findGeneralEncounterTypesForSubjectTypes(subjectTypes);

        const programEncounterTypes = formMappingService.findProgramEncounterTypesForSubjectTypesAndPrograms(subjectTypes, programs);
        const allEncounterTypes = _.unionBy(generalEncounterTypes, programEncounterTypes, 'uuid');

        return _.filter(allEncounterTypes, (encounterType) => privilegeService.hasAllPrivileges() || _.includes(encounterTypeUUIDs, encounterType.uuid));
    }
}

export default EncounterTypeService;
