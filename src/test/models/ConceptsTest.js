import Concepts from '../../js/models/Concepts.js';
import ConceptsData from '../../config/concepts.json';

import { expect } from 'chai';

describe('Concepts', () => {
  it('Find Concept', () => {
    var concepts = new Concepts(ConceptsData);
    var conceptData = concepts.findByName("Numeric Question");
    expect(conceptData.locale).to.equal('en');
  });
});