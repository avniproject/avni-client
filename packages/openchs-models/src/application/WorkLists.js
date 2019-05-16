import _ from 'lodash';

export default class WorkLists {
    constructor(...workLists) {
        this.workLists = workLists;
        this.setFirstWorkListAsCurrent();
    }

    setCurrentWorkListByName(name) {
        return _.find(this.workLists, {name});
    }

    setCurrentWorkList({name}) {
        return _.find(this.workLists, {name});
    }

    setFirstWorkListAsCurrent() {
        if (this.workLists.length > 0) {
            this.currentWorkList = this.workLists[0];
        }
    }

    getCurrentWorkItem() {
        return _.get(this.currentWorkList, 'currentWorkItem');
    }

    addItemsToCurrentWorkList(...workItems) {
        this.currentWorkList.addWorkItems(...workItems);
    }
}