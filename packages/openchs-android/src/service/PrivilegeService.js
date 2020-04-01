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
} from 'avni-models';

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
            .filtered(`TRUEPREDICATE DISTINCT(${privilegeParam}) && ${privilegeParam} <> null`)
            .map(privilege => privilege[privilegeParam])
    }

    allowedEntityTypeUUIDListForCriteria(criteria, privilegeParam) {
        const ownedGroupsQuery = this.ownedGroups().map(({groupUuid}) => `group.uuid = '${groupUuid}'`).join(' OR ');
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
        const getNonPrivilegeUUIDs = (entityName) => {
            const {privilegeEntity, privilegeName, privilegeParam} = _.find(metadata, d => d.entityName === entityName);
            return this.getEntityTypeUuidListForMetadata(privilegeEntity, privilegeName, privilegeParam, false);
        };
        this.deleteEncounters(getNonPrivilegeUUIDs(Encounter.schema.name), 'encounterType');
        this.deleteProgramEncounters(getNonPrivilegeUUIDs(ProgramEncounter.schema.name), 'encounterType');
        this.deleteChecklistItemsDirectly(getNonPrivilegeUUIDs(ChecklistItem.schema.name), 'detail.checklistDetail');
        this.deleteCheckListDirectly(getNonPrivilegeUUIDs(Checklist.schema.name), 'detail');
        this.deleteIndividualRelationship(getNonPrivilegeUUIDs(IndividualRelationship.schema.name), 'individualA.subjectType');
        this.deleteEnrolments(getNonPrivilegeUUIDs(ProgramEnrolment.schema.name), 'program');
        this.deleteSubjects(getNonPrivilegeUUIDs(Individual.schema.name), 'subjectType');
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
        const filterQuery = nonPrivilegeUuids.map(uuid => `${queryParam}.uuid = '${uuid}'`).join(' OR ');
        return _.isEmpty(nonPrivilegeUuids) ? 'uuid = null' : filterQuery;
    }

    deleteSubjects(nonPrivilegedEntityTypeUUIDs, queryParam) {
        this.deleteEncounters(nonPrivilegedEntityTypeUUIDs, `individual.${queryParam}`);
        this.deleteEnrolments(nonPrivilegedEntityTypeUUIDs, `individual.${queryParam}`);
        this.deleteIndividualRelationship(nonPrivilegedEntityTypeUUIDs, `individualA.${queryParam}`);
        this.deleteEntity(Individual.schema.name, this.getRequiredFilterQuery(nonPrivilegedEntityTypeUUIDs, queryParam));
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
}

export default PrivilegeService