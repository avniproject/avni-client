import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import ConfigFileService from "./ConfigFileService";
import _ from "lodash";

@Service("programConfigService")
class ProgramConfiguration extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    init() {
        this.programConfig = null;
        this.programConfigFile = this.getService(ConfigFileService).getProgramConfigFile();
    }

    configForProgram(program) {
        this.programConfig = this.programConfig || eval(`${this.programConfigFile.contents}`).config;
        return program && program.name && this.programConfig(program.name);
    }

    findDashboardButtons(program) {
        return _.get(this.configForProgram(program), ['programDashboardButtons']);
    }
}

export default ProgramConfiguration;