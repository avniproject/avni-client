import {TaskType} from 'openchs-models';
import General from "../../src/utility/General";

class TestTaskTypeFactory {
    static create({metadataSearchFields = [], name = General.randomUUID(), uuid = General.randomUUID(), type = TaskType.TaskTypeName.Call} = {}) {
        const taskType = new TaskType();
        taskType.uuid = uuid;
        taskType.name = name;
        taskType.type = type;
        taskType.metadataSearchFields = metadataSearchFields;
        return taskType;
    }
}

export default TestTaskTypeFactory;
