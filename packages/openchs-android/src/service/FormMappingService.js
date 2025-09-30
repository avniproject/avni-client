// @flow
import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {EncounterType, Form, FormMapping, Program, SubjectType} from "openchs-models";
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
            .filtered('subjectType = $0', subjectType);
    }
}

export default FormMappingService;
