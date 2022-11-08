import _ from "lodash";
import {TaskType} from 'openchs-models';

class TestTaskTypeFactory {
    static create({metadataSearchFields} = {metadataSearchFields: []}) {
        const taskType = new TaskType();
        taskType.metadataSearchFields = metadataSearchFields;
        return taskType;
    }
}

export default TestTaskTypeFactory;
