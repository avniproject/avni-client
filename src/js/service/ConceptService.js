import BaseService from './BaseService.js'
import Service from '../framework/Service.js';
import Concepts from '../models/Concepts.js';

import ConceptsData from '../../config/concepts.json';

@Service("conceptService")
class ConceptService extends BaseService {
    getConcepts() {
      return new Concepts(ConceptsData);
    }
}

export default ConceptService;