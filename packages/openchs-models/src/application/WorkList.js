import _ from 'lodash';

class WorkList {
    constructor(name, workItems = []) {
        this.name = name;
        this.workItems = workItems;
        this.initializeCurrentWorkItemIfRequiredAndPossible();
    }

    hasWorkItems() {
        return this.workItems.length > 0;
    }

    noCurrentWorkItemSet() {
        return !this.currentWorkItem;
    }

    initializeCurrentWorkItemIfRequiredAndPossible() {
        if (this.hasWorkItems() && this.noCurrentWorkItemSet()) {
            this.setCurrentWorkItem(this.workItems[0]);
        }
    }

    addWorkItems(...workItems) {
        this.workItems.push(...workItems);
        this.initializeCurrentWorkItemIfRequiredAndPossible();
    }

    findWorkItem(id) {
        return _.find(this.workItems, {id});
    }

    setCurrentWorkItem(workItem) {
        let newCurrentWorkItem = this.findWorkItem(workItem.id);
        if (!newCurrentWorkItem) {
            throw new Error('Work Item does not exist in work list');
        }
        newCurrentWorkItem.validate();

        this.currentWorkItem = newCurrentWorkItem;
    }
}

export default WorkList;