import {assert} from 'chai';
import {Encounter, EntityApprovalStatus, Individual, ProgramEncounter, ProgramEnrolment} from 'avni-models';
import ApprovalFormState from "../../src/state/ApprovalFormState";
import {ApprovalFormActions} from "../../src/action/approval/ApprovalFormActions";
import EntityApprovalStatusService from "../../src/service/EntityApprovalStatusService";
import RuleEvaluationService from "../../src/service/RuleEvaluationService";

/**
 * avniproject/avni-client#2091 - the subject a decision is about has to reach the rule engine.
 *
 * An EntityApprovalStatus carries only the UUID and type of the record being approved, so the subject is
 * not reachable from it by navigation. The declarative rule generated for Approval and Rejection forms
 * binds `const individual = params.entityContext && params.entityContext.individual`
 * (avniproject/rules-config#41), so if the entity context is empty the rule sees `individual` as
 * undefined and RuleCondition.valueInRegistration's guard yields no observation. A rule written against
 * the subject's registration answers then matches nothing rather than failing - silent, and it reads as
 * "the rule does not work" with nothing in the logs.
 *
 * Two paths have to carry it, and they are reached differently: ObservationsHolderActions passes
 * state.getEntityContext() on every cycle after load, and onFormLoad has to build the same context
 * itself because no state exists yet.
 */
describe('ApprovalFormEntityContext', () => {

    function aSubject() {
        const subject = new Individual();
        subject.uuid = 'subject-uuid';
        return subject;
    }

    function withIndividual(entity, subject) {
        Object.defineProperty(entity, 'individual', {value: subject, configurable: true});
        return entity;
    }

    describe('the subject behind an approved record', () => {
        it('a registration is its own subject', () => {
            const subject = aSubject();

            assert.equal(subject, ApprovalFormState.approvedSubjectOf(subject));
        });

        it('an encounter carries its subject', () => {
            const subject = aSubject();

            assert.equal(subject, ApprovalFormState.approvedSubjectOf(withIndividual(new Encounter(), subject)));
        });

        it('an enrolment carries its subject', () => {
            const subject = aSubject();

            assert.equal(subject, ApprovalFormState.approvedSubjectOf(withIndividual(new ProgramEnrolment(), subject)));
        });

        it('a programme encounter carries its subject', () => {
            const subject = aSubject();

            assert.equal(subject, ApprovalFormState.approvedSubjectOf(withIndividual(new ProgramEncounter(), subject)));
        });

        it('is null rather than undefined when there is no approved entity', () => {
            assert.isNull(ApprovalFormState.approvedSubjectOf(null));
            assert.isNull(ApprovalFormState.approvedSubjectOf(undefined));
        });
    });

    describe('the context handed to the rule engine', () => {
        it('binds the approved subject, not the decision', () => {
            const subject = aSubject();
            const state = new ApprovalFormState();
            state.approvedEntity = withIndividual(new Encounter(), subject);

            assert.equal(subject, state.getEntityContext().individual,
                'the generated rule reads params.entityContext.individual');
        });

        it('survives a clone, since every cycle clones before evaluating', () => {
            const subject = aSubject();
            const state = new ApprovalFormState();
            state.approvedEntity = subject;

            assert.equal(subject, state.clone().getEntityContext().individual);
        });
    });

    describe('on form load, before any state exists', () => {
        let capturedContexts;

        function contextStub() {
            return {
                get: (type) => {
                    if (type === EntityApprovalStatusService) {
                        return {getEntityTypeForSchema: () => EntityApprovalStatus.entityType.Encounter};
                    }
                    if (type === RuleEvaluationService) {
                        return {
                            getFormElementsStatuses: (entity, entityName, feg, entityContext) => {
                                capturedContexts.push(entityContext);
                                return [];
                            }
                        };
                    }
                    return {};
                }
            };
        }

        beforeEach(() => {
            capturedContexts = [];
        });

        it('passes the subject to the rule engine on the first evaluation', () => {
            const subject = aSubject();
            const entity = withIndividual(new Encounter(), subject);
            const form = {
                nonVoidedFormElementGroups: () => [{
                    displayOrder: 1,
                    uuid: 'feg-uuid',
                    filterElements: () => []
                }]
            };

            ApprovalFormActions.onFormLoad(
                ApprovalFormState.createEmptyState(),
                {entity, form, status: 'Rejected', schema: Encounter.schema.name},
                contextStub());

            assert.isAbove(capturedContexts.length, 0, 'the rule engine must be consulted on load');
            capturedContexts.forEach((entityContext) =>
                assert.equal(subject, entityContext.individual,
                    'every load-time evaluation must carry the subject, or the first page silently matches nothing'));
        });
    });
});
