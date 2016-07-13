import Registry from '../Registry';

class BootstrapRegistry extends Registry {
    constructor() {
        super();
        this.runAllTasks = this.runAllTasks.bind(this);
    }

    runAllTasks(settingsService) {
        Array.from(this.entities).map(([taskName, task]) => new task(settingsService).run())
    }

}

export default new BootstrapRegistry();