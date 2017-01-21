import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import DecisionConfig from '../models/DecisionConfig';


@Service("decisionConfigService")
class DecisionConfigService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    saveDecisionConfig(fileName, decisionCode) {
        const db = this.db;
        this.db.write(()=> db.create(DecisionConfig.schema.name, DecisionConfig.toDB(fileName, decisionCode), true));
    }

    getDecisionConfig(fileName) {
        return this.db.objectForPrimaryKey(DecisionConfig.schema.name, `${fileName.toLowerCase()}`);
    }
}

export default DecisionConfigService;