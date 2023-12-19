import {Task} from 'openchs-models';
import General from "../../src/utility/General";

class TestTaskFactory {
    static create({uuid = General.randomUUID(), metadata = [], name = General.randomUUID(), taskType, taskStatus, scheduledOn = new Date(), subject} = {}) {
        let task = new Task();
        task.uuid = uuid;
        task.name = name;
        task.metadata = metadata;
        task.taskType = taskType;
        task.taskStatus = taskStatus;
        task.scheduledOn = scheduledOn;
        task.subject = subject;
        return task;
    }
}

export default TestTaskFactory;
