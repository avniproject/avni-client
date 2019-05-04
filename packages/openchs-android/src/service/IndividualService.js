import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import {EntityQueue, ObservationsHolder, Program, Concept, ProgramEncounter, ProgramEnrolment} from "openchs-models";
import _ from 'lodash';
import moment from 'moment';
import Individual from "openchs-models/src/Individual";
import MediaQueueService from "./MediaQueueService";
import IdentifierAssignmentService from "./IdentifierAssignmentService";
import FormMappingService from "./FormMappingService";

@Service("individualService")
class IndividualService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this.allHighRiskPatients = this.allHighRiskPatients.bind(this);
        this.allCompletedVisitsIn = this.allCompletedVisitsIn.bind(this);
        this.allScheduledVisitsIn = this.allScheduledVisitsIn.bind(this);
        this.allOverdueVisitsIn = this.allOverdueVisitsIn.bind(this);
        this.allIn = this.allIn.bind(this);
    }

    getSchema() {
        return Individual.schema.name;
    }

    search(criteria) {
        const filterCriteria = criteria.getFilterCriteria();
        let searchResults;
        if (_.isEmpty(filterCriteria)) {
            searchResults = this.db.objects(Individual.schema.name);
        } else {
            searchResults = this.db
                .objects(Individual.schema.name)
                .filtered(
                    filterCriteria,
                    criteria.getMinDateOfBirth(),
                    criteria.getMaxDateOfBirth()
                );
        }
        return {results: searchResults.slice(0, 50), count: searchResults.length};
    }

    register(individual) {
        const db = this.db;
        ObservationsHolder.convertObsForSave(individual.observations);
        const registrationForm = this.getService(FormMappingService).findRegistrationForm();
        this.db.write(() => {
            db.create(Individual.schema.name, individual, true);
            db.create(EntityQueue.schema.name, EntityQueue.create(individual, Individual.schema.name));
            this.getService(MediaQueueService).addMediaToQueue(individual, Individual.schema.name);
            this.getService(IdentifierAssignmentService).assignPopulatedIdentifiersFromObservations(registrationForm, individual.observations, individual);
        });
    }

    eligiblePrograms(individualUUID) {
        const programs = this.getAll(Program.schema.name);
        const individual = this.findByUUID(individualUUID);
        return individual.eligiblePrograms(programs);
    }

    _uniqIndividualsFrom(individuals, individual) {
        individuals.has(individual.uuid) || individuals.set(individual.uuid, individual);
        return individuals;
    }

    allIn(ignored, ignored2, addressLevelQuery) {
        return [...this.db.objects(Individual.schema.name)
            .filtered('voided = false ' +
                (_.isNil(addressLevelQuery) ? '' : `AND ( ${addressLevelQuery} )`))
            .reduce(this._uniqIndividualsFrom, new Map())
            .values()]
            .map(_.identity);
    }

    allScheduledVisitsIn(date, queryAdditions, addressLevelQuery) {
        const dateMidnight = moment(date).endOf('day').toDate();
        const dateMorning = moment(date).startOf('day').toDate();
        return [...this.db.objects(ProgramEncounter.schema.name)
            .filtered('earliestVisitDateTime <= $0 ' +
                'AND maxVisitDateTime >= $1 ' +
                'AND encounterDateTime = null ' +
                'AND cancelDateTime = null ' +
                'AND programEnrolment.programExitDateTime = null ' +
                (_.isNil(addressLevelQuery) ? '' : `AND ( ${addressLevelQuery} )`),
                dateMidnight,
                dateMorning)
            .filtered((_.isEmpty(queryAdditions) ? 'uuid != null' : `${queryAdditions}`))
            .map((enc) => {
                const individual = enc.programEnrolment.individual;
                return individual;
            })
            .reduce(this._uniqIndividualsFrom, new Map())
            .values()]
            .map(_.identity);
    }

    allScheduledVisitsCount() {
        return this.allScheduledVisitsIn().length;
    }

    withScheduledVisits(program, addressLevel, encounterType) {
        const todayMidnight = moment(new Date()).endOf('day').toDate();
        const todayMorning = moment(new Date()).startOf('day').toDate();
        const encounters = this.db.objects(ProgramEncounter.schema.name)
            .filtered('programEnrolment.program.uuid = $0 ' +
                'AND programEnrolment.individual.lowestAddressLevel.uuid = $1 ' +
                'AND earliestVisitDateTime <= $2 ' +
                'AND maxVisitDateTime >= $3 ' +
                'AND encounterDateTime = null ' +
                'AND cancelDateTime = null ' +
                'AND encounterType.uuid = $4 ',
                program.uuid,
                addressLevel.uuid,
                todayMidnight,
                todayMorning,
                encounterType.uuid)
            .map(_.identity);
        return this._uniqIndividualsFrom(encounters);
    }

    totalScheduledVisits(program, addressLevel, encounterType) {
        return this.withScheduledVisits(program, addressLevel, encounterType).length;
    }

    allOverdueVisitsIn(date, queryAdditions, addressLevelQuery) {
        const dateMorning = moment(date).startOf('day').toDate();
        return [...this.db.objects(ProgramEncounter.schema.name)
            .filtered('maxVisitDateTime < $0 ' +
                'AND cancelDateTime = null ' +
                'AND encounterDateTime = null ' +
                'AND programEnrolment.programExitDateTime = null ' +
                (_.isNil(addressLevelQuery) ? '' : `AND ( ${addressLevelQuery} )`),
                dateMorning)
            .filtered((_.isEmpty(queryAdditions) ? 'uuid != null' : `${queryAdditions}`))
            .map((enc) => {
                const individual = enc.programEnrolment.individual;
                return individual;
            })
            .reduce(this._uniqIndividualsFrom, new Map())
            .values()]
            .map(_.identity);
    }

    overdueVisits(program, addressLevel, encounterType) {
        const todayMorning = moment(new Date()).startOf('day').toDate();
        const encounters = this.db.objects(ProgramEncounter.schema.name)
            .filtered('programEnrolment.program.uuid = $0 ' +
                'AND programEnrolment.individual.lowestAddressLevel.uuid = $1 ' +
                'AND maxVisitDateTime < $2 ' +
                'AND cancelDateTime = null ' +
                'AND encounterDateTime = null ' +
                'AND encounterType.uuid = $3 ',
                program.uuid,
                addressLevel.uuid,
                todayMorning,
                encounterType.uuid)
            .map(_.identity);
        return this._uniqIndividualsFrom(encounters);
    }

    totalOverdueVisits(program, addressLevel, encounterType) {
        return this.overdueVisits(program, addressLevel, encounterType).length;
    }

    allCompletedVisitsIn(date, queryAdditions, addressLevelQuery) {
        let fromDate = moment(date).startOf('day').toDate();
        let tillDate = moment(date).endOf('day').toDate();
        return [...this.db.objects(ProgramEncounter.schema.name)
            .filtered('encounterDateTime <= $0 ' +
                'AND encounterDateTime >= $1 ' +
                (_.isNil(addressLevelQuery) ? '' : `AND ( ${addressLevelQuery} )`),
                tillDate,
                fromDate)
            .filtered((_.isEmpty(queryAdditions) ? 'uuid != null' : `${queryAdditions}`))
            .map((enc) => {
                const individual = enc.programEnrolment.individual;
                return individual;
            })
            .reduce(this._uniqIndividualsFrom, new Map())
            .values()]
            .map(_.identity);
    }

    completedVisits(program, addressLevel, encounterType, fromDate = new Date(), tillDate = new Date()) {
        fromDate = moment(fromDate).startOf('day').toDate();
        tillDate = moment(tillDate).endOf('day').toDate();
        const encounters = this.db.objects(ProgramEncounter.schema.name)
            .filtered('programEnrolment.program.uuid = $0 ' +
                'AND programEnrolment.individual.lowestAddressLevel.uuid = $1 ' +
                'AND encounterDateTime <= $2 ' +
                'AND encounterDateTime >= $3 ' +
                'AND encounterType.uuid = $4 ',
                program.uuid,
                addressLevel.uuid,
                tillDate,
                fromDate,
                encounterType.uuid).map(_.identity);
        return this._uniqIndividualsFrom(encounters);
    }

    totalCompletedVisits(program, addressLevel, encounterType, fromDate, tillDate) {
        return this.completedVisits(program, addressLevel, encounterType, tillDate).length;
    }

    allHighRiskPatients(addressLevel) {
        const HIGH_RISK_CONCEPTS = ["High Risk Conditions", "Adolescent Vulnerabilities"];
        let allEnrolments = this.db.objects(ProgramEnrolment.schema.name);
        if (!_.isNil(addressLevel))
            allEnrolments = allEnrolments.filtered('individual.lowestAddressLevel.uuid = $0', addressLevel.uuid);
        return allEnrolments.filter((enrolment) => HIGH_RISK_CONCEPTS
            .some((concept) => !_.isEmpty(enrolment.findObservation(concept))))
            .map((enrolment) => {
                return {...enrolment.individual, addressUUID: enrolment.individual.lowestAddressLevel.uuid};
            });
    }

    allHighRiskPatientCount() {
        return this.allHighRiskPatients().length;
    }

    highRiskPatients(program, addressLevel) {
        const HIGH_RISK_CONCEPTS = ["High Risk Conditions", "Adolescent Vulnerabilities"];
        let allEnrolments = this.db.objects(ProgramEnrolment.schema.name)
            .filtered("program.uuid = $0 " +
                "AND individual.lowestAddressLevel.uuid = $1 ",
                program.uuid,
                addressLevel.uuid);
        return allEnrolments.filter((enrolment) => HIGH_RISK_CONCEPTS
            .some((concept) => !_.isEmpty(enrolment.findObservationInEntireEnrolment(concept))))
            .map((enrolment) => enrolment.individual);
    }

    atRiskFilter(atRiskConcepts) {
        return (individuals) => individuals.filter((individual) =>
            individual.nonVoidedEnrolments().some((enrolment) => atRiskConcepts.length === 0 || atRiskConcepts
                .some(concept => enrolment.observationExistsInEntireEnrolment(concept.name))));
    }

    notAtRiskFilter(atRiskConcepts) {
        return (individuals) => individuals.filter((individual) =>
            !individual.nonVoidedEnrolments().some((enrolment) => atRiskConcepts.length === 0 || atRiskConcepts
                .some(concept => enrolment.observationExistsInEntireEnrolment(concept.name))));
    }

    totalHighRisk(program, addressLevel) {
        return this.highRiskPatients(program, addressLevel).length;
    }


    voidIndividual(individualUUID) {
        const individual = this.findByUUID(individualUUID);
        let individualClone = individual.cloneForEdit();
        individualClone.voided = true;
        this.register(individualClone);
    }
}

export default IndividualService;
