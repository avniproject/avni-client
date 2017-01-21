import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import DecisionConfig from '../models/DecisionConfig';


@Service("decisionConfigService")
class DecisionConfigService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    saveDecisionConfig(fileName, decisionCode) {
        console.log(`DecisionCode: ${decisionCode} and Filename: ${fileName}`);

        const db = this.db;
        this.db.write(()=> db.create(DecisionConfig.schema.name, DecisionConfig.toDB(fileName, decisionCode), true));
    }

    getDecisionConfig(questionnaireName) {
        return this.db.objectForPrimaryKey(DecisionConfig.schema.name, `${questionnaireName.toLowerCase()}`);
    }
}

export default DecisionConfigService;