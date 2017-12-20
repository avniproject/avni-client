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
            General.logDebug("Starting scheduled -- ", i);
            try {
                let name = faker.name.findName().split(" ");
                const individual = Individual.newInstance(General.randomUUID(),
                    name[0], name[1], new Date(), true, gender, address);
                individual.registrationDate = new Date();
                const enrolment = ProgramEnrolment.createEmptyInstance();
                enrolment.individual = individual;
                enrolment.program = program;
                let programEncounter = ProgramEncounter.createScheduledProgramEncounter(encounterType, enrolment);
                programEncounter.earliestVisitDateTime = moment(new Date()).subtract(2, 'days').toDate();
                programEncounter.maxVisitDateTime = moment(new Date()).add(2, 'days').toDate();
                programEncounter.programEnrolment = enrolment;
                let savedIndividual = this.saveOrUpdate(individual, Individual.schema.name);
                let savedEnrolment = this.saveOrUpdate(enrolment, ProgramEnrolment.schema.name);
                let savedPE = this.saveOrUpdate(programEncounter, ProgramEncounter.schema.name);
                this.saveOrUpdate({uuid: individual.uuid, enrolments: [enrolment]}, Individual.schema.name);
                this.saveOrUpdate({uuid: enrolment.uuid, encounters: [programEncounter]}, ProgramEnrolment.schema.name);
            } catch (e) {
                General.logDebugObject("Failed scheduled :(", e);
            }
            finally {
                General.logDebug("Finishing scheduled -- ", i);
            }
        });
    }

    createFakeOverdueEncountersFor(numberOfIndividuals) {
        let gender = this.db.objects(Gender.schema.name).slice(0, 1)[0];
        let address = this.db.objects(AddressLevel.schema.name).slice(1, 2)[0];
        let program = this.db.objects(Program.schema.name).filtered("name = $0", "Mother").slice(0, 1)[0];
        let encounterType = this.db.objects(EncounterType.schema.name).filtered("name = $0", "ANC").slice(0, 1)[0];
        faker.seed(123);
        _.range(0, numberOfIndividuals).map((i) => {
            General.logDebug("Starting Overdue -- ", i);
            try {
                let name = faker.name.findName().split(" ");
                const individual = Individual.newInstance(General.randomUUID(),
                    name[0], name[1], new Date(), true, gender, address);
                individual.registrationDate = new Date();
                const enrolment = ProgramEnrolment.createEmptyInstance();
                enrolment.individual = individual;
                enrolment.program = program;
                let programEncounter = ProgramEncounter.createScheduledProgramEncounter(encounterType, enrolment);
                programEncounter.earliestVisitDateTime = moment(new Date()).subtract(2, 'days').toDate();
                programEncounter.maxVisitDateTime = moment(new Date()).subtract(1, 'days').toDate();
                programEncounter.programEnrolment = enrolment;
                let savedIndividual = this.saveOrUpdate(individual, Individual.schema.name);
                let savedEnrolment = this.saveOrUpdate(enrolment, ProgramEnrolment.schema.name);
                let savedPE = this.saveOrUpdate(programEncounter, ProgramEncounter.schema.name);
                this.saveOrUpdate({uuid: individual.uuid, enrolments: [enrolment]}, Individual.schema.name);
                this.saveOrUpdate({uuid: enrolment.uuid, encounters: [programEncounter]}, ProgramEnrolment.schema.name);
            }
            catch (e) {
                General.logDebugObject("Failed overdue :(", e);
            }

            finally {
                General.logDebug("Finishing overdue -- ", i);
            }
        });
    }

    createFakeCompletedEncountersFor(numberOfIndividuals) {
        let gender = this.db.objects(Gender.schema.name).slice(0, 1)[0];
        let address = this.db.objects(AddressLevel.schema.name).slice(1, 2)[0];
        let program = this.db.objects(Program.schema.name).filtered("name = $0", "Mother").slice(0, 1)[0];
        let encounterType = this.db.objects(EncounterType.schema.name).filtered("name = $0", "ANC").slice(0, 1)[0];
        faker.seed(123);
        _.range(0, numberOfIndividuals).map((i) => {
            General.logDebug("Starting completed -- ", i);
            try {
                let name = faker.name.findName().split(" ");
                const individual = Individual.newInstance(General.randomUUID(),
                    name[0], name[1], new Date(), true, gender, address);
                individual.registrationDate = new Date();
                const enrolment = ProgramEnrolment.createEmptyInstance();
                enrolment.individual = individual;
                enrolment.program = program;
                let programEncounter = ProgramEncounter.createScheduledProgramEncounter(encounterType, enrolment);
                programEncounter.earliestVisitDateTime = moment(new Date()).subtract(2, 'days').toDate();
                programEncounter.maxVisitDateTime = moment(new Date()).subtract(1, 'days').toDate();
                programEncounter.encounterDateTime = new Date();
                programEncounter.programEnrolment = enrolment;
                let savedIndividual = this.saveOrUpdate(individual, Individual.schema.name);
                let savedEnrolment = this.saveOrUpdate(enrolment, ProgramEnrolment.schema.name);
                let savedPE = this.saveOrUpdate(programEncounter, ProgramEncounter.schema.name);
                this.saveOrUpdate({uuid: individual.uuid, enrolments: [enrolment]}, Individual.schema.name);
                this.saveOrUpdate({uuid: enrolment.uuid, encounters: [programEncounter]}, ProgramEnrolment.schema.name);
            } catch (e) {
                General.logDebugObject("Failed scheduled :(", e);
            } finally {
                General.logDebug("Finishing completed -- ", i);
            }
        });
    }
}

export default FakeDataService;