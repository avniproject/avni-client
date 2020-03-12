import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {
    Groups,
    GroupPrivileges,
    Encounter,
    Checklist,
    ChecklistItem,
    IndividualRelationship,
    ProgramEncounter,
    ProgramEnrolment,
    Individual,
    EntityMetaData,
    EntitySyncStatus
} from 'avni-models';
import General from "../utility/General";
import EntitySyncStatusService from "./EntitySyncStatusService";
import FormMappingService from "./FormMappingService";

@Service('PrivilegeService')
class PrivilegeService extends BaseService {

    constructor(db, beanStore) {
        super(db, beanStore);
        //this.formMappingService = beanStore.get(FormMappingService);
    }

    init() {
    }

    getEntityTypeUuidListForMetadata(privilegeEntity, privilegeName, privilegeParam, allow) {
        const ownedGroupsQuery = this.ownedGroups().map(({uuid}) => `group.uuid = '${uuid}'`).join(' OR ');
        return this.db.objects(GroupPrivileges.schema.name)
            .filtered(_.isEmpty(ownedGroupsQuery) ? 'uuid <> null' : ownedGroupsQuery)
            .filtered('privilege.name = $0 && privilege.entityType = $1 && allow = true', privilegeName, privilegeEntity)
            .filtered(`TRUEPREDICATE DISTINCT(${privilegeParam}) && ${privilegeParam} <> null`)
            .map(privilege => privilege[privilegeParam])
    }

    allowedEntityTypeUUIDListForCriteria(criteria, privilegeParam) {
        const ownedGroupsQuery = this.ownedGroups().map(({uuid}) => `group.uuid = '${uuid}'`).join(' OR ');
        return this.db.objects(GroupPrivileges.schema.name)
            .filtered(_.isEmpty(ownedGroupsQuery) ? 'uuid = null' : ownedGroupsQuery)
            .filtered(_.isEmpty(criteria) ? 'uuid = null' : criteria)
            .filtered('allow = true')
            .filtered(`TRUEPREDICATE DISTINCT(${privilegeParam}) && ${privilegeParam} <> null`)
            .map(privilege => privilege[privilegeParam])
    }

    //Temporary function for this release to handle the case when user has not synced group privileges. Remove after.
    hasGroupPrivileges() {
        return this.db.objects(GroupPrivileges.schema.name).length > 0;
    }

    deleteRevokedEntities() {
        const requiredEntities = ['Encounter', 'ProgramEncounter', 'ChecklistItem', 'Checklist', 'IndividualRelationship', 'ProgramEnrolment', 'Individual'];
        const metadata = EntityMetaData.model().filter(({type, entityName}) => type === "tx" && _.includes(requiredEntities, entityName));
        const db = this.db;
        const getNonPrivilegeUUIDs = (entityName) => {
            const {privilegeEntity, privilegeName, privilegeParam} = _.find(metadata, d => d.entityName === entityName);
            return this.getEntityTypeUuidListForMetadata(privilegeEntity, privilegeName, privilegeParam, false);
        };
        this.deleteEncounters(db, getNonPrivilegeUUIDs(Encounter.schema.name), 'encounterType');
        this.deleteProgramEncounters(db, getNonPrivilegeUUIDs(ProgramEncounter.schema.name), 'encounterType');
        this.deleteChecklistItemsDirectly(db, getNonPrivilegeUUIDs(ChecklistItem.schema.name), 'detail.checklistDetail');
        this.deleteCheckListDirectly(db, getNonPrivilegeUUIDs(Checklist.schema.name), 'detail');
        this.deleteIndividualRelationship(db, getNonPrivilegeUUIDs(IndividualRelationship.schema.name), 'individualA.subjectType');
        this.deleteEnrolments(db, getNonPrivilegeUUIDs(ProgramEnrolment.schema.name), 'program');
        this.deleteSubjects(db, getNonPrivilegeUUIDs(Individual.schema.name), 'subjectType');
    }

    deleteEntity(db, entityName, filterQuery) {
        db.write(() => {
            const objects = db.objects(entityName)
                .filtered(filterQuery);
            db.delete(objects);
        })
    }

