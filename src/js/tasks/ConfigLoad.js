import Task from './Task';
import Bootstrap from '../framework/bootstrap/Bootstrap';

@Bootstrap("configLoad")
class ConfigLoad extends Task {
    constructor(getBean) {
        super(getBean);
        this.run = this.run.bind(this);
    }

    run() {
        this.getBean("configService").getAllFilesAndSave();
    }
}

export default ConfigLoad;