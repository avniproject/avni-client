import Stroke from '../framework/stroke.js';
import BaseService from './BaseService.js';
import Service from '../framework/Service.js';

@Service("diseaseService")
class DiseaseService extends BaseService {
    constructor(db) {
        super(db);
        this.diseases = new Map();
        this.diseases.set("stroke", Stroke);
    }

    getFlow(diseaseName) {
        return this.diseases.get(diseaseName);
    }
}

export default DiseaseService;