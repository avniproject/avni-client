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
        // Match on the Checklist table, not programEnrolment.getChecklists(): the enrolment's forward link can be stale while the row exists, which would otherwise create a server-conflicting duplicate.
        const existingChecklist = this.getAll(Checklist.schema.name)
            .filtered('voided = false and programEnrolment.uuid = $0 and detail.uuid = $1',
                programEnrolment.uuid, checklist.detail.uuid)[0];
        if (!_.isNil(existingChecklist)) {
            existingChecklist.baseDate = checklist.baseDate;
            if (!programEnrolment.getChecklists().some(c => c.uuid === existingChecklist.uuid))
                programEnrolment.addChecklist(existingChecklist);   // re-link a diverged forward list
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
