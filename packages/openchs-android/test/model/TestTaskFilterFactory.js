import _ from "lodash";
import TaskFilter from "../../src/model/TaskFilter";

class TestTaskFilterFactory {
    static create({taskType, taskMetadataValues}) {
        const taskFilter = new TaskFilter();
        taskFilter.taskType = taskType;
        taskFilter.taskMetadataValues = taskMetadataValues;
        return taskFilter;
    }
}

export default TestTaskFilterFactory;
