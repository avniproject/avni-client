import {TaskStatus} from 'openchs-models';
import General from "../../src/utility/General";

class TestTaskStatusFactory {
    static create({uuid = General.randomUUID(), name = General.randomUUID(), taskType} = {}) {
        const taskStatus = new TaskStatus();
        taskStatus.uuid = uuid;
        taskStatus.name = name;
        taskStatus.taskType = taskType;
        return taskStatus;
    }
}

export default TestTaskStatusFactory;
