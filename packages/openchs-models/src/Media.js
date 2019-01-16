import _ from 'lodash';
import Concept from './Concept';

const findMediaObservations = (...observations) => _.filter(_.flatten(observations),
    (observation) => observation.concept.datatype === Concept.dataType.Image);

export {
    findMediaObservations
}
