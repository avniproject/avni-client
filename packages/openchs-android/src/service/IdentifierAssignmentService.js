import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import {Concept, EntityQueue, FormElement, IdentifierAssignment, ObservationsHolder} from 'openchs-models';
import _ from "lodash";

@Service("identifierAssignmentService")
class IdentifierAssignmentService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return IdentifierAssignment.schema.name;
    }

    getFreeIdentifiers(identifierSourceUUID) {
        return this.findAll()
            .filtered('voided = false AND individual = null AND programEnrolment = null')
            .filtered('identifierSource.uuid = $0', identifierSourceUUID)
            .sorted("assignmentOrder", false);
    }

    getNextIdentifierAssignment(identifierSourceUUID) {
        return this.getFreeIdentifiers(identifierSourceUUID)[0];
    }

    getNextIdentifier(identifierSourceUUID) {
        return _.get(this.getNextIdentifierAssignment(identifierSourceUUID), 'identifier');
    }

    haveEnoughIdentifiers(form) {
        if (_.isNil(form)) return true;
        const formElements = form.getFormElementsOfType(Concept.dataType.Id);
        const idSources = _.uniq(_.map(formElements, (fe)=> fe.recordValueByKey(FormElement.keys.IdSourceUUID)));
        const totalFreeIds = _.sum(_.map(idSources, (idSource)=> this.getFreeIdentifiers(idSource).length));
        return totalFreeIds >= _.size(formElements);
    }

    populateIdentifiers(form, observationHolder) {
        if (_.isNil(form)) return observationHolder;
        _.filter(form.getFormElementsOfType(Concept.dataType.Id), fe => _.isNil(observationHolder.findObservation(fe.concept)))
            .forEach(fe => {
                const nextIdentifier = this.getNextIdentifier(fe.recordValueByKey(FormElement.keys.IdSourceUUID));
                observationHolder.addOrUpdateObservation(fe.concept, nextIdentifier);
            });
        return observationHolder;
    }

    getIdentifierByIdAndSource(id, identifierSource) {
        return this.getAll()
            .filtered('identifier = $0', id)
            .filtered('identifierSource.uuid = $0', identifierSource)[0];
    }

    assignPopulatedIdentifiersFromObservations(form, observations, individual, programEnrolment) {
        const db = this.db;
        const identifiersToBeSaved = [];
        const entityQueueItems = [];
        const observationsHolder = new ObservationsHolder(observations);

        _.each(form.getFormElementsOfType(Concept.dataType.Id), (formElement) => {
            let observation = observationsHolder.findObservation(formElement.concept);
            if (observation) {
                const id = observation.getValue();
                const identifierSource = formElement.recordValueByKey(FormElement.keys.IdSourceUUID);
                const identifierAssignment = this.getIdentifierByIdAndSource(id, identifierSource);
                
                identifierAssignment.individual = individual;
                identifierAssignment.programEnrolment = programEnrolment;
                identifiersToBeSaved.push(identifierAssignment);
                entityQueueItems.push(EntityQueue.create(identifierAssignment, IdentifierAssignment.schema.name));
            }
        });

        _.each(identifiersToBeSaved, (identifier) => {
            db.create(IdentifierAssignment.schema.name, identifier, true);
        });

        _.each(entityQueueItems, (entityQueueItem) => {
            db.create(EntityQueue.schema.name, entityQueueItem, true)
        });
    }
}

export default IdentifierAssignmentService;