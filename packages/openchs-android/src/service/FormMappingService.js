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
        const formMappings = this.findAllByCriteria(`voided = false AND entityUUID="${program.uuid}" AND form.formType="${Form.formTypes.ProgramEncounter}"`);
        return formMappings.map((formMapping) => {
            return this.findByUUID(formMapping.observationsTypeEntityUUID, EncounterType.schema.name);
        });
    }

    findEncounterTypesForEncounter() {
        //TODO: There are some encounter types whose mapping is synchronised to the client but the encounter types themselves are not, as form mapping API doesn't return mappings based on the organisation yet.
        const formMappings = this.findAllByCriteria(`voided = false AND form.formType="${Form.formTypes.Encounter}"`);
        let encounterTypes = [];
        formMappings.forEach((formMapping) => {
            let encounterType = this.findByUUID(formMapping.observationsTypeEntityUUID, EncounterType.schema.name);
            if (!_.isNil(encounterType))
                encounterTypes.push(encounterType);
        });
        return encounterTypes;
    }

    findFormForEncounterType(encounterType, formType = Form.formTypes.ProgramEncounter) {
        const formMapping = this.db.objects(FormMapping.schema.name)
            .filtered("observationsTypeEntityUUID = $0 AND form.formType = $1", encounterType.uuid, formType)[0];
        return formMapping.form;
    }

    allFormMappings() {
        const formMappings = this.db.objects(this.getSchema());
        return new FormQueryResult(formMappings);
    }

    findFormForCancellingEncounterType(encounterType, program) {
        let matchingFormMapping = this.allFormMappings()
            .forFormType(Form.formTypes.ProgramEncounterCancellation)
            .forEncounterType(encounterType)
            .forProgram(program)
            .bestMatch();
        return matchingFormMapping && matchingFormMapping.form;
    }
}

export default FormMappingService;