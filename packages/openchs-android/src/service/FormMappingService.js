// @flow
import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {EncounterType, Form, FormMapping, Program, SubjectType} from "avni-models";
import _ from "lodash";
import FormQueryResult from "./FormQueryResult";

@Service("FormMappingService")
class FormMappingService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return FormMapping.schema.name;
    }

    _findProgramRelatedForm(program: Program, formType: string, subjectType: SubjectType) {
        let criteria = `voided = false AND entityUUID="${program.uuid}" AND form.formType="${formType}" and subjectType.uuid = "${subjectType.uuid}"`;
        const formMapping = this.findByCriteria(criteria);
        return _.isNil(formMapping) ? null : formMapping.form;
    }

    findFormForProgramEnrolment(program: Program, subjectType: SubjectType) {
        return this._findProgramRelatedForm(program, Form.formTypes.ProgramEnrolment, subjectType);
    }

    findProgramsForSubjectType(subjectType: SubjectType): Form {
        const enrolmentFormMappingsForSubjectType = this.allFormMappings()
            .unVoided()
            .forFormType(Form.formTypes.ProgramEnrolment)
            .forSubjectType(subjectType)
            .all();

        const programs = enrolmentFormMappingsForSubjectType.map(
            (formMapping) => this.findByUUID(formMapping.entityUUID, Program.schema.name));

        return _.uniqBy(_.compact(programs), 'uuid');
    }

    findFormForProgramExit(program: Program, subjectType: SubjectType) {
        return this._findProgramRelatedForm(program, Form.formTypes.ProgramExit, subjectType);
    }

    _findEncounterTypesForFormMapping = (formMapping) => {
        return this.findByUUID(formMapping.observationsTypeEntityUUID, EncounterType.schema.name);
    };

    findEncounterTypesForProgram(program: Program, subjectType: SubjectType) {
        let criteria = `voided = false AND entityUUID="${program.uuid}" AND form.formType="${Form.formTypes.ProgramEncounter}"`;
        if (subjectType) {
            criteria = `${criteria} and subjectType.uuid="${subjectType.uuid}"`
        }
        const formMappings = this.findAllByCriteria(criteria);
        return _.uniqBy(formMappings
            .map(this._findEncounterTypesForFormMapping)
            .filter(this.unVoided)
            .filter(et => !_.isEmpty(et)), 'uuid');
    }

    findEncounterTypesForSubjectType(subjectType: SubjectType): EncounterType[] {
        let criteria = `voided = false AND entityUUID=null AND form.formType="${Form.formTypes.Encounter}"`;
        if (subjectType) {
            criteria = `${criteria} and subjectType.uuid="${subjectType.uuid}"`
        }
        const formMappings = this.findAllByCriteria(criteria);
        return _.uniqBy(formMappings
            .map(this._findEncounterTypesForFormMapping)
            .filter(this.unVoided)
            .filter(et => !_.isEmpty(et)), 'uuid');
    }

    findEncounterTypesForEncounter(subjectType: SubjectType): Array<EncounterType> {
        //TODO: There are some encounter types whose mapping is synchronised to the client but the encounter types themselves are not, as form mapping API doesn't return mappings based on the organisation yet.
        let criteria = `voided = false AND form.formType="${Form.formTypes.Encounter}" and subjectType.uuid="${subjectType.uuid}"`;

        const formMappings = this.findAllByCriteria(criteria);
        return formMappings.map(this._findEncounterTypesForFormMapping)
            .filter(this.unVoided)
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

    findRegistrationForm(subjectType: SubjectType) {
        let criteria = `voided = false AND form.formType = "${Form.formTypes.IndividualProfile}" and subjectType.uuid = "${subjectType.uuid}"`;
        const formMapping = this.db.objects(FormMapping.schema.name)
            .filtered(criteria)[0];
        return _.get(formMapping, 'form');
    }

    findFormForCancellingEncounterType(encounterType: EncounterType, program: Program, subjectType: SubjectType) {
        const matchingFormMapping = _.isNil(program) ? this.individualEncounterType(encounterType, subjectType) :
            this.programEncounterType(encounterType, program, subjectType);
        return _.isNil(matchingFormMapping) ? null : matchingFormMapping.form;
    }

    programEncounterType(encounterType, program, subjectType) {
        return this.allFormMappings()
            .unVoided()
            .forFormType(Form.formTypes.ProgramEncounterCancellation)
            .forEncounterType(encounterType)
            .forProgram(program)
            .forSubjectType(subjectType)
            .bestMatch();
    }

    individualEncounterType(encounterType, subjectType) {
        return this.allFormMappings()
            .unVoided()
            .forFormType(Form.formTypes.IndividualEncounterCancellation)
            .forEncounterType(encounterType)
            .forSubjectType(subjectType)
            .bestMatch();
    }

    formMappingByCriteria(criteriaQuery){
        return this.findAllByCriteria(criteriaQuery)
    }
}

export default FormMappingService;
