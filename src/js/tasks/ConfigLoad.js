import Task from './Task';
import Bootstrap from '../framework/bootstrap/Bootstrap';
import {get} from '../framework/http/requests';

@Bootstrap("configLoad")
class ConfigLoad extends Task {
    constructor(settingService) {
        super(settingService);
        this.FILELIST = "filelist.json";
    }

    run() {
        get(`${this.settingService.getServerURL()}/${this.FILELIST}`, (response) => console.log(response));
    }
}

export default ConfigLoad;