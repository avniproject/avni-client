import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {
    Checklist,
    ChecklistItem,
    Encounter,
    EntityApprovalStatus,
    EntityMetaData,
    Individual,
    ProgramEncounter,
    ProgramEnrolment,
    SubjectMigration,
    GroupSubject,
    IndividualRelationship
} from "openchs-models";
import SettingsService from "./SettingsService";
import {getJSON} from "../framework/http/requests";
import _ from "lodash";
import EntityService from "./EntityService";
import MessageService from "./MessageService";
import EntitySyncStatusService from "./EntitySyncStatusService";
import AddressLevelService from "./AddressLevelService";
import IndividualService from "./IndividualService";
import IndividualRelationshipService from "./relationship/IndividualRelationshipService";
import General from "../utility/General";
import SubjectTypeService from "./SubjectTypeService";
import UserInfoService from "./UserInfoService";

@Service('SubjectMigrationService')
class SubjectMigrationService extends BaseService {

    constructor(db, beanStore) {
        super(db, beanStore);
    }

    init() {
        this.entityService = this.getService(EntityService);
        this.messageService = this.getService(MessageService);
        this.entitySyncStatusService = this.getService(EntitySyncStatusService);
        this.individualService = this.getService(IndividualService);
    }

    async migrateSubjects() {
        const subjectsToMigrate = this.findAll().filtered('hasMigrated = false ');
        for (const subjectMigration of subjectsToMigrate) {
           await this.migrateSubjectIfRequired(subjectMigration);
        }
    }

    async addEntitiesFor({subjectUUID}) {
        const serverUrl = this.getService(SettingsService).getSettings().serverURL;
        return getJSON(`${serverUrl}/subject/${subjectUUID}/allEntities`)
            .then(response => this.saveEntities(response.content));
    }


    getUUIDFor(resource, property) {
        return _.get(resource, ["_links", property, "href"]);
    }

    saveEntities({individual, programEnrolments, programEncounters, encounters, checklists, checklistItems, groupSubjects, individualRelationships}) {
        const entityMetaData = EntityMetaData.model();
        const metadataFor = (name) => entityMetaData.find(item => item.entityName === name);

        this.persistAll(metadataFor(Individual.schema.name),[individual]);
        this.persistAll(metadataFor(ProgramEnrolment.schema.name),programEnrolments);
        this.persistAll(metadataFor(Encounter.schema.name),encounters);
        this.persistAll(metadataFor(ProgramEncounter.schema.name),programEncounters);
        this.persistAll(metadataFor(Checklist.schema.name),checklists);
        this.persistAll(metadataFor(ChecklistItem.schema.name),checklistItems);
        this.persistAll(metadataFor(GroupSubject.schema.name),groupSubjects.filter(
            groupSubject => this.individualService.existsByUuid(groupSubject.groupSubjectUUID) &&
                this.individualService.existsByUuid(groupSubject.memberSubjectUUID)));
        this.persistAll(metadataFor(IndividualRelationship.schema.name),individualRelationships.filter(
            individualRelationship => {
                return this.individualService.existsByUuid(this.getUUIDFor(individualRelationship, 'individualAUUID')) &&
                    this.individualService.existsByUuid(this.getUUIDFor(individualRelationship, 'individualBUUID'));
            }));
    }

    associateParent(entityResources, entities, entityMetaData) {
        const parentEntities = _.zip(entityResources, entities)
            .map(([entityResource, entity]) => entityMetaData.parent.entityClass.associateChild(entity, entityMetaData.entityClass, entityResource, this.entityService));
        return _.values(_.groupBy(parentEntities, 'uuid')).map(entityMetaData.parent.entityClass.merge(entityMetaData.entityClass));
    }

    associateMultipleParents(entityResources, entities, entityMetaData) {
        const parentEntities = _.zip(entityResources, entities)
            .flatMap(([entityResource, entity]) => entityMetaData.parent.entityClass.associateChildToMultipleParents(entity, entityMetaData.entityClass, entityResource, this.entityService));
        return _.values(_.groupBy(parentEntities, 'uuid')).map(entities => entityMetaData.parent.entityClass.mergeMultipleParents(entityMetaData.entityClass, entities));
    }

