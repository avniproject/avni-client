import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {FormMapping, Form, EncounterType} from "openchs-models";
import _ from 'lodash';

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
        //TODO: There are some encounter types whose mapping is synchronised to the client but the encounter types themselves are not, as form mapping API doesn't return mappings based on the organisation yet.
        const formMappings = this.findAllByCriteria(`form.formType="${Form.formTypes.Encounter}"`);
        let encounterTypes = [];
        formMappings.forEach((formMapping) => {
            let encounterType = this.findByUUID(formMapping.observationsTypeEntityUUID, EncounterType.schema.name);
            if (!_.isNil(encounterType))
                encounterTypes.push(encounterType);
        });
        return encounterTypes;
    }

    findFormForEncounterType(encounterType) {
        const formMapping = this.findByKey('observationsTypeEntityUUID', encounterType.uuid);
        return formMapping.form;
    }

    findFormForCancellingEncounterType(encounterType) {
        const formMapping = this.findByCriteria(`observationsTypeEntityUUID="${encounterType.uuid}" AND form.formType="${Form.formTypes.ProgramEncounterCancellation}"`);
        return _.isNil(formMapping) ? null : formMapping.form;
    }
}

export default FormMappingService;