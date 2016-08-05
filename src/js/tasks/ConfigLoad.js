import Task from './Task';
import Bootstrap from '../framework/bootstrap/Bootstrap';
import ConfigService from '../service/ConfigService';

@Bootstrap("configLoad")
class ConfigLoad extends Task {
    constructor(getBean) {
        super(getBean);
        this.run = this.run.bind(this);
    }

    run() {
        this.getBean(ConfigService).getAllFilesAndSave();
    }
}

export default ConfigLoad;