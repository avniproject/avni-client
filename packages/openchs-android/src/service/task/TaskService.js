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
            tasks = tasks.filtered(BaseService.orFilterCriteria(taskFilter.taskStatuses, "taskStatus.uuid"));

        if (!_.isNil(taskFilter.taskScheduledDate))
            tasks = tasks.filtered("scheduledOn = $0", taskFilter.taskScheduledDate);
        if (!_.isNil(taskFilter.taskCompletedDate))
            tasks = tasks.filtered("completedOn = $0", taskFilter.taskCompletedDate);

        Object.keys(taskFilter.taskMetadataValues).forEach((x) => {
            const metadataConcept = taskFilter.taskType.getMetadataConcept(x);
            const taskMetadataValue = taskFilter.taskMetadataValues[x];
            if (!_.isEmpty(taskMetadataValue)) {
                if (metadataConcept.isCodedConcept()) {
                    const orClause = taskMetadataValue.map((x) =>
                        `(metadata.concept.uuid == "${metadataConcept.uuid}" AND metadata.valueJSON contains "${x.uuid}")`).join(" OR ");
                    tasks = tasks.filtered(orClause);
                } else {
                    tasks = tasks.filtered("metadata.concept.uuid = $0 AND metadata.valueJSON contains[c] $1",
                        metadataConcept.uuid, taskMetadataValue);
                }
            }
        });
        return tasks;
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
