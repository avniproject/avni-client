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

    migrateSubjects(notifyProgress) {
        const length = this.findAll().filtered('hasMigrated = false').length;
        const individualCount = this.getCount(Individual.schema.name);
        const nothingToMigrate = individualCount === 0;
        for (let i = 0; i < length; i++) {
            const subjectMigration = this.findAll().filtered('hasMigrated = false limit(1)')[0];
            if (nothingToMigrate) {
                this.markMigrated(subjectMigration);
            } else {
                this.migrateSubjectIfRequired(subjectMigration);
            }
            const handle = setTimeout(() => {
                notifyProgress("SubjectMigration", length, i);
                clearTimeout(handle);
            }, 50);
        }
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
        return _.values(_.groupBy(parentEntities, 'uuid')).map(entityMetaData.parent.entityClass.merge(entityMetaData.entityClass.schema.name));
    }

    associateMultipleParents(entityResources, entities, entityMetaData) {
        const parentEntities = _.zip(entityResources, entities)
            .flatMap(([entityResource, entity]) => entityMetaData.parent.entityClass.associateChildToMultipleParents(entity, entityMetaData.entityClass, entityResource, this.entityService));
        return _.values(_.groupBy(parentEntities, 'uuid')).map(entities => entityMetaData.parent.entityClass.mergeMultipleParents(entityMetaData.entityClass.schema.name, entities));
    }

    persistAll(entityMetaData, entityResources) {
        if (_.isEmpty(entityResources)) return;
        entityResources = _.sortBy(entityResources, 'lastModifiedDateTime');
        const entities = entityResources.reduce((acc, resource) => acc.concat([entityMetaData.entityClass.fromResource(resource, this.entityService, entityResources)]), []);
        let entitiesToCreateFns = this.getCreateEntityFunctions(entityMetaData.schemaName, entities);
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
                entitiesToCreateFns = entitiesToCreateFns.concat(this.getCreateEntityFunctions(entityMetaData.parent.schemaName, mergedParentEntities));
            } else {
                const mergedParentEntities = this.associateParent(entityResources, entities, entityMetaData);
                entitiesToCreateFns = entitiesToCreateFns.concat(this.getCreateEntityFunctions(entityMetaData.parent.schemaName, mergedParentEntities));
            }
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
            // SUBJECT children (program enrolments)
            _.forEach(subject.enrolments, (enrolment) => {
                // ENROLMENT
                //For some reason, the last element shows up as undefined when there are multiple enrolments for a subject
                if (_.isNil(enrolment)) {
                    return;
                }

                // ENROLMENT children (encounters)
                _.forEach(enrolment.encounters, (programEncounter) => {
                    // PROGRAM ENCOUNTER
                    // PROGRAM ENCOUNTER children (others)
                    db.delete(programEncounter.approvalStatuses);
                });
                db.delete(enrolment.encounters);

                // ENROLMENT children (checklists)
                _.forEach(enrolment.checklists, (checklist) => {
                    // CHECKLIST
                    if (_.isNil(checklist)) {
                        return;
                    }
                    db.delete(checklist.items);
                });
                // ENROLMENT children (others)
                db.delete(enrolment.checklists);
                db.delete(enrolment.approvalStatuses);
            });
            db.delete(subject.enrolments);

            _.forEach(subject.encounters, (encounter) => {
                // ENCOUNTER
                // ENCOUNTER children (others)
                db.delete(encounter.approvalStatuses);
            });
            db.delete(subject.encounters);

            // SUBJECT children (others)
            db.delete(this.getService(IndividualRelationshipService).findBySubject(subject));
            db.delete(subject.comments);
            db.delete(subject.groupSubjects);
            db.delete(subject.groups);
            db.delete(subject.approvalStatuses);

            // SUBJECT root
            db.delete(subject);
        });
    }

    migrateSubjectIfRequired(subjectMigration) {
        const addressLevelService = this.getService(AddressLevelService);
        const userInfoService = this.getService(UserInfoService);
        const subjectType = this.getService(SubjectTypeService).findByUUID(subjectMigration.subjectTypeUUID);
        const userSyncConcept1Values = userInfoService.getSyncConcept1Values(subjectType);
        const userSyncConcept2Values = userInfoService.getSyncConcept2Values(subjectType);
        const oldAddressExists = addressLevelService.existsByUuid(subjectMigration.oldAddressLevelUUID);
        const newAddressExists = addressLevelService.existsByUuid(subjectMigration.newAddressLevelUUID);
        const oldSyncConcept1ValueExists = _.includes(userSyncConcept1Values, subjectMigration.oldSyncConcept1Value);
        const newSyncConcept1ValueExists =_.includes(userSyncConcept1Values, subjectMigration.newSyncConcept1Value);
        const oldSyncConcept2ValueExists = _.includes(userSyncConcept2Values, subjectMigration.oldSyncConcept2Value);
        const newSyncConcept2ValueExists = _.includes(userSyncConcept2Values, subjectMigration.newSyncConcept2Value);

        if ((oldAddressExists && !newAddressExists) ||
            (oldSyncConcept1ValueExists && !newSyncConcept1ValueExists) ||
            (oldSyncConcept2ValueExists && !newSyncConcept2ValueExists)) {
            General.logDebug("SubjectMigrationService", `Removing entities for subject migration uuid: ${subjectMigration.uuid}`);
            this.removeEntitiesFor(subjectMigration);
        }

        this.markMigrated(subjectMigration);
    }

    markMigrated(subjectMigration) {
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
