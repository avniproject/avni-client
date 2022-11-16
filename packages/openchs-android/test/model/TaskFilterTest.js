import {assert} from 'chai';
import TestTaskFilterFactory from "./TestTaskFilterFactory";
import TestTaskTypeFactory from "./TestTaskTypeFactory";
import TestConceptFactory from "./TestConceptFactory";
import {Concept} from "openchs-models";
import TaskFilter from "../../src/model/TaskFilter";
import StubbedMessageService from "../action/service/stub/StubbedMessageService";

it('should get filter metadata selection display', function () {
    const answerConcept1 = TestConceptFactory.create({uuid: "uuid-a-1", name: "a1"});
    const answerConcept2 = TestConceptFactory.create({uuid: "uuid-a-2", name: "a2"});
    const concept1 = TestConceptFactory.create({uuid: "uuid-1", answers: [answerConcept1, answerConcept2], dataType: Concept.dataType.Coded});
    const concept2 = TestConceptFactory.create({uuid: "uuid-2", dataType: Concept.dataType.Numeric});

    const taskType = TestTaskTypeFactory.create({metadataSearchFields: [concept1, concept2]});
    const taskFilter = TestTaskFilterFactory.create({taskType: taskType, taskMetadataValues: {"uuid-1": [answerConcept1, answerConcept2], "uuid-2": 2}});
    const display = TaskFilter.getTaskMetadataDisplayValues(taskFilter, new StubbedMessageService().getI18n());
    assert.equal(display, "a1, a2, 2");
});
