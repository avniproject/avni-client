import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import ConfigFileService from "./ConfigFileService";
import _ from "lodash";

@Service("programConfigService")
class ProgramConfigService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    init() {
        this.loaded = false;
        this.programConfigFile = this.getService(ConfigFileService).getProgramConfigFile();
    }

    loadProgramConfig() {
        if (!this.loaded) {
            const object = eval(`${this.programConfigFile.contents}`);
            this.programConfig = object.config;
            this.observationRules = object.observationRules;
        }
    }

    configForProgram(program) {
        this.loadProgramConfig();
        return program && program.name && this.programConfig(program.name);
    }

    observationRulesForProgram(program) {
        this.loadProgramConfig();
        return program && program.name && this.observationRules(program.name);
    }

    findDashboardButtons(program) {
        return _.get(this.configForProgram(program), ['programDashboardButtons']);
    }
}

export default ProgramConfigService;