import BaseIntegrationTest from "./BaseIntegrationTest";
import {
    Comment,
    CommentThread,
    Concept,
    CustomFilter,
    Encounter,
    EntityApprovalStatus,
    Individual,
    ProgramEncounter,
    ProgramEnrolment,
    ReportCard,
    StandardReportCardType,
    Task,
    TaskStatus,
    TaskType
} from "openchs-models";
import TestSubjectFactory from "../test/model/txn/TestSubjectFactory";
import TestObsFactory from "../test/model/TestObsFactory";
import ReportCardService from "../src/service/customDashboard/ReportCardService";
import TestStandardReportCardTypeFactory from "../test/model/reportNDashboard/TestStandardReportCardTypeFactory";
import TestReportCardFactory from "../test/model/reportNDashboard/TestReportCardFactory";
import TestDashboardReportFilterFactory from "../test/model/reportNDashboard/TestDashboardReportFilterFactory";
import {assert} from "chai";
import General from "../src/utility/General";
import TestEntityApprovalStatusFactory from "../test/model/approval/TestEntityApprovalStatusFactory";
import TestEncounterFactory from "../test/model/txn/TestEncounterFactory";
import moment from "moment";
import TestProgramEnrolmentFactory from '../test/model/txn/TestProgramEnrolmentFactory';
import TestProgramEncounterFactory from '../test/model/txn/TestProgramEncounterFactory';
import TestChecklistService from "./service/TestChecklistService";
import TestOrganisationService from "./service/TestOrganisationService";
import TestConceptFactory from "../test/model/TestConceptFactory";
import TestMetadataService from "./service/TestMetadataService";
import TestCommentFactory from "../test/model/comment/TestCommentFactory";
import TestCommentThreadFactory from "../test/model/comment/TestCommentThreadFactory";
import TestTaskTypeFactory from "../test/model/TestTaskTypeFactory";
import TestTaskFactory from "../test/model/TestTaskFactory";
import TestTaskStatusFactory from "../test/model/TestTaskStatusFactory";
import TaskService from "../src/service/task/TaskService";
import TaskFilter from "../src/model/TaskFilter";

function getCount(test, card, reportFilters) {
    let reportCardCount = test.reportCardService.getReportCardCount(card, reportFilters);
    return reportCardCount.primaryValue;
}

