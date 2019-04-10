import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import General from "../utility/General";
import _ from 'lodash';
import {  AddressLevel  } from 'openchs-models';
import {  Program  } from 'openchs-models';
import {  ProgramEncounter  } from 'openchs-models';
import {  Gender  } from 'openchs-models';
import {  EncounterType  } from 'openchs-models';
import {  Individual  } from 'openchs-models';
import {  ProgramEnrolment  } from 'openchs-models';
import faker from 'faker';
import moment from 'moment';
import {Observation} from 'openchs-models';
import {  Concept  } from 'openchs-models';

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
                General.logDebug("Failed scheduled :(", e);
            }
            finally {
                General.logDebug("Finishing scheduled -- ", i);
            }
        });
    }

    createFakeObs(numberofObs) {
        return _.range(0, numberofObs).map(i =>
            Observation.create(Concept.create(`Concept No. ${i}`, "Text"), faker.name.findName(), false))
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
                General.logDebug("Failed overdue :(", e);
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
                individual.observations = this.createFakeObs(15);
                const enrolment = ProgramEnrolment.createEmptyInstance();
                enrolment.observations = this.createFakeObs(20);
                enrolment.individual = individual;
                enrolment.program = program;
                let programEncounter = ProgramEncounter.createScheduledProgramEncounter(encounterType, enrolment);
                programEncounter.earliestVisitDateTime = moment(new Date()).subtract(2, 'days').toDate();
                programEncounter.maxVisitDateTime = moment(new Date()).subtract(1, 'days').toDate();
                programEncounter.encounterDateTime = new Date();
                programEncounter.programEnrolment = enrolment;
                programEncounter.observations = this.createFakeObs(40);
                let savedIndividual = this.saveOrUpdate(individual, Individual.schema.name);
                let savedEnrolment = this.saveOrUpdate(enrolment, ProgramEnrolment.schema.name);
                let savedPE = this.saveOrUpdate(programEncounter, ProgramEncounter.schema.name);
                this.saveOrUpdate({uuid: individual.uuid, enrolments: [enrolment]}, Individual.schema.name);
                this.saveOrUpdate({uuid: enrolment.uuid, encounters: [programEncounter]}, ProgramEnrolment.schema.name);
            } catch (e) {
                console.log(e);
                General.logDebug("Failed scheduled :(", e);
            } finally {
                General.logDebug("Finishing completed -- ", i);
            }
        });
    }

    fakeSearch(searchString) {
        let individuals = this.db.objects(Individual.schema.name)
            .filtered('firstName contains[c] $0 or lastName contains[c] $3 or observations.valueJSON contains[c] $1 or enrolments.observations.valueJSON contains[c] $2', searchString, searchString, searchString, searchString);
        return individuals;
    }


}

export default FakeDataService;