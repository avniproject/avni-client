import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import {Individual, EntityQueue, Program, ObservationsHolder} from "openchs-models";
import _ from 'lodash';
import ProgramEncounter from "../../../openchs-models/src/ProgramEncounter";
import moment from 'moment';
import ProgramEnrolment from "../../../openchs-models/src/ProgramEnrolment";
import General from "../utility/General";

@Service("individualService")
class IndividualService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this.allHighRiskPatients = this.allHighRiskPatients.bind(this);
        this.allCompletedVisitsIn = this.allCompletedVisitsIn.bind(this);
        this.allScheduledVisitsIn = this.allScheduledVisitsIn.bind(this);
        this.allOverdueVisitsIn = this.allOverdueVisitsIn.bind(this);
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

    _uniqIndividualsFrom(individuals, individual) {
        individuals.has(individual.uuid) || individuals.set(individual.uuid, individual);
        return individuals;
    }

    allScheduledVisitsIn(addressLevel) {
        const todayMidnight = moment().endOf('day').toDate();
        const todayMorning = moment().startOf('day').toDate();
        return [...this.db.objects(ProgramEncounter.schema.name)
            .filtered('earliestVisitDateTime <= $0 ' +
                'AND maxVisitDateTime >= $1 ' +
                'AND encounterDateTime = null ' +
                'AND cancelDateTime = null ' +
                (_.isNil(addressLevel) ? '' : 'AND programEnrolment.individual.lowestAddressLevel.uuid = $2'),
                todayMidnight,
                todayMorning,
                (_.isNil(addressLevel) ? undefined : addressLevel.uuid))
            .map((enc) => {
                const individual = enc.programEnrolment.individual;
                return {uuid: individual.uuid, addressUUID: individual.lowestAddressLevel.uuid};
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

    allOverdueVisitsIn(addressLevel) {
        const todayMorning = moment().startOf('day').toDate();
        return [...this.db.objects(ProgramEncounter.schema.name)
            .filtered('maxVisitDateTime < $0 ' +
                'AND cancelDateTime = null ' +
                'AND encounterDateTime = null ' +
                (_.isNil(addressLevel) ? '' : 'AND programEnrolment.individual.lowestAddressLevel.uuid = $1'),
                todayMorning,
                (_.isNil(addressLevel) ? undefined : addressLevel.uuid))
            .map((enc) => {
                const individual = enc.programEnrolment.individual;
                return {uuid: individual.uuid, addressUUID: individual.lowestAddressLevel.uuid};
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

    allCompletedVisitsIn(addressLevel) {
        let fromDate = moment().startOf('day').toDate();
        let tillDate = moment().endOf('day').toDate();
        return [...this.db.objects(ProgramEncounter.schema.name)
            .filtered('encounterDateTime <= $0 ' +
                'AND encounterDateTime >= $1 ' +
                (_.isNil(addressLevel) ? '' : 'AND programEnrolment.individual.lowestAddressLevel.uuid = $2'),
                tillDate,
                fromDate,
                (_.isNil(addressLevel) ? undefined : addressLevel.uuid))
            .map((enc) => {
                const individual = enc.programEnrolment.individual;
                return {uuid: individual.uuid, addressUUID: individual.lowestAddressLevel.uuid};
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
                return {uuid: enrolment.individual.uuid, addressUUID: enrolment.individual.lowestAddressLevel.uuid};
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

    totalHighRisk(program, addressLevel) {
        return this.highRiskPatients(program, addressLevel).length;
    }

    voidIndividual(individualUUID) {
        console.log("IndividualService.voidIndividual", individualUUID);
        const individual = this.findByUUID(individualUUID);
        individualClone = individual.cloneForEdit()
        individualClone.voided = true;
        this.register(individualClone);
    }
}

export default IndividualService;