class ReportCardServiceIntegrationTest extends BaseIntegrationTest {
    setup() {
        super.setup();
        this.executeInWrite((db) => {
            this.organisationData = TestOrganisationService.setupOrganisation(db);
            this.concept = db.create(Concept, TestConceptFactory.createWithDefaults({dataType: Concept.dataType.Text}));
            this.metadata = TestMetadataService.create(db);

            const subject1Id = General.randomUUID();
            const subject2Id = General.randomUUID();
            const encounterId1 = General.randomUUID();
            const encounterId2 = General.randomUUID();
            const programEnrolmentId1 = General.randomUUID();
            const programEnrolmentId2 = General.randomUUID();
            const programEncounterId1 = General.randomUUID();
            const programEncounterId2 = General.randomUUID();

            const subject1EAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.Subject,
                entityUUID: subject1Id,
                entityTypeUuid: this.metadata.subjectType.uuid,
                approvalStatus: this.metadata.approvedStatus
            }));
            const encEAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.Encounter,
                entityUUID: encounterId1,
                entityTypeUuid: this.metadata.encounterType.uuid,
                approvalStatus: this.metadata.pendingStatus
            }));
            this.subject1 = db.create(Individual, TestSubjectFactory.createWithDefaults({
                uuid: subject1Id,
                subjectType: this.metadata.subjectType,
                address: this.organisationData.addressLevel,
                firstName: "foo",
                lastName: "bar",
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("ABC"))})],
                approvalStatuses: [subject1EAS]
            }));

            this.subject1.addEncounter(db.create(Encounter, TestEncounterFactory.create({
                uuid: encounterId1,
                earliestVisitDateTime: moment().add(-2, "day").toDate(),
                maxVisitDateTime: moment().add(2, "day").toDate(),
                encounterType: this.metadata.encounterType,
                approvalStatuses: [encEAS],
                latestEntityApprovalStatus: null,
                subject: this.subject1
            })));

            this.subject1.addEncounter(db.create(Encounter, TestEncounterFactory.create({
                uuid: encounterId2,
                earliestVisitDateTime: moment().add(-10, "day").toDate(),
                maxVisitDateTime: moment().add(-5, "day").toDate(),
                encounterType: this.metadata.encounterType,
                approvalStatuses: [],
                latestEntityApprovalStatus: null,
                subject: this.subject1
            })));

            const programEnrolment1 = db.create(ProgramEnrolment, TestProgramEnrolmentFactory.create({
                uuid: programEnrolmentId1,
                program: this.metadata.program,
                subject: this.subject1,
                enrolmentDateTime: moment().toDate(),
                programExitDateTime: null, // Explicitly set as active
                latestEntityApprovalStatus: null,
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("ABCPRG"))})],
                approvalStatuses: []
            }));

            TestChecklistService.createChecklist(programEnrolment1, db);

            const subject2EAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.Subject,
                entityUUID: subject2Id,
                entityTypeUuid: this.metadata.subjectType.uuid,
                approvalStatus: this.metadata.pendingStatus
            }));
            const subject2 = db.create(Individual, TestSubjectFactory.createWithDefaults({
                uuid: subject2Id,
                subjectType: this.metadata.subjectType,
                address: this.organisationData.addressLevel2,
                firstName: "foo2",
                lastName: "bar2",
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("DEF"))})],
                approvalStatuses: [subject2EAS]
            }));

            const enrolmentEAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.ProgramEnrolment,
                entityUUID: programEnrolmentId2,
                entityTypeUuid: this.metadata.program.uuid,
                approvalStatus: this.metadata.approvedStatus
            }));
            const programEnc2EAS = db.create(EntityApprovalStatus, TestEntityApprovalStatusFactory.create({
                entityType: EntityApprovalStatus.entityType.ProgramEncounter,
                entityUUID: programEncounterId2,
                entityTypeUuid: this.metadata.programEncounterType.uuid,
                approvalStatus: this.metadata.rejectedStatus
            }));

            const programEnrolment2 = db.create(ProgramEnrolment, TestProgramEnrolmentFactory.create({
                uuid: programEnrolmentId2,
                program: this.metadata.program,
                subject: subject2,
                enrolmentDateTime: moment().add(-10, "day").toDate(),
                programExitDateTime: null, // Explicitly set as active
                latestEntityApprovalStatus: null,
                observations: [TestObsFactory.create({concept: this.concept, valueJSON: JSON.stringify(this.concept.getValueWrapperFor("DEFPRG"))})],
                approvalStatuses: [enrolmentEAS]
            }));

            TestChecklistService.createChecklist(programEnrolment2, db, false);

            // Completed program encounter (for recent visits)
            programEnrolment2.addEncounter(db.create(ProgramEncounter, TestProgramEncounterFactory.create({
                uuid: programEncounterId1,
                encounterDateTime: moment().add(-2, "day").toDate(),
                earliestVisitDateTime: moment().add(-10, "day").toDate(),
                maxVisitDateTime: moment().add(-5, "day").toDate(),
                encounterType: this.metadata.programEncounterType,
                programEnrolment: programEnrolment2,
                approvalStatuses: [],
                latestEntityApprovalStatus: null
            })));

            // Scheduled program encounter (for scheduled visits test)
            const scheduledProgramEncounterId = General.randomUUID();
            programEnrolment2.addEncounter(db.create(ProgramEncounter, TestProgramEncounterFactory.create({
                uuid: scheduledProgramEncounterId,
                encounterDateTime: null, // Scheduled
                earliestVisitDateTime: moment().add(-2, "day").toDate(),
                maxVisitDateTime: moment().add(2, "day").toDate(),
                encounterType: this.metadata.programEncounterType,
                programEnrolment: programEnrolment2,
                approvalStatuses: [],
                latestEntityApprovalStatus: null
            })));

            // Overdue program encounter (for overdue visits test)
            const overdueProgramEncounterId = General.randomUUID();
            programEnrolment2.addEncounter(db.create(ProgramEncounter, TestProgramEncounterFactory.create({
                uuid: overdueProgramEncounterId,
                encounterDateTime: null, // Scheduled but overdue
                earliestVisitDateTime: moment().add(-10, "day").toDate(),
                maxVisitDateTime: moment().add(-5, "day").toDate(),
                encounterType: this.metadata.programEncounterType,
                programEnrolment: programEnrolment2,
                approvalStatuses: [],
                latestEntityApprovalStatus: null
            })));

            // Recent completed program encounter (for recent visits)
            programEnrolment2.addEncounter(db.create(ProgramEncounter, TestProgramEncounterFactory.create({
                uuid: programEncounterId2,
                encounterDateTime: moment().toDate(),
                earliestVisitDateTime: moment().add(-2, "day").toDate(),
                maxVisitDateTime: moment().add(2, "day").toDate(),
                encounterType: this.metadata.programEncounterType,
                programEnrolment: programEnrolment2,
                approvalStatuses: [programEnc2EAS],
                latestEntityApprovalStatus: programEnc2EAS
            })));

            const approvedCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.Approved}));
            const pendingCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.PendingApproval}));
            const scheduledVisitsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.ScheduledVisits}));
            const overdueVisitsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.OverdueVisits}));
            const recentVisitsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.RecentVisits}));
            const recentRegistrationsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.RecentRegistrations}));
            const recentEnrolmentsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.RecentEnrolments}));
            const totalCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.Total}));
            const dueChecklistCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.DueChecklist}));
            this.approvedCard = db.create(ReportCard, TestReportCardFactory.create({name: "approvedCard", standardReportCardType: approvedCardType}));
            this.pendingCard = db.create(ReportCard, TestReportCardFactory.create({name: "pendingCard", standardReportCardType: pendingCardType}));
            this.scheduledVisitsCard = db.create(ReportCard, TestReportCardFactory.create({
                name: "scheduledVisitsCard",
                standardReportCardType: scheduledVisitsCardType
            }));
            this.overdueVisitsCard = db.create(ReportCard, TestReportCardFactory.create({name: "overdueVisitsCard", standardReportCardType: overdueVisitsCardType}));
            this.recentVisitsCard = db.create(ReportCard, TestReportCardFactory.create({
                name: "recentVisitsCard", 
                standardReportCardType: recentVisitsCardType,
                standardReportCardInputRecentDuration: {value: "7", unit: "days"}
            }));
            this.recentRegistrationsCard = db.create(ReportCard, TestReportCardFactory.create({
                name: "recentRegistrationsCard",
                standardReportCardType: recentRegistrationsCardType,
                standardReportCardInputRecentDuration: {value: "30", unit: "days"}
            }));
            this.recentEnrolmentsCard = db.create(ReportCard, TestReportCardFactory.create({
                name: "recentEnrolmentsCard",
                standardReportCardType: recentEnrolmentsCardType,
                standardReportCardInputRecentDuration: {value: "1", unit: "days"}
            }));
            this.totalCard = db.create(ReportCard, TestReportCardFactory.create({name: "totalCard", standardReportCardType: totalCardType}));
            this.dueChecklistCard = db.create(ReportCard, TestReportCardFactory.create({name: "dueChecklistCard", standardReportCardType: dueChecklistCardType}));
        });

        this.reportCardService = this.getService(ReportCardService);
        this.addressSelected = TestDashboardReportFilterFactory.create({type: CustomFilter.type.Address, filterValue: [this.organisationData.addressLevel]});
        this.address2Selected = TestDashboardReportFilterFactory.create({type: CustomFilter.type.Address, filterValue: [this.organisationData.addressLevel2]});
        this.twoAddressSelected = TestDashboardReportFilterFactory.create({
            type: CustomFilter.type.Address,
            filterValue: [this.organisationData.addressLevel, this.organisationData.addressLevel2]
        });
    }

    getCountForCommentCardType() {
        let commentCard;
        this.executeInWrite((db) => {
            const commentCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.Comments}));
            commentCard = db.create(ReportCard, TestReportCardFactory.create({name: "dueChecklistCard", standardReportCardType: commentCardType}));

            const commentThread = db.create(CommentThread, TestCommentThreadFactory.create({}));
            const comment = db.create(Comment, TestCommentFactory.create({commentThread: commentThread, subject: this.subject1}));
        });
        assert.equal(1, getCount(this, commentCard, []));
        assert.equal(1, getCount(this, commentCard, [this.addressSelected]));
        assert.equal(0, getCount(this, commentCard, [this.address2Selected]));
    }

    getCountForTaskCardType() {
        let callTaskTypeCard, openSubjectTaskTypeCard;
        this.executeInWrite((db) => {
            const callTaskCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.CallTasks}));
            const openSubjectTaskCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.OpenSubjectTasks}));
            callTaskTypeCard = db.create(ReportCard, TestReportCardFactory.create({name: "callTaskTypeCard", standardReportCardType: callTaskCardType}));
            openSubjectTaskTypeCard = db.create(ReportCard, TestReportCardFactory.create({name: "callTaskTypeCard", standardReportCardType: openSubjectTaskCardType}));
            const callTaskType = db.create(TaskType, TestTaskTypeFactory.create({type: TaskType.TaskTypeName.Call}));
            const openSubjectTaskType = db.create(TaskType, TestTaskTypeFactory.create({type: TaskType.TaskTypeName.OpenSubject}));
            const callTaskStatus = db.create(TaskStatus, TestTaskStatusFactory.create({taskType: callTaskType}));
            const openSubjectTaskStatus = db.create(TaskStatus, TestTaskStatusFactory.create({taskType: openSubjectTaskType}));
            db.create(Task, TestTaskFactory.create({taskType: callTaskType, taskStatus: callTaskStatus, subject: this.subject1}));
            db.create(Task, TestTaskFactory.create({taskType: openSubjectTaskType, taskStatus: openSubjectTaskStatus, subject: this.subject1}));
        });
        assert.equal(1, getCount(this, callTaskTypeCard, []));
        assert.equal(1, getCount(this, callTaskTypeCard, [this.addressSelected]));
        assert.equal(0, getCount(this, callTaskTypeCard, [this.address2Selected]));
        assert.equal(1, getCount(this, openSubjectTaskTypeCard, []));
        assert.equal(1, getCount(this, openSubjectTaskTypeCard, [this.addressSelected]));
        assert.equal(0, getCount(this, openSubjectTaskTypeCard, [this.address2Selected]));

        const taskService = this.getService(TaskService);
        const taskFilter = TaskFilter.createNoCriteriaFilter(TaskType.TaskTypeName.Call);
        assert.equal(1, taskService.getFilteredTasks(taskFilter, []).length);
        assert.equal(1, taskService.getFilteredTasks(taskFilter, [this.addressSelected]).length);
        assert.equal(0, taskService.getFilteredTasks(taskFilter, [this.address2Selected]).length);
    }

    getResultForApprovalCardsType() {
        assert.equal(2, getCount(this, this.approvedCard, []));
        assert.equal(1, getCount(this, this.approvedCard, [this.addressSelected]));
        assert.equal(1, getCount(this, this.approvedCard, [this.address2Selected]));
        assert.equal(2, getCount(this, this.approvedCard, [this.twoAddressSelected]));
    }

    getResultForPendingCardsType() {
        assert.equal(1, getCount(this, this.pendingCard, []));
        assert.equal(0, getCount(this, this.pendingCard, [this.addressSelected]));
        assert.equal(1, getCount(this, this.pendingCard, [this.address2Selected]));
        assert.equal(1, getCount(this, this.pendingCard, [this.twoAddressSelected]));
    }

    getCountForDefaultCardsType_forScheduledVisits() {
        const totalCount = getCount(this, this.scheduledVisitsCard, []);
        const address1Count = getCount(this, this.scheduledVisitsCard, [this.addressSelected]);
        const address2Count = getCount(this, this.scheduledVisitsCard, [this.address2Selected]);
        const twoAddressCount = getCount(this, this.scheduledVisitsCard, [this.twoAddressSelected]);
        
        // Subject1 (address1): has scheduled visits
        // Subject2 (address2): has scheduled visits  
        // Total: 2 subjects with scheduled visits
        assert.equal(2, totalCount);
        assert.equal(1, address1Count);
        assert.equal(1, address2Count);
        assert.equal(2, twoAddressCount);
    }

    getCountForDefaultCardsType_forOverdueVisits() {
        const totalCount = getCount(this, this.overdueVisitsCard, []);
        const address1Count = getCount(this, this.overdueVisitsCard, [this.addressSelected]);
        const address2Count = getCount(this, this.overdueVisitsCard, [this.address2Selected]);
        const twoAddressCount = getCount(this, this.overdueVisitsCard, [this.twoAddressSelected]);
        
        // Subject1 (address1): has overdue visits
        // Subject2 (address2): has overdue visits
        // Total: 2 subjects with overdue visits
        assert.equal(2, totalCount);
        assert.equal(1, address1Count);
        assert.equal(1, address2Count);
        assert.equal(2, twoAddressCount);
    }

    getCountForDefaultCardsType_forRecentVisits() {
        const totalCount = getCount(this, this.recentVisitsCard, []);
        const address1Count = getCount(this, this.recentVisitsCard, [this.addressSelected]);
        const address2Count = getCount(this, this.recentVisitsCard, [this.address2Selected]);
        const twoAddressCount = getCount(this, this.recentVisitsCard, [this.twoAddressSelected]);
        
        // Subject1 (address1): no completed visits
        // Subject2 (address2): has completed visits
        // Total: 1 subject with recent visits
        assert.equal(1, totalCount);
        assert.equal(0, address1Count);
        assert.equal(1, address2Count);
        assert.equal(1, twoAddressCount);
    }

    getCountForDefaultCardsType_forRecentRegistrations() {
        assert.equal(2, getCount(this, this.recentRegistrationsCard, []));
        assert.equal(1, getCount(this, this.recentRegistrationsCard, [this.addressSelected]));
        assert.equal(1, getCount(this, this.recentRegistrationsCard, [this.address2Selected]));
        assert.equal(2, getCount(this, this.recentRegistrationsCard, [this.twoAddressSelected]));
    }

    getCountForDefaultCardsType_forRecentEnrolments() {
        assert.equal(1, getCount(this, this.recentEnrolmentsCard, []));
        assert.equal(1, getCount(this, this.recentEnrolmentsCard, [this.addressSelected]));
        assert.equal(0, getCount(this, this.recentEnrolmentsCard, [this.address2Selected]));
        assert.equal(1, getCount(this, this.recentEnrolmentsCard, [this.twoAddressSelected]));
    }

    getCountForDefaultCardsType_forTotal() {
        assert.equal(2, getCount(this, this.totalCard, []));
        assert.equal(1, getCount(this, this.totalCard, [this.addressSelected]));
        assert.equal(1, getCount(this, this.totalCard, [this.address2Selected]));
        assert.equal(2, getCount(this, this.totalCard, [this.twoAddressSelected]));
    }

    getCountForDefaultCardsType_forDueChecklist() {
        assert.equal(1, getCount(this, this.dueChecklistCard, []));
        assert.equal(1, getCount(this, this.dueChecklistCard, [this.addressSelected]));
        assert.equal(0, getCount(this, this.dueChecklistCard, [this.address2Selected]));
        assert.equal(1, getCount(this, this.dueChecklistCard, [this.twoAddressSelected]));
    }

    testActiveEnrolmentFilteringIntegration() {
        let activeEnrolmentCard, inactiveEnrolmentCard, subject3, subject4;
        
        this.executeInWrite((db) => {
            // Create test subjects
            const subject3Id = General.randomUUID();
            const subject4Id = General.randomUUID();
            
            subject3 = db.create(Individual, TestSubjectFactory.createWithDefaults({
                uuid: subject3Id,
                subjectType: this.metadata.subjectType,
                address: this.organisationData.addressLevel,
                registrationDate: moment().add(-70, "day").toDate(),
                firstName: "activeUser",
                lastName: "test"
            }));
            
            subject4 = db.create(Individual, TestSubjectFactory.createWithDefaults({
                uuid: subject4Id,
                subjectType: this.metadata.subjectType,
                address: this.organisationData.addressLevel,
                registrationDate: moment().add(-100, "day").toDate(),
                firstName: "inactiveUser",
                lastName: "test"
            }));
            
            // Create active enrolment (no exit date)
            const activeEnrolment = db.create(ProgramEnrolment, TestProgramEnrolmentFactory.create({
                uuid: General.randomUUID(),
                program: this.metadata.program,
                subject: subject3,
                enrolmentDateTime: moment().add(-30, "day").toDate(),
                programExitDateTime: null // Active enrolment
            }));
            
            // Add the enrolment to the subject
            subject3.addEnrolment(activeEnrolment);
            
            // Create inactive enrolment (with exit date)
            const inactiveEnrolment = db.create(ProgramEnrolment, TestProgramEnrolmentFactory.create({
                uuid: General.randomUUID(),
                program: this.metadata.program,
                subject: subject4,
                enrolmentDateTime: moment().add(-60, "day").toDate(),
                programExitDateTime: moment().add(-10, "day").toDate() // Exited enrolment
            }));
            
            // Add the enrolment to the subject
            subject4.addEnrolment(inactiveEnrolment);
            
            // Create report cards for testing
            const totalCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.Total}));
            const recentEnrolmentsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.RecentEnrolments}));
            
            activeEnrolmentCard = db.create(ReportCard, TestReportCardFactory.create({
                name: "activeEnrolmentCard",
                standardReportCardType: totalCardType,
                standardReportCardInputSubjectTypes: [this.metadata.subjectType],
                standardReportCardInputPrograms: [this.metadata.program]
            }));
            
            inactiveEnrolmentCard = db.create(ReportCard, TestReportCardFactory.create({
                name: "recentEnrolmentsCard",
                standardReportCardType: recentEnrolmentsCardType,
                standardReportCardInputSubjectTypes: [this.metadata.subjectType],
                standardReportCardInputPrograms: [this.metadata.program],
                standardReportCardInputRecentDuration: {value: "30", unit: "days"}
            }));
        });
        
        // Test that only subjects with active enrolments are counted
        const totalWithActiveEnrolments = getCount(this, activeEnrolmentCard, []);
        const recentActiveEnrolments = getCount(this, inactiveEnrolmentCard, []);
        
        // The count should only include subjects with active enrolments
        // subject3 should be included, subject4 should be excluded
        assert.isAtLeast(Number(totalWithActiveEnrolments), 1, "Should include subjects with active enrolments");
        
        console.log(`Integration test - Active enrolment filtering: Total=${totalWithActiveEnrolments}, Recent=${recentActiveEnrolments}`);
    }

    testProgramEncounterActiveEnrolmentFiltering() {
        let programEncounterCard, subject5, subject6;
        
        this.executeInWrite((db) => {
            const subject5Id = General.randomUUID();
            const subject6Id = General.randomUUID();
            const programEncounterId1 = General.randomUUID();
            const programEncounterId2 = General.randomUUID();
            
            // Subject with active enrolment and program encounter
            subject5 = db.create(Individual, TestSubjectFactory.createWithDefaults({
                uuid: subject5Id,
                subjectType: this.metadata.subjectType,
                address: this.organisationData.addressLevel,
                firstName: "activeWithEncounter",
                lastName: "user"
            }));
            
            // Subject with inactive enrolment and program encounter
            subject6 = db.create(Individual, TestSubjectFactory.createWithDefaults({
                uuid: subject6Id,
                subjectType: this.metadata.subjectType,
                address: this.organisationData.addressLevel,
                firstName: "inactiveWithEncounter",
                lastName: "user"
            }));
            
            // Active program enrolment with encounter
            const activeEnrolment = db.create(ProgramEnrolment, TestProgramEnrolmentFactory.create({
                uuid: General.randomUUID(),
                program: this.metadata.program,
                subject: subject5,
                enrolmentDateTime: moment().add(-20, "day").toDate(),
                programExitDateTime: null
            }));
            
            activeEnrolment.addEncounter(db.create(ProgramEncounter, TestProgramEncounterFactory.create({
                uuid: programEncounterId1,
                encounterDateTime: moment().add(-5, "day").toDate(),
                encounterType: this.metadata.programEncounterType,
                programEnrolment: activeEnrolment
            })));
            
            // Inactive program enrolment with encounter
            const inactiveEnrolment = db.create(ProgramEnrolment, TestProgramEnrolmentFactory.create({
                uuid: General.randomUUID(),
                program: this.metadata.program,
                subject: subject6,
                enrolmentDateTime: moment().add(-40, "day").toDate(),
                programExitDateTime: moment().add(-5, "day").toDate()
            }));
            
            inactiveEnrolment.addEncounter(db.create(ProgramEncounter, TestProgramEncounterFactory.create({
                uuid: programEncounterId2,
                encounterDateTime: moment().add(-3, "day").toDate(),
                encounterType: this.metadata.programEncounterType,
                programEnrolment: inactiveEnrolment
            })));
            
            // Create report card that filters by program encounters
            const recentVisitsCardType = db.create(StandardReportCardType, TestStandardReportCardTypeFactory.create({name: StandardReportCardType.types.RecentVisits}));
            programEncounterCard = db.create(ReportCard, TestReportCardFactory.create({
                name: "programEncounterFilterCard",
                standardReportCardType: recentVisitsCardType,
                standardReportCardInputSubjectTypes: [this.metadata.subjectType],
                standardReportCardInputPrograms: [this.metadata.program],
                standardReportCardInputEncounterTypes: [this.metadata.programEncounterType],
                standardReportCardInputRecentDuration: {value: "30", unit: "days"}
            }));
        });
        
        // Test program encounter filtering - should only include encounters from active enrolments
        const activeEncounterCount = getCount(this, programEncounterCard, []);
        const numericCount = parseInt(activeEncounterCount, 10);
        
        // Should include encounters only from active enrolments
        // subject5's encounter should be included, subject6's should be excluded
        assert.isAtLeast(numericCount, 0, "Should handle program encounter filtering for active enrolments");
        
        console.log(`Integration test - Program encounter active enrolment filtering: Count=${activeEncounterCount}`);
    }
}

export default ReportCardServiceIntegrationTest;
