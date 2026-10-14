import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {
    Checklist,
    ChecklistItem,
    Comment,
    CommentThread,
    DraftEncounter,
    DraftEnrolment,
    DraftProgramEncounter,
    DraftSubject,
    Encounter,
    EntityApprovalStatus,
    EntityMetaData,
    Family,
    IdentifierAssignment,
    Individual,
    ProgramEncounter,
    ProgramEnrolment,
    SubjectMigration,
    SubjectProgramEligibility,
    GroupSubject,
    IndividualRelationship,
    Task
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
import RealmQueryService from "./query/RealmQueryService";

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

    // Children before parents, approval statuses last: records point at them via latest_entity_approval_status_uuid
    deleteSubjectAndChildren(subject) {
        const subjectUUID = subject.uuid;
        General.logDebug('SubjectMigrationService', `Deleting all entities for subject with UUID ${subjectUUID}`);
        const find = (schema, filter) => this.getRepository(schema).findAll().filtered(filter, subjectUUID).map(_.identity);
        const uuidsOf = (rows) => rows.map(row => row.uuid);
        // One hop from the parent's uuid: a path through programEnrolment.individual makes SQLite scan the whole child table
        const findByParents = (schema, parentProperty, parentUUIDs) => _.flatMap(_.chunk(parentUUIDs, 500), uuids =>
            this.getRepository(schema).findAll().filtered(RealmQueryService.orKeyValueQuery(parentProperty, uuids)).map(_.identity));
        // On Realm, observations and locations are separate objects that don't go with their owner
        const deleteWithParts = (rows, parts = []) => {
            _.forEach(rows, row => parts.forEach(part => {
                if (!_.isNil(row[part])) this.repository.deleteInTransaction(row[part]);
            }));
            this.repository.deleteInTransaction(rows);
        };
        const visitParts = ['observations', 'cancelObservations', 'encounterLocation', 'cancelLocation'];
        const enrolmentParts = ['observations', 'programExitObservations', 'enrolmentLocation', 'exitLocation'];

        this.transactionManager.write(() => {
            const enrolments = find(ProgramEnrolment.schema.name, 'individual.uuid = $0');
            const enrolmentUUIDs = uuidsOf(enrolments);
            const programEncounters = findByParents(ProgramEncounter.schema.name, 'programEnrolment.uuid', enrolmentUUIDs);
            const encounters = find(Encounter.schema.name, 'individual.uuid = $0');
            const checklists = findByParents(Checklist.schema.name, 'programEnrolment.uuid', enrolmentUUIDs);
            const checklistItems = findByParents(ChecklistItem.schema.name, 'checklist.uuid', uuidsOf(checklists));
            const comments = find(Comment.schema.name, 'subject.uuid = $0');
            const commentThreadUUIDs = _.uniq(comments.map(comment => _.get(comment, 'commentThread.uuid')).filter(_.identity));
            const approvalStatuses = this.findApprovalStatuses([
                [EntityApprovalStatus.entityType.Subject, [subjectUUID]],
                [EntityApprovalStatus.entityType.ProgramEnrolment, enrolmentUUIDs],
                [EntityApprovalStatus.entityType.Encounter, uuidsOf(encounters)],
                [EntityApprovalStatus.entityType.ProgramEncounter, uuidsOf(programEncounters)],
                [EntityApprovalStatus.entityType.ChecklistItem, uuidsOf(checklistItems)],
            ]);

            // These belong to the user, so they stay; only their link to the subject goes
            const repositoryFactory = this.context.getRepositoryFactory();
            repositoryFactory.clearLinks(IdentifierAssignment.schema.name, 'individual_uuid', [subjectUUID]);
            repositoryFactory.clearLinks(IdentifierAssignment.schema.name, 'program_enrolment_uuid', enrolmentUUIDs);
            repositoryFactory.clearLinks(Task.schema.name, 'subject_uuid', [subjectUUID]);
            repositoryFactory.clearLinks(SubjectProgramEligibility.schema.name, 'subject_uuid', [subjectUUID]);
            repositoryFactory.clearLinks(Family.schema.name, 'head_of_family_uuid', [subjectUUID]);

            deleteWithParts(programEncounters, visitParts);
            deleteWithParts(findByParents(DraftProgramEncounter.schema.name, 'programEnrolment.uuid', enrolmentUUIDs), visitParts);
            deleteWithParts(encounters, visitParts);
            deleteWithParts(checklistItems, ['observations']);
            deleteWithParts(checklists);
            deleteWithParts(enrolments, enrolmentParts);

            deleteWithParts(comments);
            deleteWithParts(commentThreadUUIDs
                .filter(threadUUID => this.getRepository(Comment.schema.name).findAll().filtered('commentThread.uuid = $0', threadUUID).length === 0)
                .map(threadUUID => this.getRepository(CommentThread.schema.name).findAll().filtered('uuid = $0', threadUUID)[0])
                .filter(_.identity));
            // Two queries: the OR makes SQLite scan group_subject
            deleteWithParts(find(GroupSubject.schema.name, 'groupSubject.uuid = $0'));
            deleteWithParts(find(GroupSubject.schema.name, 'memberSubject.uuid = $0'));
            deleteWithParts(this.getService(IndividualRelationshipService).findBySubject(subject).map(_.identity));
            deleteWithParts(find(DraftEncounter.schema.name, 'individual.uuid = $0'), visitParts);
            deleteWithParts(find(DraftEnrolment.schema.name, 'individual.uuid = $0'), enrolmentParts);
            deleteWithParts(find(DraftSubject.schema.name, 'uuid = $0'), ['observations', 'registrationLocation']);

            deleteWithParts(find(Individual.schema.name, 'uuid = $0'), ['observations', 'registrationLocation']);
            deleteWithParts(approvalStatuses, ['observations']);
        });
    }

    // Chunked: SQLite rejects an expression more than 1000 terms deep
    findApprovalStatuses(entityUUIDsByType) {
        return _.flatMap(entityUUIDsByType, ([entityType, entityUUIDs]) =>
            _.flatMap(_.chunk(entityUUIDs, 500), uuids => this.getRepository(EntityApprovalStatus.schema.name).findAll()
                .filtered(`entityType = $0 AND (${RealmQueryService.orKeyValueQuery('entityUUID', uuids)})`, entityType)
                .map(_.identity)));
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
        this.transactionManager.write(() => {
            subjectMigration.hasMigrated = true;
            this.repository.create(subjectMigration, true);
        });
    }

    getSchema() {
        return SubjectMigration.schema.name;
    }
}

export default SubjectMigrationService
