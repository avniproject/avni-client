import BaseService from './BaseService.js'
import Service from '../framework/Service.js';
import Concepts from '../../config/concepts.json';

@Service("conceptService")
class ConceptService extends BaseService {
    getConcepts() {
      return Concepts;
    }
}

export default ConceptService;