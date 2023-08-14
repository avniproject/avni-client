import TaskService from "../../../../src/service/task/TaskService";
import EntityFactory from "../../../EntityFactory";
import TestTaskFactory from "../../../model/TestTaskFactory";
import TestObsFactory from "../../../model/TestObsFactory";
import TestConceptFactory from "../../../model/TestConceptFactory";
import {assert} from "chai";

function createForm() {
    const form = EntityFactory.createForm('foo');
    const formElementGroup1 = EntityFactory.createFormElementGroup('bar1', 1, form);
    let feg1Concept1 = EntityFactory.createConcept("bar1a1Concept", "Numeric", "ad2856b6-ab33-46f9-a9f4-67f9d5dac09e");
    formElementGroup1.addFormElement(EntityFactory.createFormElement('bar1a1', true, feg1Concept1));
    let feg1Concept2 = EntityFactory.createConcept("bar1a2Concept", "Numeric", "6127cdea-310a-4ae6-9af8-8bae7614c9fa");
    formElementGroup1.addFormElement(EntityFactory.createFormElement('bar1a2', true, feg1Concept2));

    const formElementGroup2 = EntityFactory.createFormElementGroup('bar2', 2, form);
    let feg2Concept1 = EntityFactory.createConcept("bar2b1Concept", "Numeric", "138a3a03-1a92-4b6c-ae4e-64b5af32dc74");
    formElementGroup2.addFormElement(EntityFactory.createFormElement('bar2b1', true, feg2Concept1));
    let feg2Concept2 = EntityFactory.createConcept("bar2b2Concept", "Numeric", "955c0314-d02a-4e7b-a0a0-6a9d6189dcdd");
    formElementGroup2.addFormElement(EntityFactory.createFormElement('bar2b2', true, feg2Concept2));
    return {form, feg1Concept1};
}

it('should getObservationsForSubject', function () {
    const {form, feg1Concept1} = createForm();
    const taskUuid = "task-uuid-1";
    const conceptUuid2 = "concept-uuid-2";

    const concept1 = TestConceptFactory.create({uuid: feg1Concept1.uuid});
    const concept2 = TestConceptFactory.create({uuid: conceptUuid2});

    const obs1 = TestObsFactory.create({concept: concept1});
    const obs2 = TestObsFactory.create({concept: concept2});
    const task = TestTaskFactory.create({uuid: taskUuid, metadata: [obs1, obs2]});

    const taskService = new TestTaskService({"task-uuid-1": task});
    const observationsForSubject = taskService.getObservationsForSubject(taskUuid, form);
    assert.equal(observationsForSubject.length, 1);
    assert.equal(observationsForSubject[0].concept.uuid, feg1Concept1.uuid);
    assert.notEqual(observationsForSubject[0], obs1);
});

class TestTaskService extends TaskService {
    constructor(tasks) {
        super(null, null);
        this.tasks = tasks;
    }

    findByUUID(uuid) {
        return this.tasks[uuid];
    }
}
