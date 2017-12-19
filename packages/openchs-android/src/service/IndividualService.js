import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import {Individual, EntityQueue, Program, ObservationsHolder} from "openchs-models";
import _ from 'lodash';
import ProgramEncounter from "../../../openchs-models/src/ProgramEncounter";
import moment from 'moment';
import ProgramEnrolment from "../../../openchs-models/src/ProgramEnrolment";

@Service("individualService")
class IndividualService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return Individual.schema.name;
    }

    search(criteria) {
        const filterCriteria = criteria.getFilterCriteria();
        return _.isEmpty(filterCriteria) ? this.db.objects(Individual.schema.name).slice(0, 100) :
            this.db.objects(Individual.schema.name)
                .filtered(filterCriteria,
                    criteria.getMinDateOfBirth(),
                    criteria.getMaxDateOfBirth()).slice(0, 100);
    }

    register(individual) {
        const db = this.db;
        ObservationsHolder.convertObsForSave(individual.observations);
        this.db.write(() => {
            db.create(Individual.schema.name, individual, true);
            db.create(EntityQueue.schema.name, EntityQueue.create(individual, Individual.schema.name));
        });
    }

    eligiblePrograms(individualUUID) {
        const programs = this.getAll(Program.schema.name);
        const individual = this.findByUUID(individualUUID);
        return individual.eligiblePrograms(programs);
    }

    _uniqIndividualsFrom(encounters) {
        const encountersPerIndividual = _.groupBy(encounters, (encounter) => encounter.programEnrolment.individual.uuid);
        return _.values(encountersPerIndividual)
            .map(_.first)
            .filter((encounter) => !_.isEmpty(encounter))
            .map((encounter) => encounter.programEnrolment.individual);
    }

    allScheduledVisitsIn(addressLevel) {
        const todayMorning = moment(new Date()).startOf('day').toDate();
        const encounters = this.db.objects(ProgramEncounter.schema.name)
            .filtered('programEnrolment.individual.lowestAddressLevel.uuid = $0 ' +
                'AND earliestVisitDateTime <= $1 ' +
                'AND maxVisitDateTime >= $1 ' +
                'AND encounterDateTime = null ',
                addressLevel.uuid,
                todayMorning)
            .map(_.identity);
        return this._uniqIndividualsFrom(encounters);
    }

    allScheduledVisitsCount(addressLevel) {
        return this.allScheduledVisitsIn(addressLevel).length;
    }

    withScheduledVisits(program, addressLevel, encounterType) {
        const todayMorning = moment(new Date()).startOf('day').toDate();
        const encounters = this.db.objects(ProgramEncounter.schema.name)
            .filtered('programEnrolment.program.uuid = $0 ' +
                'AND programEnrolment.individual.lowestAddressLevel.uuid = $1 ' +
                'AND earliestVisitDateTime <= $2 ' +
                'AND maxVisitDateTime >= $2 ' +
                'AND encounterDateTime = null ' +
                'AND encounterType.uuid = $3 ',
                program.uuid,
                addressLevel.uuid,
                todayMorning,
                encounterType.uuid)
            .map(_.identity);
        return this._uniqIndividualsFrom(encounters);
    }

    totalScheduledVisits(program, addressLevel, encounterType) {
        return this.withScheduledVisits(program, addressLevel, encounterType).length;
    }

    allOverdueVisits(addressLevel) {
        const todayMorning = moment(new Date()).startOf('day').toDate();
        const encounters = this.db.objects(ProgramEncounter.schema.name)
            .filtered('programEnrolment.individual.lowestAddressLevel.uuid = $0 ' +
                'AND maxVisitDateTime < $1 ' +
                'AND encounterDateTime = null ',
                addressLevel.uuid,
                todayMorning)
            .map(_.identity);
        return this._uniqIndividualsFrom(encounters);
    }

    allOverdueVisitsCount(addressLevel) {
        return this.allOverdueVisits(addressLevel).length;
    }

    overdueVisits(program, addressLevel, encounterType) {
        const todayMorning = moment(new Date()).startOf('day').toDate();
        const encounters = this.db.objects(ProgramEncounter.schema.name)
            .filtered('programEnrolment.program.uuid = $0 ' +
                'AND programEnrolment.individual.lowestAddressLevel.uuid = $1 ' +
                'AND maxVisitDateTime < $2 ' +
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

    allCompletedVisitsIn(addressLevel, fromDate = new Date(), tillDate = new Date()) {
        fromDate = moment(fromDate).startOf('day').toDate();
        tillDate = moment(tillDate).endOf('day').toDate();
        const encounters = this.db.objects(ProgramEncounter.schema.name)
            .filtered('programEnrolment.individual.lowestAddressLevel.uuid = $0 ' +
                'AND encounterDateTime <= $1 ' +
                'AND encounterDateTime >= $2 ',
                addressLevel.uuid,
                tillDate,
                fromDate).map(_.identity);
        return this._uniqIndividualsFrom(encounters);
    }

    allCompletedVisitsCount(addressLevel, fromDate = new Date(), tillDate = new Date()) {
        return this.allCompletedVisitsIn(addressLevel, fromDate, tillDate).length;
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
        const HIGH_RISK_CONCEPTS = ["High Risk Conditions"];
        let allEnrolments = this.db.objects(ProgramEnrolment.schema.name)
            .filtered("individual.lowestAddressLevel.uuid = $0 ",
                addressLevel.uuid);
        return allEnrolments.filter((enrolment) => HIGH_RISK_CONCEPTS
            .some((concept) => !_.isEmpty(enrolment.findObservationInEntireEnrolment(concept))))
            .map((enrolment) => enrolment.individual);
    }

    allHighRiskPatientCount(addressLevel) {
        return this.allHighRiskPatients(addressLevel).length;
    }

    highRiskPatients(program, addressLevel) {
        const HIGH_RISK_CONCEPTS = ["High Risk Conditions"];
        let allEnrolments = this.db.objects(ProgramEnrolment.schema.name)
            .filtered("program.uuid = $0 " +
                "AND individual.lowestAddressLevel.uuid = $1 ",
                program.uuid,
                addressLevel.uuid);
        return allEnrolments.filter((enrolment) => HIGH_RISK_CONCEPTS
            .some((concept) => !_.isEmpty(enrolment.findObservationInEntireEnrolment(concept))))
            .map((enrolment) => enrolment.individual);
    }

    totalHighRisk(program, addressLevel) {
        return this.highRiskPatients(program, addressLevel).length;
    }
}

export default IndividualService;