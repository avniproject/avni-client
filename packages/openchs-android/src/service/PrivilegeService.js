import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {
    Groups,
    MyGroups,
    GroupPrivileges,
    Encounter,
    Checklist,
    ChecklistItem,
    IndividualRelationship,
    ProgramEncounter,
    ProgramEnrolment,
    Individual,
    EntityMetaData,
    SubjectType,
    Privilege, EntityApprovalStatus
} from 'avni-models';
import FormMappingService from "./FormMappingService";
import EntityService from "./EntityService";
import _ from "lodash";

@Service('PrivilegeService')
class PrivilegeService extends BaseService {

    constructor(db, beanStore) {
        super(db, beanStore);
    }

    init() {
    }

    getSchema() {
        return GroupPrivileges.schema.name;
    }

    getEntityTypeUuidListForMetadata(privilegeEntity, privilegeName, privilegeParam, allow) {
        const ownedGroupsQuery = this.ownedGroups().map(({groupUuid}) => `group.uuid = '${groupUuid}'`).join(' OR ');
        return this.findAll()
            .filtered(_.isEmpty(ownedGroupsQuery) ? 'uuid = null' : ownedGroupsQuery)
            .filtered('privilege.name = $0 && privilege.entityType = $1 && allow = $2', privilegeName, privilegeEntity, allow)
            .filtered(`${privilegeParam} <> null`)
            .filtered(`TRUEPREDICATE DISTINCT(${privilegeParam})`)
            .map(privilege => privilege[privilegeParam])
    }

    getRevokedEntityTypeUuidList(privilegeEntity, privilegeName, privilegeParam) {
        const grantedEntityTypes = this.getEntityTypeUuidListForMetadata(privilegeEntity, privilegeName, privilegeParam, true);
        const revokedEntityTypes = this.getEntityTypeUuidListForMetadata(privilegeEntity, privilegeName, privilegeParam, false);

        return _.difference(revokedEntityTypes, grantedEntityTypes);
    }

    allowedEntityTypeUUIDListForCriteria(criteria, privilegeParam) {
        const ownedGroupsQuery = this.ownedGroups().map(({groupUuid}) => `group.uuid = '${groupUuid}'`).join(' OR ');
        return this.db.objects(GroupPrivileges.schema.name)
            .filtered(_.isEmpty(ownedGroupsQuery) ? 'uuid = null' : ownedGroupsQuery)
            .filtered(_.isEmpty(criteria) ? 'uuid = null' : criteria)
            .filtered('allow = true')
            .filtered(`${privilegeParam} <> null`)
            .filtered(`TRUEPREDICATE DISTINCT(${privilegeParam})`)
            .map(privilege => privilege[privilegeParam])
    }

    hasAllPrivileges() {
        const ownedGroupsQuery = this.ownedGroups().map(({groupUuid}) => `uuid = '${groupUuid}'`).join(' OR ');
        return this.db.objects(Groups.schema.name)
            .filtered(_.isEmpty(ownedGroupsQuery) ? 'uuid = null' : ownedGroupsQuery)
            .filtered('hasAllPrivileges=true').length > 0;
    }

    //Temporary function for this release to handle the case when user has not synced group privileges. Remove after.
    hasEverSyncedGroupPrivileges() {
        return this.db.objects(GroupPrivileges.schema.name).length > 0;
    }

    deleteRevokedEntities() {
        if (this.hasAllPrivileges()) {
            return;
        }

        const metadata = EntityMetaData.model().filter(({type}) => type === "tx" || type === "virtualTx");
        const getNonPrivilegeUUIDs = (entityName) => {
            const {privilegeEntity, privilegeName, privilegeParam} = _.find(metadata, d => d.entityName === entityName);
            return this.getRevokedEntityTypeUuidList(privilegeEntity, privilegeName, privilegeParam);
        };
        this.deleteEncounters(getNonPrivilegeUUIDs(Encounter.schema.name), 'encounterType.uuid');
        this.deleteProgramEncounters(getNonPrivilegeUUIDs(ProgramEncounter.schema.name), 'encounterType.uuid');
        this.deleteChecklistItemsDirectly(getNonPrivilegeUUIDs(ChecklistItem.schema.name), 'detail.checklistDetail.uuid');
        this.deleteCheckListDirectly(getNonPrivilegeUUIDs(Checklist.schema.name), 'detail.uuid');
        this.deleteIndividualRelationship(getNonPrivilegeUUIDs(IndividualRelationship.schema.name), 'individualA.subjectType.uuid');
        this.deleteEnrolments(getNonPrivilegeUUIDs(ProgramEnrolment.schema.name), 'program.uuid');
        this.deleteSubjects(getNonPrivilegeUUIDs(Individual.schema.name), 'subjectType.uuid');
        _.forEach(EntityApprovalStatus.entityType, (value, key) => {
            this.deleteEntityApprovalStatuses(getNonPrivilegeUUIDs(`${value}${EntityApprovalStatus.schema.name}`), 'entityTypeUuid');
        })
    }

