import {assert} from 'chai';
import FormQueryResult from "../../src/service/FormQueryResult";
import {Program, FormMapping, Form} from "openchs-models";
import General from "../../src/utility/General";

const createForm = (formType) => {
    let form = new Form();
    form.uuid = General.randomUUID();
    form.formType = formType;
    return form;
};

describe("FormQueryResult", () => {
    let formMappings;
    const program = new Program();
    program.uuid = General.randomUUID();


    beforeEach(() => {
        let defaultEncounterForm = createForm('Encounter');
        let aProgramEnrolmentForm = createForm('ProgramEnrolment');
        let aProgramEncounterForm = createForm('ProgramEncounter');
        let bProgramEncounterForm = createForm('ProgramEncounter');
        let aProgramExitForm = createForm('ProgramExit');
        let aProgramEncounterCancelForm = createForm('ProgramEncounterCancel');

        formMappings = [
            FormMapping.create("a", defaultEncounterForm, null, null),
            FormMapping.create("b", aProgramEnrolmentForm, program.uuid, null),
            FormMapping.create("c", aProgramEncounterForm, program.uuid, 'firstEncounterTypeUUID'),
            FormMapping.create("d", bProgramEncounterForm, program.uuid, 'secondEncounterTypeUUID'),
            FormMapping.create("e", aProgramExitForm, program.uuid, null),
            FormMapping.create("f", aProgramEncounterCancelForm, program.uuid, 'firstEncounterTypeUUID')
        ];
    });

    it("can retrieve enrolment form for a program", () => {
        assert.equal(new FormQueryResult(formMappings).forProgram({uuid: program.uuid}).forFormType('ProgramEnrolment').bestMatch().uuid, 'b');
    });

    it("can retrieve the default encounter form", () => {
        assert.equal(new FormQueryResult(formMappings).forFormType('Encounter').bestMatch().uuid, 'a');
    });

    it("can retrieve the program exit form", () => {
        assert.equal(new FormQueryResult(formMappings).forProgram({uuid: program.uuid}).forFormType('ProgramExit').bestMatch().uuid, 'e');
    });

    it("can retrieve the program encounter form", () => {
        assert.equal(new FormQueryResult(formMappings).forProgram({uuid: program.uuid}).forFormType('ProgramEncounter').forEncounterType({uuid: 'firstEncounterTypeUUID'}).bestMatch().uuid, 'c');
    });

    it("can retrieve the program encounter cancel form", () => {
        assert.equal(new FormQueryResult(formMappings).forProgram({uuid: program.uuid}).forFormType('ProgramEncounterCancel').forEncounterType({uuid: 'firstEncounterTypeUUID'}).bestMatch().uuid, 'f');
        assert.equal(new FormQueryResult(formMappings).forProgram({uuid: program.uuid}).forFormType('ProgramEncounterCancel').forEncounterType({uuid: 'secondEncounterTypeUUID'}).bestMatch(), undefined);
    });
});