import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {
    Checklist,
    ChecklistItem,
    EntityQueue,
    StringKeyNumericValue,
    ChecklistItemStatus,
    Form,
    ChecklistItemDetail,
    ChecklistDetail,
    ObservationsHolder,
    EntitySyncStatus
} from "openchs-models";
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

    saveChecklistItem(checklistItem) {
        ObservationsHolder.convertObsForSave(checklistItem.observations);
        return super.saveOrUpdate(checklistItem, ChecklistItem.schema.name);
    }

    saveOrUpdate(programEnrolment, checklist, db = this.db) {
        const entityQueueItems = [];
        let checklistToBeCreated = Checklist.create();
        checklistToBeCreated.uuid = _.isNil(checklist.uuid) ? checklistToBeCreated.uuid : checklist.uuid;
        checklistToBeCreated.baseDate = checklist.baseDate;
        let checklistDetail = this.findByUUID(checklist.detailUUID, ChecklistDetail.schema.name);
        checklistToBeCreated.detail = checklistDetail;
        const savedChecklist = db.create(Checklist.schema.name, checklistToBeCreated, true);
        entityQueueItems.push(EntityQueue.create(savedChecklist, Checklist.schema.name));
        const checklistItems = checklist.items.map((item) => {
            const checklistItem = ChecklistItem.create();
            checklistItem.uuid = _.isNil(item.uuid) ? checklistItem.uuid : checklist.uuid;
            checklistItem.checklist = savedChecklist;
            checklistItem.detail = this.findByUUID(item.detailUUID, ChecklistItemDetail.schema.name);
            const savedChecklistItem = db.create(ChecklistItem.schema.name, checklistItem);
            entityQueueItems.push(EntityQueue.create(savedChecklistItem, ChecklistItem.schema.name));
            return savedChecklistItem;
        });
        checklistItems.forEach(ci => savedChecklist.items.push(ci));
        programEnrolment.checklists.push(savedChecklist);
        savedChecklist.programEnrolment = programEnrolment;
        return entityQueueItems;
    }
}

export default ChecklistService;