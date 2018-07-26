import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {Checklist, ChecklistItem, EntityQueue, StringKeyNumericValue, ChecklistItemStatus, Form} from "openchs-models";
import _ from 'lodash';
import ConceptService from "./ConceptService";
import General from "../utility/General";

@Service("ChecklistService")
class ChecklistService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.saveOrUpdate = this.saveOrUpdate.bind(this);
    }

    getSchema() {
        return ChecklistService.schema.name;
    }

    saveOrUpdate(programEnrolment, checklist, db = this.db) {
        const entityQueueItems = [];
        // if (!_.isNil(programEnrolment.findChecklist(checklist.name))) return entityQueueItems;
        const conceptService = this.getService(ConceptService);
        let checklistToBeCreated = Checklist.create();
        checklistToBeCreated.baseDate = checklist.baseDate || new Date();
        checklistToBeCreated.name = checklist.name;
        const savedChecklist = db.create(Checklist.schema.name, checklistToBeCreated, true);
        General.logDebug("ChecklistService - Checklist", savedChecklist);
        entityQueueItems.push(EntityQueue.create(savedChecklist, Checklist.schema.name));
        const checklistItems = checklist.items.map((item) => {
            const checklistItem = ChecklistItem.create();
            checklistItem.checklist = savedChecklist;
            checklistItem.form = this.findByUUID(item.formUUID, Form.schema.name);
            checklistItem.concept = conceptService.getConceptByName(item.conceptName);
            checklistItem.stateConfig = _.map(item.states, (val, key) => {
                const checklistItemStatus = ChecklistItemStatus.create();
                checklistItemStatus.state = key;
                checklistItemStatus.from.key = Object.keys(val.from).find((fk) => ChecklistItemStatus.VALID_KEYS.indexOf(fk) > -1);
                checklistItemStatus.from.value = val.from[checklistItemStatus.from.key];
                checklistItemStatus.to.key = Object.keys(val.to).find((fk) => ChecklistItemStatus.VALID_KEYS.indexOf(fk) > -1);
                checklistItemStatus.to.value = val.to[checklistItemStatus.to.key];
                checklistItemStatus.color = val.color;
                return db.create(ChecklistItemStatus.schema.name, checklistItemStatus);
            });
            const savedChecklistItem = db.create(ChecklistItem.schema.name, checklistItem);
            entityQueueItems.push(EntityQueue.create(savedChecklistItem, ChecklistItem.schema.name));
            return savedChecklistItem;
        });
        General.logDebug("ChecklistService - Items To be Mapped", checklistItems);
        checklistItems.forEach(ci => savedChecklist.items.push(ci));
        programEnrolment.checklists.push(savedChecklist);
        savedChecklist.programEnrolment = programEnrolment;
        return entityQueueItems;
    }
}

export default ChecklistService;