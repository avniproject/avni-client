import _ from "lodash";

export default class BaseTask {
    setDependencies(db, beans) {
        this.db = db;
        this.beans = beans;
    }

    assertDbPresent() {
        if (_.isNil(this.db)) {
            throw new Error("By now the set dependencies must have called. Something wrong.");
        }
    }

    assertBeansPresent() {
        if (_.isNil(this.beans)) {
            throw new Error("By now the set dependencies must have called. Something wrong.");
        }
    }

    execute() {
        throw new Error("Execute method must be implemented by the scheduled task");
    }
}