    getRequiredFilterQuery(nonPrivilegeUuids, queryParam) {
        const filterQuery = nonPrivilegeUuids.map(uuid => `${queryParam}.uuid = '${uuid}'`).join(' OR ');
        return _.isEmpty(nonPrivilegeUuids) ? 'uuid = null' : filterQuery;
    }

    getQueryForQueryParam(uuids, queryParam) {
        const query = uuids.map(uuid => `${queryParam} = '${uuid}'`).join(' OR ');
        return _.isEmpty(uuids) ? 'uuid = null' : `voided = false AND (${query})`
    }

    deleteSubjects(db, uuids, queryParam) {
        //const encountersForSubjectType = this.formMappingService.formMappingByCriteria(this.getQueryForQueryParam(uuids, 'SubjectType.uuid'));
        this.deleteEncounters(db, uuids, `individual.${queryParam}`);
        this.deleteEnrolments(db, uuids, `individual.${queryParam}`);
        this.deleteIndividualRelationship(db, uuids, `individualA.${queryParam}`);
        const entityName = Individual.schema.name;
        this.deleteEntity(db, entityName, this.getRequiredFilterQuery(uuids, queryParam));
        this.resetSync(db, uuids, entityName);
    }

    deleteEnrolments(db, uuids, queryParam) {
        this.deleteProgramEncounters(db, uuids, `programEnrolment.${queryParam}`);
        this.deleteChecklist(db, uuids, `programEnrolment.${queryParam}`);
        const entityName = ProgramEnrolment.schema.name;
        this.deleteEntity(db, entityName, this.getRequiredFilterQuery(uuids, queryParam));
        this.resetSync(db, uuids, entityName);
    }

    deleteIndividualRelationship(db, uuids, queryParam) {
        const entityName = IndividualRelationship.schema.name;
        this.deleteEntity(db, entityName, this.getRequiredFilterQuery(uuids, queryParam));
        this.resetSync(db, uuids, entityName);
    }

    deleteChecklist(db, uuids, queryParam) {
        this.deleteChecklistItems(db, uuids, `checklist.${queryParam}`);
        this.deleteEntity(db, Checklist.schema.name, this.getRequiredFilterQuery(uuids, queryParam));
    }

    deleteChecklistItems(db, uuids, queryParam) {
        this.deleteEntity(db, ChecklistItem.schema.name, this.getRequiredFilterQuery(uuids, queryParam));
    }

    deleteCheckListDirectly(db, uuids, queryParam) {
        const entityName = Checklist.schema.name;
        this.deleteEntity(db, entityName, this.getRequiredFilterQuery(uuids, queryParam));
        this.resetSync(db, uuids, entityName);
    }

    deleteChecklistItemsDirectly(db, uuids, queryParam) {
        const entityName = ChecklistItem.schema.name;
        this.deleteEntity(db, entityName, this.getRequiredFilterQuery(uuids, queryParam));
        this.resetSync(db, uuids, entityName);
    }

    deleteProgramEncounters(db, uuids, queryParam) {
        const entityName = ProgramEncounter.schema.name;
        this.deleteEntity(db, entityName, this.getRequiredFilterQuery(uuids, queryParam));
        this.resetSync(db, uuids, entityName);
    }

    deleteEncounters(db, uuids, queryParam) {
        const entityName = Encounter.schema.name;
        this.deleteEntity(db, entityName, this.getRequiredFilterQuery(uuids, queryParam));
        this.resetSync(db, uuids, entityName);
    }

    //TODO: delete the dependent entities also from the sync Status
    resetSync(db, nonPrivilegeUuids, entityName) {
        if (!_.isEmpty(nonPrivilegeUuids)) {
            const query = nonPrivilegeUuids.map(uuid => `entityTypeUuid = '${uuid}'`).join(' OR ');
            this.getService(EntitySyncStatusService).resetSyncForEntity(`entityName = '${entityName}' && ( ${query} )`, db)
        }
    }

    ownedGroups() {
        return this.db.objects(Groups.schema.name);
    }
}

export default PrivilegeService