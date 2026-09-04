// Mocks the Realm db (no in-memory Realm - see AttendanceFlowServicesTest for the same convention) and
// asserts on what EntityApprovalStatusService writes when an approval decision is saved.

import {assert} from "chai";

jest.mock("../../src/framework/bean/Service", () => () => (target) => target);

import {ApprovalStatus, EntityApprovalStatus, EntityQueue, Individual, Observation} from "avni-models";
import EntityApprovalStatusService from "../../src/service/EntityApprovalStatusService";
import EntityService from "../../src/service/EntityService";
import General from "../../src/utility/General";

global.Realm = global.Realm || {UpdateMode: {Modified: "modified"}};

/**
 * avniproject/avni-client#2092 - the answers an approver gave on the Approval or Rejection form are saved
 * with that decision and queued for sync.
 *
 * The regressions matter as much as the feature. This story edits the single code path that the no-form
 * case also runs, so "rejecting through the comment box is unchanged" is an acceptance criterion rather
 * than an assumption - every organisation is on that path until a form is configured.
 */
describe('ApprovalAnswersSave', () => {
    let service, writes, savedStatuses, queued;

    function aConcept(uuid, name) {
        return {uuid, name, datatype: 'Text', isQuestionGroup: () => false, getValueWrapperFor: (v) => v};
    }

    function anAnswer(conceptUuid, value) {
        const observation = new Observation();
        observation.concept = aConcept(conceptUuid, 'Rejection reason');
        observation.valueJSON = JSON.stringify({answer: value});
        return observation;
    }

    function aSubject() {
        const individual = new Individual();
        individual.uuid = General.randomUUID();
        individual.subjectType = {uuid: 'subject-type-uuid'};
        individual.approvalStatuses = [];
        individual.setLatestEntityApprovalStatus = function (x) {
            this.latestEntityApprovalStatus = x;
        };
        return individual;
    }

    beforeEach(() => {
        writes = 0;
        savedStatuses = [];
        queued = [];

        const db = {
            write: (fn) => {
                writes += 1;
                fn();
            },
            create: (schemaName, entity) => {
                if (schemaName === EntityApprovalStatus.schema.name) savedStatuses.push(entity);
                if (schemaName === EntityQueue.schema.name) queued.push(entity);
                return entity;
            },
            objects: () => ({filtered: () => []})
        };

        service = new EntityApprovalStatusService(db, null);
        service.db = db;
        // saveStatus resolves the ApprovalStatus row through EntityService.
        service.getService = (type) => {
            if (type === EntityService) {
                return {
                    findByKey: (key, value) => {
                        const approvalStatus = new ApprovalStatus();
                        approvalStatus.uuid = `approval-status-${value}`;
                        approvalStatus.status = value;
                        return approvalStatus;
                    }
                };
            }
            return {};
        };
    });

    function theOnlySavedStatus() {
        assert.equal(1, savedStatuses.length, 'exactly one approval decision should be written');
        return savedStatuses[0];
    }

    // The feature

    it('saves the answers with a rejection', () => {
        const answers = [anAnswer('concept-1', 'Wrong address')];

        service.rejectEntity(aSubject(), Individual.schema.name, 'Address did not match', answers);

        const saved = theOnlySavedStatus();
        assert.equal(ApprovalStatus.statuses.Rejected, saved.approvalStatus.status);
        assert.equal('Address did not match', saved.approvalStatusComment);
        assert.equal(1, saved.observations.length, 'the answers must be saved with the decision');
        assert.equal('concept-1', saved.observations[0].concept.uuid);
    });

    it('saves the answers with an approval', () => {
        const answers = [anAnswer('concept-2', 'Looks right')];

        service.approveEntity(aSubject(), Individual.schema.name, answers);

        const saved = theOnlySavedStatus();
        assert.equal(ApprovalStatus.statuses.Approved, saved.approvalStatus.status);
        assert.equal(1, saved.observations.length);
        assert.equal('concept-2', saved.observations[0].concept.uuid);
    });

    /**
     * The decision has to reach the server, which on the client means an EntityQueue row for the status
     * itself - not only for the record being approved.
     */
    it('queues the decision for sync', () => {
        service.rejectEntity(aSubject(), Individual.schema.name, 'a comment', [anAnswer('concept-1', 'x')]);

        assert.isAtLeast(queued.length, 2, 'both the decision and the record should be queued');
    });

    /**
     * One Realm transaction covers the status, the record and both queue rows. An exception mid-write
     * must roll all of it back, so a failed save looks like nothing happened rather than a partial sync.
     */
    it('writes everything in a single transaction', () => {
        service.rejectEntity(aSubject(), Individual.schema.name, 'a comment', [anAnswer('concept-1', 'x')]);

        assert.equal(1, writes, 'a second write would mean a partial save is possible');
    });

    // The regressions - the path every organisation is on until a form is configured

    it('rejecting through the comment box saves the comment and no answers', () => {
        service.rejectEntity(aSubject(), Individual.schema.name, 'Address did not match');

        const saved = theOnlySavedStatus();
        assert.equal(ApprovalStatus.statuses.Rejected, saved.approvalStatus.status);
        assert.equal('Address did not match', saved.approvalStatusComment);
        assert.equal(0, saved.observations.length, 'the modal path must not invent answers');
    });

    it('approving through the comment box saves no comment and no answers', () => {
        service.approveEntity(aSubject(), Individual.schema.name);

        const saved = theOnlySavedStatus();
        assert.equal(ApprovalStatus.statuses.Approved, saved.approvalStatus.status);
        assert.isNotOk(saved.approvalStatusComment);
        assert.equal(0, saved.observations.length);
    });

    /**
     * createPendingStatus calls saveStatus directly and has never had answers. It runs on every
     * registration and encounter in an approval-enabled organisation, so it is the highest-traffic caller
     * of the signature this story changes.
     */
    it('leaves the pending status created on save untouched', () => {
        const subject = aSubject();
        const db = service.db;

        service.createPendingStatus(subject, Individual.schema.name, db, 'subject-type-uuid');

        const saved = theOnlySavedStatus();
        assert.equal(ApprovalStatus.statuses.Pending, saved.approvalStatus.status);
        assert.equal(0, saved.observations.length);
    });

    /**
     * A record rejected, corrected and rejected again keeps both sets of answers, and the record points at
     * the newer decision. The dates are set explicitly rather than spaced in wall-clock time: _.maxBy on
     * two equal statusDateTimes picks arbitrarily, which is pre-existing behaviour and not this story's to
     * fix.
     */
    it('keeps both sets of answers when a record is rejected twice', () => {
        const subject = aSubject();

        service.rejectEntity(subject, Individual.schema.name, 'first', [anAnswer('concept-1', 'Wrong address')]);
        savedStatuses[0].statusDateTime = new Date('2026-09-01T10:00:00Z');

        service.rejectEntity(subject, Individual.schema.name, 'second', [anAnswer('concept-2', 'Still wrong')]);
        savedStatuses[1].statusDateTime = new Date('2026-09-02T10:00:00Z');
        // Recompute now that the dates are deterministic.
        service._addUpdateApprovalStatus(subject, savedStatuses[1]);

        assert.equal(2, savedStatuses.length, 'both rejections should be kept as separate decisions');
        assert.equal('concept-1', savedStatuses[0].observations[0].concept.uuid,
            'the earlier rejection keeps its own answers');
        assert.equal('concept-2', savedStatuses[1].observations[0].concept.uuid);
        assert.equal(savedStatuses[1].uuid, subject.latestEntityApprovalStatus.uuid,
            'the record should show the newer decision as its current one');
    });
});
