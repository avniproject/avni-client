import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import {get} from '../framework/http/requests';


@Service("configService")
class ConfigService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.getAllFilesAndSave = this.getAllFilesAndSave.bind(this);
        this.getFileFrom = this.getFileFrom.bind(this);
    }

    init(beans) {
        this.typeMapping = new Map([["questionnaires", beans.get("questionnaireService").saveQuestionnaire],
            ["concepts", (concepts) => concepts.map(beans.get("conceptService").saveConcept)], ["decisionConfig", beans.get("decisionConfigService").saveDecisionConfig]]);
    }

    getFileFrom(configURL) {
        return {
            of: (type) => ((fileName) => get(`${configURL}/${fileName}`, (response) =>
                this.typeMapping.get(type)(response, fileName)))
        };
    }

    getAllFilesAndSave() {
        const configURL = `${this.getService("settingsService").getServerURL()}/fs/config`;
        get(`${configURL}/filelist.json`, (response) => {
            _.map(response, (fileNames, type) => fileNames.map(this.getFileFrom(configURL).of(type).bind(this)));
        });
    }
}

export default ConfigService;