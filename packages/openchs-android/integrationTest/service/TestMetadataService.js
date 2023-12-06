import {ApprovalStatus, EncounterType, Program, SubjectType} from "openchs-models";
import TestSubjectTypeFactory from "../../test/model/TestSubjectTypeFactory";
import TestProgramFactory from "../../test/model/TestProgramFactory";
import TestEncounterTypeFactory from "../../test/model/TestEncounterTypeFactory";
import TestApprovalStatusFactory from "../../test/model/approval/TestApprovalStatusFactory";

class TestMetadataService {
    static create(db) {
        const metadata = {};
        metadata.subjectType = db.create(SubjectType, TestSubjectTypeFactory.createWithDefaults({type: SubjectType.types.Person, name: 'Beneficiary'}));
        metadata.program = db.create(Program, TestProgramFactory.create({name: 'Child'}));
        metadata.programEncounterType = db.create(EncounterType, TestEncounterTypeFactory.create({name: "Birth form"}));
        metadata.encounterType = db.create(EncounterType, TestEncounterTypeFactory.create({name: "Bar"}));
        metadata.approvedStatus = db.create(ApprovalStatus, TestApprovalStatusFactory.create({}));
        metadata.pendingStatus = db.create(ApprovalStatus, TestApprovalStatusFactory.create({status: ApprovalStatus.statuses.Pending}));
        metadata.rejectedStatus = db.create(ApprovalStatus, TestApprovalStatusFactory.create({status: ApprovalStatus.statuses.Rejected}));
        return metadata;
    }
}

export default TestMetadataService;
