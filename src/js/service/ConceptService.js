import BaseService from './BaseService.js'
import Service from '../framework/Service.js';
import Concepts from '../models/Concepts.js';

import ConceptsData from '../../config/concepts.json';

import 'isomorphic-fetch';

@Service("conceptService")
class ConceptService extends BaseService {
    getConcepts() {
        return new Concepts(ConceptsData);

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
        //     console.log(conceptData);
        // });
    }
}

export default ConceptService;