    deleteEntity(entityName, filterQuery) {
        const db = this.db;
        db.write(() => {
            const objects = db.objects(entityName)
                .filtered(filterQuery);
            db.delete(objects);
        })
    }

    getRequiredFilterQuery(nonPrivilegeUuids, queryParam) {
        const filterQuery = nonPrivilegeUuids.map(uuid => `${queryParam} = '${uuid}'`).join(' OR ');
        return _.isEmpty(nonPrivilegeUuids) ? 'uuid = null' : filterQuery;
    }

    deleteSubjects(nonPrivilegedEntityTypeUUIDs, queryParam) {
        this.deleteEncounters(nonPrivilegedEntityTypeUUIDs, `individual.${queryParam}`);
        this.deleteEnrolments(nonPrivilegedEntityTypeUUIDs, `individual.${queryParam}`);
        this.deleteIndividualRelationship(nonPrivilegedEntityTypeUUIDs, `individualA.${queryParam}`);
        this.deleteEntity(Individual.schema.name, this.getRequiredFilterQuery(nonPrivilegedEntityTypeUUIDs, queryParam));
    }

    deleteEntityApprovalStatuses(nonPrivilegedEntityTypeUUIDs, queryParam) {
        this.deleteEntity(EntityApprovalStatus.schema.name, this.getRequiredFilterQuery(nonPrivilegedEntityTypeUUIDs, queryParam));
    }

    deleteEnrolments(nonPrivilegedEntityTypeUUIDs, queryParam) {
        this.deleteProgramEncounters(nonPrivilegedEntityTypeUUIDs, `programEnrolment.${queryParam}`);
        this.deleteChecklist(nonPrivilegedEntityTypeUUIDs, `programEnrolment.${queryParam}`);
        this.deleteEntity(ProgramEnrolment.schema.name, this.getRequiredFilterQuery(nonPrivilegedEntityTypeUUIDs, queryParam));
    }

    deleteIndividualRelationship(nonPrivilegedEntityTypeUUIDs, queryParam) {
        this.deleteEntity(IndividualRelationship.schema.name, this.getRequiredFilterQuery(nonPrivilegedEntityTypeUUIDs, queryParam));
    }

    deleteChecklist(nonPrivilegedEntityTypeUUIDs, queryParam) {
        this.deleteChecklistItems(nonPrivilegedEntityTypeUUIDs, `checklist.${queryParam}`);
        this.deleteEntity(Checklist.schema.name, this.getRequiredFilterQuery(nonPrivilegedEntityTypeUUIDs, queryParam));
    }

    deleteChecklistItems(nonPrivilegedEntityTypeUUIDs, queryParam) {
        this.deleteEntity(ChecklistItem.schema.name, this.getRequiredFilterQuery(nonPrivilegedEntityTypeUUIDs, queryParam));
    }

    deleteCheckListDirectly(nonPrivilegedEntityTypeUUIDs, queryParam) {
        this.deleteEntity(Checklist.schema.name, this.getRequiredFilterQuery(nonPrivilegedEntityTypeUUIDs, queryParam));
    }

    deleteChecklistItemsDirectly(nonPrivilegedEntityTypeUUIDs, queryParam) {
        this.deleteEntity(ChecklistItem.schema.name, this.getRequiredFilterQuery(nonPrivilegedEntityTypeUUIDs, queryParam));
    }

    deleteProgramEncounters(nonPrivilegedEntityTypeUUIDs, queryParam) {
        this.deleteEntity(ProgramEncounter.schema.name, this.getRequiredFilterQuery(nonPrivilegedEntityTypeUUIDs, queryParam));
    }

    deleteEncounters(nonPrivilegedEntityTypeUUIDs, queryParam) {
        this.deleteEntity(Encounter.schema.name, this.getRequiredFilterQuery(nonPrivilegedEntityTypeUUIDs, queryParam));
    }

