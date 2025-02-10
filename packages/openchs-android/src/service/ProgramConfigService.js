import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import _ from "lodash";
import {programConfig} from 'avni-health-modules';

@Service("programConfigService")
class ProgramConfigService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    init() {
    }

    configForProgram(program) {
        if (program && program.showGrowthChart) {
            return programConfig.config(program.name);
        }
        return false;
    }

    findDashboardButtons(program) {
        return _.get(this.configForProgram(program), ['programDashboardButtons']);
    }
}

export default ProgramConfigService;
