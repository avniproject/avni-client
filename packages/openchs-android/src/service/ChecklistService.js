import BaseService from './BaseService';
import Service from '../framework/bean/Service';
import {
    Checklist,
    ChecklistDetail,
    ChecklistItem,
    ChecklistItemDetail,
    EntityQueue,
    ObservationsHolder
} from 'avni-models';
import _ from 'lodash';
import General from '../utility/General';

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
        const db = this.db;
        ObservationsHolder.convertObsForSave(checklistItem.observations);
        //TODO: implement approval workflow for checklist form as well. We don't have formMapping for this form so skipping it now.
        this.db.write(() => {
            const savedChecklistItem = db.create(ChecklistItem.schema.name, checklistItem, true);
            db.create(EntityQueue.schema.name, EntityQueue.create(savedChecklistItem, ChecklistItem.schema.name));
        })
    }

    saveOrUpdate(programEnrolment, checklist, db = this.db) {
        const entityQueueItems = [];
        let existingChecklist = programEnrolment.getChecklists().find(c => c.detail.uuid === checklist.detail.uuid);
        if (!_.isNil(existingChecklist)) {
            existingChecklist.baseDate = checklist.baseDate;
            entityQueueItems.push(EntityQueue.create(existingChecklist, Checklist.schema.name));
            return entityQueueItems;
        }
        let checklistToBeCreated = Checklist.create();
        checklistToBeCreated.uuid = _.isNil(checklist.uuid) ? checklistToBeCreated.uuid : checklist.uuid;
        checklistToBeCreated.baseDate = checklist.baseDate;
        let checklistDetail = this.findByUUID(checklist.detail.uuid, ChecklistDetail.schema.name);
        checklistToBeCreated.detail = checklistDetail;
        const savedChecklist = db.create(Checklist.schema.name, checklistToBeCreated, true);
        entityQueueItems.push(EntityQueue.create(savedChecklist, Checklist.schema.name));
        const checklistItems = checklist.items.map((item) => {
            const checklistItem = ChecklistItem.create({
                uuid: item.uuid,
                checklist: savedChecklist,
                detail: this.findByUUID(item.detail.uuid, ChecklistItemDetail.schema.name)
                //Need to update observation.
                //No straight forward solution available right now.
            });
            const savedChecklistItem = db.create(ChecklistItem.schema.name, checklistItem, true);
            entityQueueItems.push(EntityQueue.create(savedChecklistItem, ChecklistItem.schema.name));
            return savedChecklistItem;
        });
        checklistItems.forEach(ci => savedChecklist.items.push(ci));
        programEnrolment.addChecklist(savedChecklist);
        savedChecklist.programEnrolment = programEnrolment;
        return entityQueueItems;
    }

    checklistByCriteria(criteria) {
        return this.getAll(Checklist.schema.name).filtered(criteria)
    }

    undoChecklistItem(checklistItem) {
        General.logDebug('ChecklistService', `Undoing checklist item with uuid ${checklistItem.uuid}`);
        const existingChecklistItem = super.findByUUID(checklistItem.uuid, ChecklistItem.schema.name);
        let undoChecklistItem = existingChecklistItem.clone();
        undoChecklistItem.setCompletionDate(null);
        undoChecklistItem.observations = [];
        return this.saveChecklistItem(undoChecklistItem);
    }
}

export default ChecklistService;