    ownedGroups() {
        return this.db.objects(MyGroups.schema.name).filtered('voided=false');
    }

    displayProgramTab(subjectType) {
        if (this.hasAllPrivileges()) {
            return this.getService(FormMappingService).findProgramsForSubjectType(subjectType).length > 0;
        } else {
            const ownedGroupsQuery = this.ownedGroups().map(({groupUuid}) => `group.uuid = '${groupUuid}'`).join(' OR ');
            const subjectTypeUUID = _.defaultTo(_.get(subjectType, 'uuid'), 'null');
            return this.getAll()
                .filtered(_.isEmpty(ownedGroupsQuery) ? 'uuid = null' : ownedGroupsQuery)
                .filtered(`subjectTypeUuid = '${subjectTypeUUID}' AND programUuid <> null AND allow = true`)
                .length > 0;
        }
    }

    hasAnyGeneralEncounters(subjectType) {
        if (this.hasAllPrivileges()) {
            return this.getService(FormMappingService).findEncounterTypesForSubjectType(subjectType).length > 0;
        } else {
            const ownedGroupsQuery = this.ownedGroups().map(({groupUuid}) => `group.uuid = '${groupUuid}'`).join(' OR ');
            const subjectTypeUUID = _.defaultTo(_.get(subjectType, 'uuid'), 'null');
            return this.getAll()
                .filtered(_.isEmpty(ownedGroupsQuery) ? 'uuid = null' : ownedGroupsQuery)
                .filtered(`subjectTypeUuid = '${subjectTypeUUID}' AND encounterTypeUuid <> null AND allow = true`)
                .length > 0;
        }
    }

    displayRegisterButton() {
        if (this.hasAllPrivileges()) {
            return this.getService(EntityService).findAllByCriteria('voided = false AND active = true', SubjectType.schema.name).length > 0;
        } else {
            const subjectRegisterCriteria = `privilege.name = '${Privilege.privilegeName.registerSubject}' AND privilege.entityType = '${Privilege.privilegeEntityType.subject}'`;
            return this.allowedEntityTypeUUIDListForCriteria(subjectRegisterCriteria, 'subjectTypeUuid').length > 0;
        }
    }

    displayApprovalEntityButtons(entity, schema) {
        const privilegeMetadata = this._getPrivilegeMetadataForSchema(schema);
        return this.hasAllPrivileges() || this._filterByOwnedGroupsAndEntityType(privilegeMetadata, entity)
            .filtered(`privilege.name = '${privilegeMetadata.approvedPrivilegeName}' AND allow = true`).length > 0;
    }

    displayEditEntityButton(entity, schema) {
        const privilegeMetadata = this._getPrivilegeMetadataForSchema(schema);
        return this.hasAllPrivileges() || this._filterByOwnedGroupsAndEntityType(privilegeMetadata, entity)
            .filtered(`privilege.name = '${privilegeMetadata.editPrivilegeName}' AND allow = true`).length > 0;
    }

    _filterByOwnedGroupsAndEntityType({groupFilterQuery, entityFilterQueryFunc}, entity) {
        const entityFilterQuery = entityFilterQueryFunc(entity);
        return this.getAll()
            .filtered(_.isEmpty(groupFilterQuery) ? 'uuid = null' : groupFilterQuery)
            .filtered(_.isEmpty(entityFilterQuery) ? 'uuid = null' : entityFilterQuery);
    }

    _getPrivilegeMetadataForSchema(schema) {
        const schemaToPrivilegeMetadata = Privilege.schemaToPrivilegeMetadata;
        const groupFilterQuery = this.ownedGroups().map(({groupUuid}) => `group.uuid = '${groupUuid}'`).join(' OR ');
        const dataForSchema = _.find(schemaToPrivilegeMetadata, privilegeMetadata => privilegeMetadata.schema === schema);
        return {...dataForSchema, groupFilterQuery};
    }

    hasActionPrivilegeForCriteria(privilegeCriteria, privilegeParam) {
        const allowedTypeUUIDs = this.allowedEntityTypeUUIDListForCriteria(privilegeCriteria, privilegeParam);
        return !this.hasEverSyncedGroupPrivileges() || this.hasAllPrivileges() || !_.isEmpty(allowedTypeUUIDs);
    }
}

export default PrivilegeService
