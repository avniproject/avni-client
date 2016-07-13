import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import Concepts from '../models/Concepts.js';
import ConceptData from './ConceptData';

@Service("conceptService")
class ConceptService extends BaseService {
    getConcepts() {
        return new Concepts(ConceptData.concepts);
    }

    // import 'isomorphic-fetch';
    // var conceptData;
    // fetch('http://0.0.0.0/files/concepts.json', {
    //     method: 'GET',
    //     headers: {
    //         'Accept': 'application/json',
    //         'Content-Type': 'application/json'
    //     }
    // }).then(function (response) {
    //     return response.json();
    // }).then(function (json) {
    //     new Concepts(json);
    // });
}

export default ConceptService;