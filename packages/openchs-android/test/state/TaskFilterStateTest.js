import {assert} from "chai";
import TestConceptFactory from "../model/TestConceptFactory";
import TestTaskTypeFactory from "../model/TestTaskTypeFactory";
import TaskFilterState from "../../src/state/TaskFilterState";
import TestTaskStatusFactory from "../model/TestTaskStatusFactory";
import {Concept} from 'openchs-models';

it('should toggle coded metadata fields', function () {
    const answerConcept1 = TestConceptFactory.create({uuid: "uuid-a-1"});
    const answerConcept2 = TestConceptFactory.create({uuid: "uuid-a-2"});
    const concept = TestConceptFactory.create({uuid: "uuid-1", answers: [answerConcept1, answerConcept2], dataType: Concept.dataType.Coded});

    const taskType = TestTaskTypeFactory.create({metadataSearchFields: [concept]});
    const taskStatus = TestTaskStatusFactory.create();

    const state = TaskFilterState.createEmptyState();
    TaskFilterState.initialise(state, [taskType], taskType, [taskStatus], "foo");

    TaskFilterState.changeMetadataCodedAnswer(state, concept, answerConcept1);
    assert.equal(state.taskMetadataValues["uuid-1"].length, 1);
    TaskFilterState.changeMetadataCodedAnswer(state, concept, answerConcept2);
    assert.equal(state.taskMetadataValues["uuid-1"].length, 2);
    TaskFilterState.changeMetadataCodedAnswer(state, concept, answerConcept1);
    assert.equal(state.taskMetadataValues["uuid-1"].length, 1);
});

it('should toggle task status', function () {
    const taskStatus1 = TestTaskStatusFactory.create({uuid: "ts-uuid-1"});
    const taskStatus2 = TestTaskStatusFactory.create({uuid: "ts-uuid-2"});

    const taskType = TestTaskTypeFactory.create({metadataSearchFields: []});
    const state = TaskFilterState.createEmptyState();
    TaskFilterState.initialise(state, [taskType], taskType, [taskStatus1, taskStatus2], "foo");
    TaskFilterState.toggleTaskStatus(state, taskStatus1);
    assert.equal(state.selectedTaskStatuses.length, 1);
    TaskFilterState.toggleTaskStatus(state, taskStatus2);
    assert.equal(state.selectedTaskStatuses.length, 2);
    TaskFilterState.toggleTaskStatus(state, taskStatus2);
    assert.equal(state.selectedTaskStatuses.length, 1);
});
