import WorkItem from "../../src/application/WorkItem";

describe('WorkItem', () => {

    it('is initialized with a type and parameters', () => {
        new WorkItem(
            'd434e5f6-59f7-420b-8303-ca2623ac381e',
            WorkItem.type.REGISTRATION, {
            subjectTypeName: 'Individual',
        });
        new WorkItem(
            '185d334d-7a80-4b3b-8404-fdcba0e074b1',
            WorkItem.type.ENCOUNTER, {subjectUUID: '25479684-7ae4-44d8-bfd2-d5321dbc28bc'});
        new WorkItem(
            '185d334d-7a80-4b3b-8404-fdcba0e074b1',
            WorkItem.type.PROGRAM_ENROLMENT, {
            subjectUUID: '25479684-7ae4-44d8-bfd2-d5321dbc28bc',
            programName: 'Mother Programme'
        });
        new WorkItem(
            '185d334d-7a80-4b3b-8404-fdcba0e074b1',
            WorkItem.type.PROGRAM_ENCOUNTER, {
            subjectUUID: '25479684-7ae4-44d8-bfd2-d5321dbc28bc',
            programEnrolmentUUID: '88878496-45d9-4348-a5da-3255e1cfcfd8',
            encounterType: 'Child'
        });
        new WorkItem(
            '185d334d-7a80-4b3b-8404-fdcba0e074b1',
            WorkItem.type.ENCOUNTER, {
            subjectUUID: '25479684-7ae4-44d8-bfd2-d5321dbc28bc'
        });
    });

    //Since openchs-models is used outside the platform, it makes sense to have good contract validations.
    it('validates that the parameters are sufficient to perform the work', () => {
        const workItemWithoutId = () => new WorkItem().validate();
        const workItemWithoutType = () => new WorkItem('185d334d-7a80-4b3b-8404-fdcba0e074b1').validate();
        const encounterWithoutIndividual = () =>  new WorkItem(
            '185d334d-7a80-4b3b-8404-fdcba0e074b1',
            WorkItem.type.ENCOUNTER).validate();
        const programEncounterWithoutIndividual = () =>  new WorkItem(
            '185d334d-7a80-4b3b-8404-fdcba0e074b1',
            WorkItem.type.PROGRAM_ENCOUNTER, {
            programEnrolmentUUID: '88878496-45d9-4348-a5da-3255e1cfcfd8',
            encounterType: 'Child'
        }).validate();
        expect(workItemWithoutId).toThrow('Id is mandatory');
        expect(workItemWithoutType).toThrow('Work item must be one of WorkItem.type');
        expect(encounterWithoutIndividual).toThrow('subjectUUID is mandatory');
        expect(programEncounterWithoutIndividual).toThrow('subjectUUID is mandatory');
    })
});