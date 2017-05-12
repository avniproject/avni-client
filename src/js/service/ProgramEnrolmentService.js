import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import ProgramEnrolment from "../models/ProgramEnrolment";
import Individual from "../models/Individual";
import EntityQueue from "../models/EntityQueue";
import _ from "lodash";
import ProgramEncounterService from "./program/ProgramEncounterService";
import RuleEvaluationService from "./RuleEvaluationService";
import ProgramEncounter from "../models/ProgramEncounter";
import ObservationsHolder from '../models/ObservationsHolder';
import EncounterType from '../models/EncounterType';
import Checklist from '../models/Checklist';
import ChecklistItem from '../models/ChecklistItem';
import ConceptService from "./ConceptService";
import General from "../utility/General";
import moment from "moment";

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

    enrol(programEnrolment, checklists, nextScheduledVisits) {
        const entityQueueItems = [EntityQueue.create(programEnrolment, ProgramEnrolment.schema.name)];
        const existingProgramEnrolment = this.findByUUID(programEnrolment.uuid);

        checklists.forEach((checklist) => {
            if (_.isNil(existingProgramEnrolment) || _.isNil(existingProgramEnrolment.findChecklist(checklist.name))) {
                entityQueueItems.push(EntityQueue.create(checklist, Checklist.schema.name));
                checklist.items.forEach((checklistItem) => {
                    entityQueueItems.push(EntityQueue.create(checklistItem, ChecklistItem.schema.name));
                });
            }
        });

        nextScheduledVisits.forEach((nextScheduledVisit) => {
            const encounterType = this.findByKey('name', nextScheduledVisit.encounterType, EncounterType.schema.name);
            if (_.isNil(encounterType)) throw Error(`NextScheduled visit is for an encounter type=${nextScheduledVisit.encounterType}, but it doesn't exist`);

            const programEncounter = ProgramEncounter.createFromScheduledVisit(nextScheduledVisit, encounterType, programEnrolment);
            entityQueueItems.push(EntityQueue.create(programEncounter, ProgramEncounter.schema.name));
            programEnrolment.encounters.push(programEncounter);
        });

        const db = this.db;
        ProgramEnrolmentService.convertObsForSave(programEnrolment);
        this.db.write(() => {
            const savedProgramEnrolment = db.create(ProgramEnrolment.schema.name, programEnrolment, true);

            checklists.forEach((checklist) => {
                if (_.isNil(savedProgramEnrolment.findChecklist(checklist.name))) {
                    checklist.baseDate = checklist.baseDate || new Date();
                    const savedChecklist = db.create(Checklist.schema.name, checklist, true);
                    savedChecklist.items.forEach((item) => {
                        item.checklist = savedChecklist;
                    });
                    savedProgramEnrolment.checklists.push(savedChecklist);
                    savedChecklist.programEnrolment = savedProgramEnrolment;
                }
            });

            const loadedIndividual = this.findByUUID(programEnrolment.individual.uuid, Individual.schema.name);
            if (!_.some(loadedIndividual.enrolments, (enrolment) => enrolment.uuid === programEnrolment.uuid)) {
                const loadedEnrolment = this.findByUUID(programEnrolment.uuid, ProgramEnrolment.schema.name);
                loadedIndividual.enrolments.push(loadedEnrolment);
            }

            entityQueueItems.forEach((entityQueue) => db.create(EntityQueue.schema.name, entityQueue));
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