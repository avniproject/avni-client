import _ from 'lodash';
import Concept from './Concept';

const findMediaObservations = (...observations) => _.filter(_.flatten(observations),
    (observation) => Concept.dataType.Media.includes(observation.concept.datatype));


export {
    findMediaObservations,
}
