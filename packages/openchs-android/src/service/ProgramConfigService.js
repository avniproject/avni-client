import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import _ from "lodash";
import {programConfig} from "openchs-health-modules";

@Service("programConfigService")
class ProgramConfigService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    init() { }

    configForProgram(program) {
        return program && program.name && programConfig.config(program.name);
    }

    findDashboardButtons(program) {
        return _.get(this.configForProgram(program), ['programDashboardButtons']);
    }
}

export default ProgramConfigService;