import WorkList from '../../src/application/WorkList';
import WorkItem from '../../src/application/WorkItem';

describe('WorkList', () => {

    let workList, aSampleWorkItem, anotherSampleWorkItem;

    beforeEach(() => {
        workList = new WorkList('new WorkList');
        aSampleWorkItem = new WorkItem('0d3b8afa-6d4b-4e4b-9eb6-79467e3d9da4', WorkItem.type.REGISTRATION);
        anotherSampleWorkItem = new WorkItem("4f46533e-00b9-4e71-b0ab-75dd9996e481", WorkItem.type.PROGRAM_ENROLMENT,
            {
                subjectUUID: 'b05d37e5-4c1e-42a9-abd2-f9140695bcc9',
                programEnrolmentUUID: 'a66b2503-7a73-480d-b4fd-c012fc1e8000',
                programName: 'Mother Programme'
            });
        workList.addWorkItems(aSampleWorkItem, anotherSampleWorkItem);
    });

    it('defines a series of work items', () => {
        expect(workList.name).toBe('new WorkList');
        expect(workList.workItems.length).toBe(2);
    });

    it('sets up the first item as current by default', () => {
        expect(workList.currentWorkItem).toBe(aSampleWorkItem);
    });

    describe('setCurrentWorkItem', () => {
        it('allows moving of current work item', () => {
            workList.setCurrentWorkItem(anotherSampleWorkItem);
            expect(workList.currentWorkItem).toBe(anotherSampleWorkItem);
        });

        it('fails if current work item not in list', () => {
            const assignToMissingWorkItem = () => workList.setCurrentWorkItem(new WorkItem('867569c3-c7f3-443b-918a-8e893085a47f'));
            expect(assignToMissingWorkItem).toThrow('Work Item does not exist in work list');
        });

        it('validates that the current work item is ready to go', () => {
            let workItem = {id: '62e0973f-1c74-4381-bd0d-bc36f56b1c22', validate: jest.fn()};
            workList.addWorkItems(workItem);
            workList.setCurrentWorkItem(workItem);
            expect(workItem.validate).toHaveBeenCalled();
        });
    });
});