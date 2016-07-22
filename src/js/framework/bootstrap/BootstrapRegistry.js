import Registry from '../Registry';

class BootstrapRegistry extends Registry {
    constructor() {
        super();
        this.runAllTasks = this.runAllTasks.bind(this);
        this.runTask = this.runTask.bind(this);
        this.init = this.init.bind(this);
    }

    init(getBean) {
        this.getBean = getBean;
        this.entities = new Map(Array.from(this.entities).map(([taskName, task]) => [taskName, new task(this.getBean)]));
    }

    runAllTasks() {
        Array.from(this.entities).map(([taskName, task]) => task.run())
    }

    runTask(taskName) {
        this.entities.get(taskName).run();
    }
}

export default new BootstrapRegistry();