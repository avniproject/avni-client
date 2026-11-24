import {assert} from 'chai';
import _ from 'lodash';
import {Encounter, Form, FormMapping, Individual, Program, ProgramEncounter, ProgramEnrolment} from 'openchs-models';
import FormMappingService from "../../src/service/FormMappingService";
import FormQueryResult from "../../src/service/FormQueryResult";
import General from "../../src/utility/General";

/**
 * avniproject/avni-client#2091 - locating the Approval or Rejection form to open when an approver presses
 * Approve or Reject.
 *
 * The server attaches an Approval or Rejection mapping to exactly the same (subject type, programme, visit
 * type) combination as the form whose approval switch produced the decision (avni-server#1052), so the
 * lookup has to match that triple exactly rather than approximately. A subject type can carry an Approval
 * form at the subject level and another on one of its programmes; matching on subject type and form type
 * alone would confuse the two and open the wrong form.
 *
 * The five approval entity types collapse into four lookup shapes. A cancelled encounter is approved as an
 * Encounter and a programme exit as a ProgramEnrolment, so each shares its triple's form - intended, per
 * the spec's "The shape" section.
 */
describe('ApprovalFormLookup', () => {
    const subjectTypeA = {uuid: 'subject-type-a', name: 'Person'};
    const subjectTypeB = {uuid: 'subject-type-b', name: 'Household'};
    const programme = {uuid: 'programme-1'};
    const encounterType = {uuid: 'encounter-type-1'};

    let service, formMappings;

    function form(formType) {
        const f = new Form();
        f.uuid = General.randomUUID();
        f.formType = formType;
        return f;
    }

    function mapping(uuid, formType, subjectType, program, encType) {
        const fm = FormMapping.create(uuid, form(formType),
            _.get(program, 'uuid'), _.get(encType, 'uuid'));
        fm.subjectType = subjectType;
        return fm;
    }

    beforeEach(() => {
        formMappings = [];
        service = new FormMappingService(null, null);
        // The finders go through allFormMappings(); stubbing it keeps this a unit test with no Realm.
        service.allFormMappings = () => new FormQueryResult(formMappings);
    });

    function aSubject(subjectType) {
        const individual = new Individual();
        individual.uuid = General.randomUUID();
        individual.subjectType = subjectType;
        return individual;
    }

    function anEncounter(subjectType, encType) {
        const encounter = new Encounter();
        encounter.uuid = General.randomUUID();
        encounter.individual = aSubject(subjectType);
        encounter.encounterType = encType;
        return encounter;
    }

    function anEnrolment(subjectType, program) {
        const enrolment = new ProgramEnrolment();
        enrolment.uuid = General.randomUUID();
        enrolment.individual = aSubject(subjectType);
        enrolment.program = program;
        return enrolment;
    }

    function aProgramEncounter(subjectType, program, encType) {
        const programEncounter = new ProgramEncounter();
        programEncounter.uuid = General.randomUUID();
        programEncounter.programEnrolment = anEnrolment(subjectType, program);
        programEncounter.encounterType = encType;
        return programEncounter;
    }

    // The subject-registration shape

    it('finds the rejection form attached to a subject type', () => {
        formMappings.push(mapping('m1', Form.formTypes.Rejection, subjectTypeA, null, null));

        const found = service.findRejectionFormFor(aSubject(subjectTypeA));

        assert.isOk(found, 'a rejection form mapped to this subject type must be found');
        assert.equal(Form.formTypes.Rejection, found.formType);
    });

    it('finds the approval form attached to a subject type', () => {
        formMappings.push(mapping('m1', Form.formTypes.Approval, subjectTypeA, null, null));

        assert.equal(Form.formTypes.Approval,
            service.findApprovalFormFor(aSubject(subjectTypeA)).formType);
    });

    /**
     * Both may be attached to one combination, so the lookup must pick the one matching the button that
     * was pressed rather than whichever mapping comes back first.
     */
    it('tells approval and rejection apart on the same subject type', () => {
        formMappings.push(mapping('m1', Form.formTypes.Approval, subjectTypeA, null, null));
        formMappings.push(mapping('m2', Form.formTypes.Rejection, subjectTypeA, null, null));

        assert.equal(Form.formTypes.Approval, service.findApprovalFormFor(aSubject(subjectTypeA)).formType);
        assert.equal(Form.formTypes.Rejection, service.findRejectionFormFor(aSubject(subjectTypeA)).formType);
    });

    it('does not find a form mapped to a different subject type', () => {
        formMappings.push(mapping('m1', Form.formTypes.Rejection, subjectTypeB, null, null));

        assert.isNotOk(service.findRejectionFormFor(aSubject(subjectTypeA)));
    });

    /**
     * The case that makes exact-triple matching necessary. A programme-level rejection form shares the
     * subject type and the form type with a subject-level one; only the programme tells them apart.
     */
    it('does not open a programme form when approving the subject itself', () => {
        formMappings.push(mapping('m1', Form.formTypes.Rejection, subjectTypeA, programme, null));

        assert.isNotOk(service.findRejectionFormFor(aSubject(subjectTypeA)),
            "a programme's rejection form is not the subject type's");
    });

    // The encounter shape

    it('finds the rejection form for a general encounter', () => {
        formMappings.push(mapping('m1', Form.formTypes.Rejection, subjectTypeA, null, encounterType));

        assert.equal(Form.formTypes.Rejection,
            service.findRejectionFormFor(anEncounter(subjectTypeA, encounterType)).formType);
    });

    it('does not find an encounter form for a different visit type', () => {
        formMappings.push(mapping('m1', Form.formTypes.Rejection, subjectTypeA, null, {uuid: 'other-encounter-type'}));

        assert.isNotOk(service.findRejectionFormFor(anEncounter(subjectTypeA, encounterType)));
    });

    // The enrolment and programme-encounter shapes

    it('finds the rejection form for a programme enrolment', () => {
        formMappings.push(mapping('m1', Form.formTypes.Rejection, subjectTypeA, programme, null));

        assert.equal(Form.formTypes.Rejection,
            service.findRejectionFormFor(anEnrolment(subjectTypeA, programme)).formType);
    });

    it('finds the rejection form for a programme encounter', () => {
        formMappings.push(mapping('m1', Form.formTypes.Rejection, subjectTypeA, programme, encounterType));

        assert.equal(Form.formTypes.Rejection,
            service.findRejectionFormFor(aProgramEncounter(subjectTypeA, programme, encounterType)).formType);
    });

    it('does not confuse a programme encounter with a bare enrolment', () => {
        formMappings.push(mapping('m1', Form.formTypes.Rejection, subjectTypeA, programme, null));

        assert.isNotOk(service.findRejectionFormFor(aProgramEncounter(subjectTypeA, programme, encounterType)),
            "the enrolment's form is not the visit type's");
    });

    // The no-form case, which is every organisation on day one

    it('finds nothing when no decision form is attached', () => {
        assert.isNotOk(service.findRejectionFormFor(aSubject(subjectTypeA)));
        assert.isNotOk(service.findApprovalFormFor(aSubject(subjectTypeA)));
    });

    it('ignores a voided decision form', () => {
        const voided = mapping('m1', Form.formTypes.Rejection, subjectTypeA, null, null);
        voided.voided = true;
        formMappings.push(voided);

        assert.isNotOk(service.findRejectionFormFor(aSubject(subjectTypeA)),
            'a detached form must not go on opening');
    });
});
