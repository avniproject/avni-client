import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {ProgramEnrolment, Individual, EntityQueue, ProgramEncounter,
ObservationsHolder, EncounterType, Checklist, ChecklistItem} from "openchs-models";
import _ from "lodash";
import ProgramEncounterService from "./program/ProgramEncounterService";
import General from "../utility/General";

@Service("ProgramEnrolmentService")
class ProgramEnrolmentService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return ProgramEnrolment.schema.name;
    }

    static convertObsForSave(programEnrolment) {
        ObservationsHolder.convertObsForSave(programEnrolment.observations);
        ObservationsHolder.convertObsForSave(programEnrolment.programExitObservations);
    }

    updateObservations(programEnrolment) {
        const db = this.db;
        this.db.write(() => {
            ProgramEnrolmentService.convertObsForSave(programEnrolment);
            db.create(ProgramEnrolment.schema.name, {uuid: programEnrolment.uuid, observations: programEnrolment.observations}, true);
            db.create(EntityQueue.schema.name, EntityQueue.create(programEnrolment, ProgramEnrolment.schema.name));
        });
    }

    enrol(programEnrolment, checklists, nextScheduledVisits) {
        const db = this.db;
        const entityQueueItems = [];
        this.db.write(() => {
            ProgramEnrolmentService.convertObsForSave(programEnrolment);
            programEnrolment = db.create(ProgramEnrolment.schema.name, programEnrolment, true);
            entityQueueItems.push(EntityQueue.create(programEnrolment, ProgramEnrolment.schema.name));
            General.logDebug('ProgramEnrolmentService', 'Saved ProgramEnrolment');

            nextScheduledVisits.forEach((nextScheduledVisit) => {
                const encounterType = this.findByKey('name', nextScheduledVisit.encounterType, EncounterType.schema.name);
                if (_.isNil(encounterType)) throw Error(`NextScheduled visit is for an encounter type=${nextScheduledVisit.encounterType}, but it doesn't exist`);

                var programEncounter = ProgramEncounter.createScheduledProgramEncounter(encounterType, programEnrolment);
                programEncounter.updateSchedule(nextScheduledVisit);
                programEnrolment.addEncounter(programEncounter);

                entityQueueItems.push(EntityQueue.create(programEncounter, ProgramEncounter.schema.name));
            });
            General.logDebug('ProgramEnrolmentService', 'Added scheduled visits to ProgramEnrolment');

            checklists.forEach((checklist) => {
                if (_.isNil(programEnrolment.findChecklist(checklist.name))) {
                    checklist.baseDate = checklist.baseDate || new Date();

                    const savedChecklist = db.create(Checklist.schema.name, checklist, true);
                    entityQueueItems.push(EntityQueue.create(savedChecklist, Checklist.schema.name));
                    savedChecklist.items.forEach((item) => {
                        item.checklist = savedChecklist;
                        entityQueueItems.push(EntityQueue.create(item, ChecklistItem.schema.name));
                    });

                    programEnrolment.checklists.push(savedChecklist);
                    savedChecklist.programEnrolment = programEnrolment;
                }
            });
            General.logDebug('ProgramEnrolmentService', 'Checklist added to ProgramEnrolment');

            const individual = this.findByUUID(programEnrolment.individual.uuid, Individual.schema.name);
            individual.addEnrolment(programEnrolment);
            General.logDebug('ProgramEnrolmentService', 'ProgramEnrolment added to Individual');

            entityQueueItems.forEach((entityQueue) => db.create(EntityQueue.schema.name, entityQueue));
            return programEnrolment;
        });
    }

    exit(programEnrolment) {
        ProgramEnrolmentService.convertObsForSave(programEnrolment);
        const db = this.db;
        this.db.write(() => {
            db.create(ProgramEnrolment.schema.name, programEnrolment, true);
            db.create(EntityQueue.schema.name, EntityQueue.create(programEnrolment, ProgramEnrolment.schema.name));
        });
    }

    getProgramReport(program) {
        const programSummary = this.getService(ProgramEncounterService).getProgramSummary(program);
        const all = this.db.objects(ProgramEnrolment.schema.name).filtered(`program.uuid == \"${program.uuid}\"`);
        programSummary.total = all.length;
        programSummary.open = 0;
        all.forEach((enrolment) => {
            if (_.isNil(enrolment.enrolmentDateTime)) programSummary.open++;
        });
        programSummary.program = program;
        return programSummary;
    }

    getAllEnrolments(programUUID) {
        return this.db.objects(ProgramEnrolment.schema.name).filtered(`program.uuid == \"${programUUID}\"`).sorted('enrolmentDateTime', true);
    }
}

export default ProgramEnrolmentService;