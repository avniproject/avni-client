import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import _ from "lodash";
import {ProgramConfig} from 'openchs-models';
import {programConfig} from 'openchs-health-modules';

@Service("programConfigService")
class ProgramConfigService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    init() {
    }

    configForProgram(program) {
        return program && program.name && programConfig.config(program.name);
    }

    findDashboardButtons(program) {
        return _.get(this.configForProgram(program), ['programDashboardButtons']);
    }

    atRiskConcepts() {
        const programConfigs = _.defaultTo(this.findAll(ProgramConfig.schema.name), []);
        return programConfigs
            .reduce((acc, pc) => acc.concat(pc.atRiskConcepts.map(_.identity)), []);
    }
}

export default ProgramConfigService;