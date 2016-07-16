import Registry from '../Registry';

class BootstrapRegistry extends Registry {
    constructor() {
        super();
        this.runAllTasks = this.runAllTasks.bind(this);
    }

    runAllTasks(getBean) {
        Array.from(this.entities).map(([taskName, task]) => new task(getBean).run())
    }

}

export default new BootstrapRegistry();