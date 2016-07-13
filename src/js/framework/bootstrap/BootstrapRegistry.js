import Registry from '../Registry';

class BootstrapRegistry extends Registry {
    constructor() {
        super();
        this.getTask = this.getEntity;
    }
}

export default new BootstrapRegistry();