import _ from 'lodash';
import WorkItem from "./WorkItem";
import General from "../utility/General";

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

    findWorkItemIndex(id) {
        return _.findIndex(this.workItems, {id});
    }

    setCurrentWorkItem(workItem) {
        let newCurrentWorkItem = this.findWorkItem(workItem.id);
        if (!newCurrentWorkItem) {
            throw new Error('Work Item does not exist in work list');
        }
        newCurrentWorkItem.validate();

        this.currentWorkItem = newCurrentWorkItem;
    }

    nextWorkItem() {
        let currentWorkItemIndex = this.findWorkItemIndex(this.currentWorkItem.id);
        return _.get(this.workItems, currentWorkItemIndex + 1);
    }

    withRegistration(subjectTypeName) {
        this.addWorkItems(new WorkItem(General.randomUUID(), WorkItem.type.REGISTRATION, {subjectTypeName}));
        return this;
    }

    withEnrolment(programName) {
        this.addWorkItems(new WorkItem(General.randomUUID(), WorkItem.type.PROGRAM_ENROLMENT, {programName}));
        return this;
    }

    withEncounter(params) {
        this.addWorkItems(new WorkItem(General.randomUUID(), WorkItem.type.PROGRAM_ENCOUNTER, params));
        return this;
    }

    withCancelledEncounter(params) {
        this.addWorkItems(new WorkItem(General.randomUUID(), WorkItem.type.CANCELLED_ENCOUNTER, params));
        return this;
    }
}

export default WorkList;