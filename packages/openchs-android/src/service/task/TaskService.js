import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {EntityQueue, ObservationsHolder, Task} from 'openchs-models';
import General from "../../utility/General";
import _ from 'lodash';
import TaskFilter from "../../model/TaskFilter";

const getIncompleteTasks = function(taskService, taskTypeName) {
    return taskService.getAllNonVoided()
        .filtered(`taskType.type = '${taskTypeName}' and completedOn = null`);
}

@Service("taskService")
class TaskService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return Task.schema.name;
    }

    getIncompleteTasks(taskTypeName) {
        return getIncompleteTasks(this, taskTypeName).sorted('scheduledOn', true);
    }

    getFilteredTasks(taskFilter: TaskFilter) {
        let tasks = getIncompleteTasks(this, taskFilter.taskType.type);
        if (taskFilter.taskStatuses.length > 0)
            tasks = tasks.filtered(this.orFilterCriteria(taskFilter.taskStatuses, "taskStatus.uuid"));

        if (!_.isNil(taskFilter.taskCreatedDate))
            tasks = tasks.filtered("taskCreatedDate = $0", taskFilter.taskCreatedDate);
        if (!_.isNil(taskFilter.taskCompletedDate))
            tasks = tasks.filtered("taskCompletedDate = $0", taskFilter.taskCompletedDate);

        Object.keys(taskFilter.taskMetadataValues).forEach((x) => {
            const metadataConcept = taskFilter.taskType.getMetadataConcept(x);
            const taskMetadataValue = taskFilter.taskMetadataValues[x];
            if (!_.isEmpty(taskMetadataValue)) {
                const queryValue = metadataConcept.isCodedConcept() ? taskMetadataValue.uuid : taskMetadataValue;
                tasks = tasks.filtered("observations.concept.uuid = $0 and observations.valueJSON contains[c] $1",
                    metadataConcept.uuid, queryValue);
            }
        });
        return tasks.map(_.identity);
    }

    deleteTask(taskUUID, db) {
        const task = this.findByUUID(taskUUID);
        if (!_.isNil(task)) {
            db.delete(task);
        }
    }

    saveOrUpdate(task) {
        const db = this.db;
        ObservationsHolder.convertObsForSave(task.observations);
        ObservationsHolder.convertObsForSave(task.metadata);
        if (task.taskStatus.isTerminal) {
            task.setCompletedOn(new Date());
        }
        this.db.write(() => {
            db.create(Task.schema.name, task, true);
            db.create(EntityQueue.schema.name, EntityQueue.create(task, Task.schema.name));
        });
    }

    getObservationsForSubject(taskUuid, form) {
        const concepts = form.getAllFormElementConcepts();
        const task = this.findByUUID(taskUuid);
        return task.metadata.filter((o) => _.some(concepts, (x) => x.uuid === o.concept.uuid)).map((x) => x.shallowClone());
    }
}


export default TaskService
