import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import General from "../utility/General";
import _ from 'lodash';
import AddressLevel from "../../../openchs-models/src/AddressLevel";
import Program from "../../../openchs-models/src/Program";
import ProgramEncounter from "../../../openchs-models/src/ProgramEncounter";
import Gender from "../../../openchs-models/src/Gender";
import EncounterType from "../../../openchs-models/src/EncounterType";
import Individual from "../../../openchs-models/src/Individual";
import ProgramEnrolment from "../../../openchs-models/src/ProgramEnrolment";
import faker from 'faker';
import moment from 'moment';

@Service("fakeDataService")
class FakeDataService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    init() {
    }

    createFakeScheduledEncountersFor(numberOfIndividuals) {
        let gender = this.db.objects(Gender.schema.name).slice(0, 1)[0];
        let address = this.db.objects(AddressLevel.schema.name).slice(1, 2)[0];
        let program = this.db.objects(Program.schema.name).filtered("name = $0", "Mother").slice(0, 1)[0];
        let encounterType = this.db.objects(EncounterType.schema.name).filtered("name = $0", "ANC").slice(0, 1)[0];
        faker.seed(123);
        _.range(0, numberOfIndividuals).map((i) => {
            General.logDebug("Starting -- ", i);
            const individual = Individual.newInstance(General.randomUUID(),
                faker.name.findName(), faker.name.findName(), new Date(), true, gender, address);
            individual.registrationDate = new Date();
            const enrolment = ProgramEnrolment.createEmptyInstance();
            enrolment.individual = individual;
            enrolment.program = program;
            let scheduledProgramEncounter = ProgramEncounter.createScheduledProgramEncounter(encounterType, enrolment);
            scheduledProgramEncounter.earliestVisitDateTime = moment(new Date()).subtract(2, 'days').toDate();
            scheduledProgramEncounter.maxVisitDateTime = moment(new Date()).add(2, 'days').toDate();
            this.saveOrUpdate(individual, Individual.schema.name);
            this.saveOrUpdate(enrolment, ProgramEnrolment.schema.name);
            this.saveOrUpdate(scheduledProgramEncounter, ProgramEncounter.schema.name);
            General.logDebug("Finishing -- ", i);
        });
    }

    createFakeOverdueEncountersFor(numberOfIndividuals) {
        let gender = this.db.objects(Gender.schema.name).slice(0, 1)[0];
        let address = this.db.objects(AddressLevel.schema.name).slice(1, 2)[0];
        let program = this.db.objects(Program.schema.name).filtered("name = $0", "Mother").slice(0, 1)[0];
        let encounterType = this.db.objects(EncounterType.schema.name).filtered("name = $0", "ANC").slice(0, 1)[0];
        faker.seed(123);
        _.range(0, numberOfIndividuals).map((i) => {
            General.logDebug("Starting -- ", i);
            const individual = Individual.newInstance(General.randomUUID(),
                faker.name.findName(), faker.name.findName(), new Date(), true, gender, address);
            individual.registrationDate = new Date();
            const enrolment = ProgramEnrolment.createEmptyInstance();
            enrolment.individual = individual;
            enrolment.program = program;
            let overdueEncounter = ProgramEncounter.createScheduledProgramEncounter(encounterType, enrolment);
            overdueEncounter.earliestVisitDateTime = moment(new Date()).subtract(2, 'days').toDate();
            overdueEncounter.maxVisitDateTime = moment(new Date()).subtract(1, 'days').toDate();
            this.saveOrUpdate(individual, Individual.schema.name);
            this.saveOrUpdate(enrolment, ProgramEnrolment.schema.name);
            this.saveOrUpdate(overdueEncounter, ProgramEncounter.schema.name);
            General.logDebug("Finishing -- ", i);
        });
    }

    createFakeCompletedEncountersFor(numberOfIndividuals) {
        let gender = this.db.objects(Gender.schema.name).slice(0, 1)[0];
        let address = this.db.objects(AddressLevel.schema.name).slice(1, 2)[0];
        let program = this.db.objects(Program.schema.name).filtered("name = $0", "Mother").slice(0, 1)[0];
        let encounterType = this.db.objects(EncounterType.schema.name).filtered("name = $0", "ANC").slice(0, 1)[0];
        faker.seed(123);
        _.range(0, numberOfIndividuals).map((i) => {
            General.logDebug("Starting -- ", i);
            const individual = Individual.newInstance(General.randomUUID(),
                faker.name.findName(), faker.name.findName(), new Date(), true, gender, address);
            individual.registrationDate = new Date();
            const enrolment = ProgramEnrolment.createEmptyInstance();
            enrolment.individual = individual;
            enrolment.program = program;
            let completedEncounter = ProgramEncounter.createScheduledProgramEncounter(encounterType, enrolment);
            completedEncounter.earliestVisitDateTime = moment(new Date()).subtract(2, 'days').toDate();
            completedEncounter.maxVisitDateTime = moment(new Date()).subtract(1, 'days').toDate();
            completedEncounter.encounterDateTime = new Date();
            this.saveOrUpdate(individual, Individual.schema.name);
            this.saveOrUpdate(enrolment, ProgramEnrolment.schema.name);
            this.saveOrUpdate(completedEncounter, ProgramEncounter.schema.name);
            General.logDebug("Finishing -- ", i);
        });
    }
}

export default FakeDataService;