import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import FormMapping from "../models/application/FormMapping";
import _ from 'lodash';
import Form from '../models/application/Form';
import EncounterType from "../models/EncounterType";

@Service("FormMappingService")
class FormMappingService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return FormMapping.schema.name;
    }

    findForm(entity) {
        const formMapping = this.findByKey('entityUUID', entity.uuid);
        return formMapping.form;
    }

    _findProgramRelatedForm(program, formType) {
        const formMapping = this.findByCriteria(`entityUUID="${program.uuid}" AND form.formType="${formType}"`);
        return _.isNil(formMapping) ? null : formMapping.form;
    }

    findFormForProgramEnrolment(program) {
        return this._findProgramRelatedForm(program, Form.formTypes.ProgramEnrolment);
    }

    findFormForProgramExit(program) {
        return this._findProgramRelatedForm(program, Form.formTypes.ProgramExit);
    }

    findEncounterTypesForProgram(program) {
        const formMappings = this.findAllByCriteria(`entityUUID="${program.uuid}" AND form.formType="${Form.formTypes.ProgramEncounter}"`);
        return formMappings.map((formMapping) => {
            return this.findByUUID(formMapping.observationsTypeEntityUUID, EncounterType.schema.name);
        });
    }

    findEncounterTypesForEncounter() {
        const formMappings = this.findAllByCriteria(`form.formType="${Form.formTypes.Encounter}"`);
        return formMappings.map((formMapping) => {
            return this.findByUUID(formMapping.observationsTypeEntityUUID, EncounterType.schema.name);
        });
    }

    findFormForEncounterType(encounterType) {
        const formMapping = this.findByKey('observationsTypeEntityUUID', encounterType.uuid);
        return formMapping.form;
    }
}

export default FormMappingService;