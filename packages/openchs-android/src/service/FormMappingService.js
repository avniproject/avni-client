// @flow
import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {Encounter, EncounterType, Form, FormMapping, Individual, Program, ProgramEncounter, ProgramEnrolment, SubjectType} from "openchs-models";
import _ from "lodash";
import FormQueryResult from "./FormQueryResult";
import RealmQueryService from "./query/RealmQueryService";

function getEncounterTypeCriteria(subjectType, formType, entityCriteria) {
    let criteria = `voided = false AND ${entityCriteria} AND form.formType="${formType}"`;
    if (subjectType) {
        criteria = `${criteria} and subjectType.uuid="${subjectType.uuid}"`
    }
    return criteria;
}

@Service("FormMappingService")
class FormMappingService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return FormMapping.schema.name;
    }

    active(item) {
        return _.get(item, 'active');
    }

    _findProgramRelatedForm(program: Program, formType: string, subjectType: SubjectType) {
        let criteria = `voided = false AND entityUUID="${program.uuid}" AND form.formType="${formType}" and subjectType.uuid = "${subjectType.uuid}"`;
        const formMapping = this.findByCriteria(criteria);
        return _.isNil(formMapping) ? null : formMapping.form;
    }

    findFormForProgramEnrolment(program: Program, subjectType: SubjectType) {
        return this._findProgramRelatedForm(program, Form.formTypes.ProgramEnrolment, subjectType);
    }

    findProgramsForSubjectType(subjectType: SubjectType): Program[] {
        const programs = this.getEnrolmentFormMappingsForSubjectType(subjectType).map(
            (formMapping) => this.findByUUID(formMapping.entityUUID, Program.schema.name))
            .filter(this.unVoided);

        return _.uniqBy(_.compact(programs), 'uuid');
    }

    getEnrolmentFormMappingsForSubjectType(subjectType) {
        return this.allFormMappings()
            .unVoided()
            .forFormType(Form.formTypes.ProgramEnrolment)
            .forSubjectType(subjectType)
            .all();
    }

    findActiveProgramsForSubjectType(subjectType) {
        const programs = this.getEnrolmentFormMappingsForSubjectType(subjectType).map(
            (formMapping) => this.findByUUID(formMapping.entityUUID, Program.schema.name))
            .filter(prog => this.active(prog) && this.unVoided(prog));

        return _.uniqBy(_.compact(programs), 'uuid');
    }

    findProgramEncounterTypesForSubjectTypesAndPrograms(subjectTypes, programs) {
        if (programs.length === 0) return [];

        const subjectTypesCriteria = RealmQueryService.orKeyValueQuery('subjectType.uuid', subjectTypes.map(x => x.uuid));
        const programCriteria = RealmQueryService.orKeyValueQuery('entityUUID', programs.map(program => program.uuid));
        const criteria = RealmQueryService.andQuery(['voided = false', subjectTypesCriteria, `form.formType="${Form.formTypes.ProgramEncounter}"`, programCriteria]);
        return this.getEncounterTypes(criteria);
    }

    findFormForProgramExit(program: Program, subjectType: SubjectType) {
        return this._findProgramRelatedForm(program, Form.formTypes.ProgramExit, subjectType);
    }

    _findEncounterTypesForFormMapping = (formMapping) => {
        return this.findByUUID(formMapping.observationsTypeEntityUUID, EncounterType.schema.name);
    };

    findEncounterTypesForProgram(program: Program, subjectType: SubjectType) {
        let criteria = getEncounterTypeCriteria(subjectType, Form.formTypes.ProgramEncounter, `entityUUID="${program.uuid}"`);
        return this.getEncounterTypes(criteria);
    }

    findGeneralEncounterTypesForSubjectTypes(subjectTypes) {
        const formMappingService = this;
        return _.reduce(subjectTypes,
            (acc, subjectType) => _.unionBy(acc, formMappingService.findEncounterTypesForSubjectType(subjectType), (x) => x.uuid),
            []);
    }

    findProgramsForSubjectTypes(subjectTypes) {
        const formMappingService = this;
        return _.reduce(subjectTypes,
            (acc, subjectType) => _.unionBy(acc, formMappingService.findProgramsForSubjectType(subjectType), (x) => x.uuid),
            []);
    }

    findActiveEncounterTypesForProgram(program: Program, subjectType: SubjectType) {
        let criteria = getEncounterTypeCriteria(subjectType, Form.formTypes.ProgramEncounter, `entityUUID="${program.uuid}"`);
        return this.getEncounterTypes(criteria).filter(this.active);
    }

    getEncounterTypes(criteria) {
        const formMappings = this.findAllByCriteria(criteria);
        return _.uniqBy(formMappings
            .map(this._findEncounterTypesForFormMapping)
            .filter(this.unVoided)
            .filter(et => !_.isEmpty(et)), 'uuid');
    }

    findEncounterTypesForSubjectType(subjectType: SubjectType): EncounterType[] {
        const criteria = getEncounterTypeCriteria(subjectType, Form.formTypes.Encounter, `entityUUID=null`);
        return this.getEncounterTypesForSubject(criteria);
    }

    findActiveEncounterTypesForSubjectType(subjectType: SubjectType): EncounterType[] {
        let criteria = getEncounterTypeCriteria(subjectType, Form.formTypes.Encounter, `entityUUID=null`);
        return this.getEncounterTypesForSubject(criteria).filter(this.active);
    }

    getEncounterTypesForSubject(criteria) {
        const formMappings = this.findAllByCriteria(criteria);
        return _.uniqBy(formMappings
            .map(this._findEncounterTypesForFormMapping)
            .filter(this.unVoided)
            .filter(et => !_.isEmpty(et)), 'uuid');
    }

    findActiveEncounterTypesForEncounter(subjectType: SubjectType): Array<EncounterType> {
        //TODO: There are some encounter types whose mapping is synchronised to the client but the encounter types themselves are not, as form mapping API doesn't return mappings based on the organisation yet.
        let criteria = `voided = false AND form.formType="${Form.formTypes.Encounter}" and subjectType.uuid="${subjectType.uuid}"`;

        const formMappings = this.findAllByCriteria(criteria);
        return formMappings.map(this._findEncounterTypesForFormMapping)
            .filter(this.unVoided)
            .filter(this.active)
            .filter(et => !_.isEmpty(et));
    }

    findFormForEncounterType(encounterType: EncounterType, formType: string = Form.formTypes.ProgramEncounter, subjectType: SubjectType): Form {
        let criteria = "voided = false AND observationsTypeEntityUUID = $0 AND form.formType = $1 and subjectType.uuid = $2";
        let params = [encounterType.uuid, formType, subjectType.uuid];
        const formMapping = this.db.objects(FormMapping.schema.name)
            .filtered(criteria, ...params)[0];
        return _.get(formMapping, 'form');
    }

    findProgramUUIDForEncounterType(encounterType: EncounterType, subjectType: SubjectType): ?string {
        const formMapping = this.db.objects(FormMapping.schema.name)
            .filtered(
                "voided = false AND observationsTypeEntityUUID = $0 AND form.formType = $1 AND subjectType.uuid = $2",
                encounterType.uuid, Form.formTypes.ProgramEncounter, subjectType.uuid
            )[0];
        return formMapping ? formMapping.programUUID : null;
    }

    allFormMappings() {
        const formMappings = this.db.objects(this.getSchema());
        return new FormQueryResult(formMappings);
    }

    getRegistrationFormMapping(subjectType) {
        let criteria = `voided = false AND form.formType = "${Form.formTypes.IndividualProfile}" and subjectType.uuid = "${subjectType.uuid}"`;
        return this.db.objects(FormMapping.schema.name).filtered(criteria)[0];
    }

    findRegistrationForm(subjectType: SubjectType) {
        const formMapping = this.getRegistrationFormMapping(subjectType);
        return _.get(formMapping, 'form');
    }

    isApprovalEnabledForRegistrationForm(subjectType) {
        return !!_.get(this.getRegistrationFormMapping(subjectType), 'enableApproval');
    }

    isApprovalEnabledForProgramForm(subjectType, program, isExit = false) {
        const formType = isExit ? Form.formTypes.ProgramExit : Form.formTypes.ProgramEnrolment;
        let criteria = `voided = false AND entityUUID="${program.uuid}" AND form.formType="${formType}" and subjectType.uuid = "${subjectType.uuid}"`;
        const formMapping = this.findByCriteria(criteria);
        return !!_.get(formMapping, 'enableApproval');
    }

    isApprovalEnabledForEncounterForm(subjectType, encounterType, isCancel = false) {
        const formMapping = isCancel ?
            this.getCancellationFormMappingsForIndividualEncounter(encounterType, subjectType) :
            this.getIndividualEncounterFormMapping(encounterType, subjectType);
        return !!_.get(formMapping, 'enableApproval');
    }

    isApprovalEnabledForProgramEncounterForm(subjectType, program, encounterType, isCancel = false) {
        const formMapping = isCancel ?
            this.getCancellationFormMappingsForProgramEncounterType(encounterType, program, subjectType) :
            this.getProgramEncounterFormMapping(encounterType, program, subjectType);
        return !!_.get(formMapping, 'enableApproval');
    }

    /**
     * The Approval or Rejection form to open when a decision is made on this record, or null if the
     * organisation has attached none - which is every organisation until one is configured, and the case
     * that must keep falling through to the comment box.
     *
     * The server attaches a decision form to exactly the same (subject type, programme, visit type)
     * combination as the form whose approval switch produced the decision (avni-server#1052), so the
     * triple is matched exactly. Approximate matching would be wrong in a way that is hard to spot: a
     * subject type carrying an Approval form at the subject level and another on one of its programmes
     * shares both subject type and form type across the two, and only the programme separates them.
     *
     * A cancelled encounter is approved as an Encounter and a programme exit as a ProgramEnrolment, so
     * each shares its triple's decision form. That is intended, not an oversight.
     */
    findApprovalFormFor(entity) {
        return this.findDecisionForm(entity, Form.formTypes.Approval);
    }

    findRejectionFormFor(entity) {
        return this.findDecisionForm(entity, Form.formTypes.Rejection);
    }

    findDecisionForm(entity, formType) {
        const triple = this.approvalCombinationFor(entity);
        if (_.isNil(triple)) return null;
        const uuidOf = (x) => _.get(x, 'uuid') || null;
        const formMapping = _.find(
            this.allFormMappings().unVoided().forFormType(formType).all(),
            (fm) => _.get(fm, 'subjectType.uuid') === uuidOf(triple.subjectType)
                && (fm.entityUUID || null) === uuidOf(triple.program)
                && (fm.observationsTypeEntityUUID || null) === uuidOf(triple.encounterType));
        return _.get(formMapping, 'form') || null;
    }

    /**
     * The combination a decision on this record belongs to. Mirrors the switch in
     * ApprovalDetailsView#findForm, which resolves the form of the record itself rather than of the
     * decision, so the two lookups stay recognisably the same shape.
     */
    approvalCombinationFor(entity) {
        const get = (property) => _.get(entity, property);
        switch (entity.getSchemaName()) {
            case Individual.schema.name:
                return {subjectType: get('subjectType'), program: null, encounterType: null};
            case ProgramEnrolment.schema.name:
                return {subjectType: get('individual.subjectType'), program: get('program'), encounterType: null};
            case Encounter.schema.name:
                return {subjectType: get('individual.subjectType'), program: null, encounterType: get('encounterType')};
            case ProgramEncounter.schema.name:
                return {
                    subjectType: get('individual.subjectType'),
                    program: get('programEnrolment.program'),
                    encounterType: get('encounterType')
                };
            default:
                // ChecklistItem is listed on the approval dashboard but has no form mapping of its own,
                // so a decision on one has no form to open and falls through to the comment box.
                return null;
        }
    }

    findFormForCancellingEncounterType(encounterType: EncounterType, program: Program, subjectType: SubjectType) {
        const matchingFormMapping = _.isNil(program) ? this.getCancellationFormMappingsForIndividualEncounter(encounterType, subjectType) :
            this.getCancellationFormMappingsForProgramEncounterType(encounterType, program, subjectType);
        return _.isNil(matchingFormMapping) ? null : matchingFormMapping.form;
    }

    getCancellationFormMappingsForProgramEncounterType(encounterType, program, subjectType) {
        return this.allFormMappings()
            .unVoided()
            .forFormType(Form.formTypes.ProgramEncounterCancellation)
            .forEncounterType(encounterType)
            .forProgram(program)
            .forSubjectType(subjectType)
            .bestMatch();
    }

    getCancellationFormMappingsForIndividualEncounter(encounterType, subjectType) {
        return this.allFormMappings()
            .unVoided()
            .forFormType(Form.formTypes.IndividualEncounterCancellation)
            .forEncounterType(encounterType)
            .forSubjectType(subjectType)
            .bestMatch();
    }

    getIndividualEncounterForm(encounterType, subjectType) {
        const formMapping = this.getIndividualEncounterFormMapping(encounterType, subjectType);
        return _.get(formMapping, 'form');
    }

    getIndividualEncounterCancellationForm(encounterType, subjectType) {
        const formMapping = this.getCancellationFormMappingsForIndividualEncounter(encounterType, subjectType);
        return _.get(formMapping, 'form');
    }

    getIndividualEncounterFormMapping(encounterType, subjectType) {
        return this.allFormMappings()
            .unVoided()
            .forEncounterType(encounterType)
            .forFormType(Form.formTypes.Encounter)
            .forSubjectType(subjectType)
            .bestMatch();
    }

    getProgramEncounterFormMapping(encounterType, program, subjectType) {
        return this.allFormMappings()
            .unVoided()
            .forEncounterType(encounterType)
            .forProgram(program)
            .forFormType(Form.formTypes.ProgramEncounter)
            .forSubjectType(subjectType)
            .bestMatch()
    }

    getProgramEncounterForm(encounterType, program, subjectType) {
        const formMapping = this.getProgramEncounterFormMapping(encounterType, program, subjectType);
        return _.get(formMapping, 'form');
    }

    getAllWithEnableApproval() {
        return this.getAllNonVoided().filtered('enableApproval = true').sorted('subjectType.name').map(_.identity);
    }

    formMappingByCriteria(criteriaQuery) {
        return this.findAllByCriteria(criteriaQuery)
    }

    getTaskFormMapping(taskType) {
        let criteria = `voided = false AND form.formType = "${Form.formTypes.Task}" and taskType.uuid = "${taskType.uuid}"`;
        return this.db.objects(FormMapping.schema.name).filtered(criteria)[0];
    }

    getManualEnrolmentEligibilityForm(subjectType, program) {
        return this._findProgramRelatedForm(program, Form.formTypes.ManualProgramEnrolmentEligibility, subjectType);
    }

    getFormMappingsForSubjectType(subjectType) {
        return this.findAll()
            .filtered('subjectType.uuid = $0', subjectType.uuid);
    }
}

export default FormMappingService;
