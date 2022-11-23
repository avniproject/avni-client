import {Task} from 'openchs-models';

class TestTaskFactory {
    static create({uuid, metadata}) {
        let task = new Task();
        task.uuid = uuid;
        task.metadata = metadata;
        return task;
    }
}

export default TestTaskFactory;
