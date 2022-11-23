import _ from "lodash";
import {TaskStatus} from 'openchs-models';

class TestTaskStatusFactory {
    static create({uuid} = {}) {
        const taskStatus = new TaskStatus();
        taskStatus.uuid = uuid;
        return taskStatus;
    }
}

export default TestTaskStatusFactory;
