import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import {Individual, EntityQueue, Program, ObservationsHolder} from "openchs-models";
import _ from 'lodash';
import ProgramEncounter from "../../../openchs-models/src/ProgramEncounter";

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

    withScheduledVisits(program, addressLevel, encounterType) {
        return this.db.objects(Individual.schema.name)
            .filtered('enrolments.program.uuid = $0 ' +
                'AND lowestAddressLevel.uuid = $1 ' +
                'AND enrolments.encounters.maxVisitDateTime >= $2 ' +
                'AND enrolments.encounters.earliestVisitDateTime <= $2 ' +
                'AND enrolments.encounters.encounterType.uuid = $3 ' +
                'AND enrolments.encounters.encounterDateTime = null',
                program.uuid,
                addressLevel.uuid,
                new Date(),
                encounterType.uuid)
            .map(_.identity);
    }

    totalScheduledVisits(program, addressLevel, encounterType) {
        return this.withScheduledVisits(program, addressLevel, encounterType).length;
    }

    overdueVisits(program, addressLevel, encounterType) {
        return this.db.objects(Individual.schema.name)
            .filtered('enrolments.program.uuid = $0 ' +
                'AND lowestAddressLevel.uuid = $1 ' +
                'AND enrolments.encounters.maxVisitDateTime <= $2 ' +
                'AND enrolments.encounters.encounterType.uuid = $3 ' +
                'AND enrolments.encounters.encounterDateTime = null',
                program.uuid,
                addressLevel.uuid,
                new Date(),
                encounterType.uuid)
            .map(_.identity);
    }

    totalOverdueVisits(program, addressLevel, encounterType) {
        return this.overdueVisits(program, addressLevel, encounterType).length;
    }

    completedVisits(program, addressLevel, encounterType, tillDate = new Date()) {
        let groupBy = _.groupBy(this.db.objects(ProgramEncounter.schema.name)
            .filtered('programEnrolment.program.uuid = $0 ' +
                'AND programEnrolment.individual.lowestAddressLevel.uuid = $1 ' +
                'AND encounterDateTime < $2 ' +
                'AND encounterType.uuid = $3 ',
                program.uuid,
                addressLevel.uuid,
                tillDate,
                encounterType.uuid), (obj) => obj.programEnrolment.individual.uuid);
        console.log("GROUP BY", groupBy);
        return groupBy;

    }

    totalCompletedVisits(program, addressLevel, encounterType, tillDate) {
        let completedVisits2 = this.completedVisits(program, addressLevel, encounterType, tillDate);
        if (program.name == 'Mother' && addressLevel.name == "Ghotpadi Village") {
            console.log(encounterType.name);
            console.log(completedVisits2);
        }
        return completedVisits2.length;
    }

    totalHighRisk() {
        return 4;
    }
}

export default IndividualService;