import {ApprovalStatus, EncounterType, Form, FormMapping, Program, SubjectType} from "openchs-models";
import TestSubjectTypeFactory from "../../test/model/TestSubjectTypeFactory";
import TestProgramFactory from "../../test/model/TestProgramFactory";
import TestEncounterTypeFactory from "../../test/model/TestEncounterTypeFactory";
import TestApprovalStatusFactory from "../../test/model/approval/TestApprovalStatusFactory";
import TestFormFactory from "../../test/model/form/TestFormFactory";
import TestFormMappingFactory from "../../test/model/form/TestFormMappingFactory";

class TestMetadataService {
    static create(db) {
        const metadata = {};
        let returnData = TestMetadataService.createSubjectType(db, TestSubjectTypeFactory.createWithDefaults({type: SubjectType.types.Person, name: 'Beneficiary'}));
        metadata.subjectType = returnData.subjectType;
        metadata.subjectTypeFormMapping = returnData.formMapping;

        Object.assign(metadata, TestMetadataService.createProgram(db, metadata.subjectType, TestProgramFactory.create({name: 'Child'})));
        metadata.programEncounterType = db.create(EncounterType, TestEncounterTypeFactory.create({name: "Birth form"}));
        metadata.encounterType = db.create(EncounterType, TestEncounterTypeFactory.create({name: "Bar"}));
        metadata.approvedStatus = db.create(ApprovalStatus, TestApprovalStatusFactory.create({}));
        metadata.pendingStatus = db.create(ApprovalStatus, TestApprovalStatusFactory.create({status: ApprovalStatus.statuses.Pending}));
        metadata.rejectedStatus = db.create(ApprovalStatus, TestApprovalStatusFactory.create({status: ApprovalStatus.statuses.Rejected}));
        return metadata;
    }

    static createSubjectType(db, subjectType) {
        const savedSubjectType = db.create(SubjectType, subjectType);
        return {subjectType: savedSubjectType, ...TestMetadataService.createSubjectTypeForm(db, savedSubjectType)};
    }

    static createProgram(db, subjectType, program) {
        const returnData = {};
        returnData.program = db.create(Program, program);
        Object.assign(returnData, TestMetadataService.createProgramForms(db, subjectType, program));
        return returnData;
    }

    static createSubjectTypeForm(db, subjectType) {
        const form = db.create(Form, TestFormFactory.createWithDefaults({formType: Form.formTypes.IndividualProfile}));
        const formMapping = db.create(FormMapping, TestFormMappingFactory.createWithDefaults({subjectType: subjectType, form: form}));
        return {formMapping: formMapping};
    }

    static createProgramForms(db, subjectType, program) {
        const programEnrolmentForm = db.create(Form, TestFormFactory.createWithDefaults({formType: Form.formTypes.ProgramEnrolment}));
        const programEnrolmentFormMapping = db.create(FormMapping, TestFormMappingFactory.createWithDefaults({subjectType: subjectType, programUUID: program.uuid, form: programEnrolmentForm}));
        const programExitForm = db.create(Form, TestFormFactory.createWithDefaults({formType: Form.formTypes.ProgramExit}));
        const programExitFormMapping = db.create(FormMapping, TestFormMappingFactory.createWithDefaults({subjectType: subjectType, programUUID: program.uuid, form: programExitForm}));
        return {programEnrolmentFormMapping: programEnrolmentFormMapping, programExitFormMapping: programExitFormMapping};
    }
}

export default TestMetadataService;