    persistAll(entityMetaData, entityResources) {
        if (_.isEmpty(entityResources)) return;
        entityResources = _.sortBy(entityResources, 'lastModifiedDateTime');
        const entities = entityResources.reduce((acc, resource) => acc.concat([entityMetaData.entityClass.fromResource(resource, this.entityService, entityResources)]), []);
        let entitiesToCreateFns = this.createEntities(entityMetaData.schemaName, entities);
        if (entityMetaData.nameTranslated) {
            entityResources.map((entity) => this.messageService.addTranslation('en', entity.translatedFieldValue, entity.translatedFieldValue));
        }
        //most avni-models are designed to have oneToMany relations
        //Each model has a static method `associateChild` implemented in manyToOne fashion
        //`<A Model>.associateChild()` method takes childInformation, finds the parent, assigns the child to the parent and returns the parent
        //`<A Model>.associateChild()` called many times as many children
        if (!_.isEmpty(entityMetaData.parent)) {
            if (entityMetaData.hasMoreThanOneAssociation) {
                const mergedParentEntities = this.associateMultipleParents(entityResources, entities, entityMetaData);
                entitiesToCreateFns = entitiesToCreateFns.concat(this.createEntities(entityMetaData.parent.schemaName, mergedParentEntities));
            } else {
                const mergedParentEntities = this.associateParent(entityResources, entities, entityMetaData);
                entitiesToCreateFns = entitiesToCreateFns.concat(this.createEntities(entityMetaData.parent.schemaName, mergedParentEntities));
            }
        }
        if (entityMetaData.entityName === 'EntityApprovalStatus') {
            const latestApprovalStatuses = EntityApprovalStatus.getLatestApprovalStatusByEntity(entities, this.entityService);
            _.forEach(latestApprovalStatuses, ({schema, entity}) => {
                entitiesToCreateFns = entitiesToCreateFns.concat(this.createEntities(schema, [entity]));
            });
        }

        this.bulkSaveOrUpdate(entitiesToCreateFns);
    }

    removeEntitiesFor({subjectUUID}) {
        const subject = this.entityService.findByUUID(subjectUUID, Individual.schema.name);
        if (_.isNil(subject)) return;
        this.deleteSubjectAndChildren(subject);
    }

    deleteSubjectAndChildren(subject) {
        General.logDebug('SubjectMigrationService', `Deleting all entities for subject with UUID ${subject.uuid}`);
        const db = this.db;
        db.write(() => {
            db.delete(subject.encounters);
            _.forEach(subject.enrolments, (enrolment) => {
                //For some reason, the last element shows up as undefined when there are multiple enrolments for a subject
                if (_.isNil(enrolment)) {
                    return;
                }
                db.delete(enrolment.encounters);
                db.delete(enrolment.observations);
                db.delete(enrolment.programExitObservations);
                _.forEach(enrolment.checklists, (checklist) => {
                    if (_.isNil(checklist)) {
                        return;
                    }
                    _.forEach(checklist.items, (checklistItem) => {
                        if (_.isNil(checklistItem)) {
                            return;
                        }
                        db.delete(checklistItem.observations);
                        checklistItem.latestEntityApprovalStatus && db.delete(checklistItem.latestEntityApprovalStatus);
                        db.delete(checklistItem);
                    });
                    db.delete(checklist);
                });
                db.delete(enrolment)
            });
            db.delete(this.getService(IndividualRelationshipService).findBySubject(subject));
            subject.latestEntityApprovalStatus && db.delete(subject.latestEntityApprovalStatus);
            db.delete(subject.comments);
            db.delete(subject.groupSubjects);
            db.delete(subject.groups);
            db.delete(subject);
        });
    }

    async migrateSubjectIfRequired(subjectMigration) {
        const addressLevelService = this.getService(AddressLevelService);
        const userInfoService = this.getService(UserInfoService);
        const subjectType = this.getService(SubjectTypeService).findByUUID(subjectMigration.subjectTypeUUID);
        const syncConcept1Values = userInfoService.getSyncConcept1Values(subjectType);
        const syncConcept2Values = userInfoService.getSyncConcept2Values(subjectType);
        const oldAddressExists = addressLevelService.existsByUuid(subjectMigration.oldAddressLevelUUID);
        const newAddressExists = addressLevelService.existsByUuid(subjectMigration.newAddressLevelUUID);
        const oldSyncConcept1ValueExists = _.includes(syncConcept1Values, subjectMigration.oldSyncConcept1Value);
        const newSyncConcept1ValueExists =_.includes(syncConcept1Values, subjectMigration.newSyncConcept1Value);
        const oldSyncConcept2ValueExists = _.includes(syncConcept2Values, subjectMigration.oldSyncConcept2Value);
        const newSyncConcept2ValueExists = _.includes(syncConcept2Values, subjectMigration.newSyncConcept2Value);
        if ((oldAddressExists && !newAddressExists) ||
            (oldSyncConcept1ValueExists && !newSyncConcept1ValueExists) ||
            (oldSyncConcept2ValueExists && !newSyncConcept2ValueExists)) {
            this.removeEntitiesFor(subjectMigration);
        }

        if ((!oldAddressExists && newAddressExists) ||
            (!oldSyncConcept1ValueExists && newSyncConcept1ValueExists) ||
            (!oldSyncConcept2ValueExists && newSyncConcept2ValueExists)) {
            await this.addEntitiesFor(subjectMigration);
        }

        const db = this.db;
        db.write(() => {
            subjectMigration.hasMigrated = true;
            db.create(this.getSchema(), subjectMigration, true);
        });
    }

    getSchema() {
        return SubjectMigration.schema.name;
    }
}

export default SubjectMigrationService
