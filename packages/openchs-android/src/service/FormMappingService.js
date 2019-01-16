import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {FormMapping, Form, EncounterType} from "openchs-models";
import _ from 'lodash';
import FormQueryResult from "./FormQueryResult";

@Service("FormMappingService")
class FormMappingService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return FormMapping.schema.name;
    }

    findForm(entity) {
        const formMapping = this.findByKey('voided = false AND entityUUID', entity.uuid);
        return formMapping.form;
    }

    _findProgramRelatedForm(program, formType) {
        const formMapping = this.findByCriteria(`voided = false AND entityUUID="${program.uuid}" AND form.formType="${formType}"`);
        return _.isNil(formMapping) ? null : formMapping.form;
    }

    findFormForProgramEnrolment(program) {
        return this._findProgramRelatedForm(program, Form.formTypes.ProgramEnrolment);
    }

    findFormForProgramExit(program) {
        return this._findProgramRelatedForm(program, Form.formTypes.ProgramExit);
    }

    _findEncounterTypesForFormMapping = (formMapping) => {
        return this.findByUUID(formMapping.observationsTypeEntityUUID, EncounterType.schema.name);
    };

    findEncounterTypesForProgram(program) {
        const formMappings = this.findAllByCriteria(`voided = false AND entityUUID="${program.uuid}" AND form.formType="${Form.formTypes.ProgramEncounter}"`);
        return formMappings
            .map(this._findEncounterTypesForFormMapping)
            .filter(this.unVoided)
            .filter(et => !_.isEmpty(et));
    }

    findEncounterTypesForEncounter() {
        //TODO: There are some encounter types whose mapping is synchronised to the client but the encounter types themselves are not, as form mapping API doesn't return mappings based on the organisation yet.
        const formMappings = this.findAllByCriteria(`voided = false AND form.formType="${Form.formTypes.Encounter}"`);
        return formMappings.map(this._findEncounterTypesForFormMapping)
            .filter(this.unVoided)
            .filter(et => !_.isEmpty(et));
    }

    findFormForEncounterType(encounterType, formType = Form.formTypes.ProgramEncounter) {
        const formMapping = this.db.objects(FormMapping.schema.name)
            .filtered("voided = false AND observationsTypeEntityUUID = $0 AND form.formType = $1", encounterType.uuid, formType)[0];
        return _.get(formMapping,'form');
    }

    allFormMappings() {
        const formMappings = this.db.objects(this.getSchema());
        return new FormQueryResult(formMappings);
    }

    findRegistrationForm() {
        return this.findByKey('formType', Form.formTypes.IndividualProfile, Form.schema.name);
    }

    findFormForCancellingEncounterType(encounterType, program) {
        let matchingFormMapping = this.allFormMappings()
            .unVoided()
            .forFormType(Form.formTypes.ProgramEncounterCancellation)
            .forEncounterType(encounterType)
            .forProgram(program)
            .bestMatch();
        return _.isNil(matchingFormMapping) ? null : matchingFormMapping.form;
    }
}

export default FormMappingService;
