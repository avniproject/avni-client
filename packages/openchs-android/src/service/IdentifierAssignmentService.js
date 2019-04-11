import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import {IdentifierAssignment, Concept, EntityQueue, FormElement, ObservationsHolder} from 'openchs-models';
import _ from "lodash";

@Service("identifierAssignmentService")
class IdentifierAssignmentService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return IdentifierAssignment.schema.name;
    }

    getNextIdentifier(identifierSourceUUID) {
        let filter = `voided = false AND identifierSource.uuid = ${identifierSourceUUID} AND individual = null and programEnrolment = null`;
        return this.findAll()
            .filtered(filter)
            .sorted("assignmentOrder", false)[0];
    }

    populateIdentifiers(form, observationHolder) {
        _.each(form.getFormElementsOfType(Concept.dataType.Id), (formElement) => {
            if (!observationHolder.findObservation(formElement.concept)) {
                observationHolder.addOrUpdateObservation(formElement.concept,
                    this.getNextIdentifier(formElement.recordByKey(FormElement.keys.IdSourceUUID).value).identifier);
            }
        });
        return observationHolder;
    }

    /**
     * It is possible that a rule could modify the original id created. We assume here that only one id of a specific
     * id source type can be created per form.
     *
     * Therefore, we pick the next identifier and assign the individual/program enrolment to it, assuming it was the same
     * id that was given to the form when we started filling it.
     *
     * @param form
     * @param observations
     * @param individual
     * @param programEnrolment
     */
    assignPopulatedIdentifiersFromObservations(form, observations, individual, programEnrolment) {
        const db = this.db;
        const identifiersToBeSaved = [];
        const entityQueueItems = [];
        const observationsHolder = new ObservationsHolder(observations);

        _.each(form.getFormElementsOfType(Concept.dataType.Id), (formElement) => {
            if (observationsHolder.findObservation(formElement.concept)) {
                const identifier = this.getNextIdentifier(formElement.recordByKey(FormElement.keys.IdSourceUUID).value);
                identifier.individual = individual;
                identifier.programEnrolment = programEnrolment;
                identifiersToBeSaved.push(identifier);
                entityQueueItems.push(EntityQueue.create(identifier, IdentifierAssignment.schema.name));
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