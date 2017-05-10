import _ from "lodash";
import ResourceUtil from "../utility/ResourceUtil";
import General from "../utility/General";
import ProgramEnrolment from './ProgramEnrolment';
import BaseEntity from "./BaseEntity";
import ChecklistItem from "./ChecklistItem";

class Checklist extends BaseEntity {
    static schema = {
        name: 'Checklist',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
            baseDate: 'date',
            items: {type: 'list', objectType: 'ChecklistItem'},
            programEnrolment: 'ProgramEnrolment'
        }
    };

    static create() {
        const checklist = new Checklist();
        checklist.uuid = General.randomUUID();
        checklist.items = [];
        return checklist;
    }

    static fromResource(checklistResource, entityService) {
        const programEnrolment = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(checklistResource, "enrolmentUUID"), ProgramEnrolment.schema.name);
        const checklist = General.assignFields(checklistResource, new Checklist(), ["uuid", "name"]);
        checklist.programEnrolment = programEnrolment;
        return checklist;
    }

    get toResource() {
        const resource = _.pick(this, ["uuid", "name"]);
        resource["programEnrolmentUUID"] = this.programEnrolment.uuid;
        return resource;
    }

    static associateChild(child, childEntityClass, childResource, entityService) {
        var checklist = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(childResource, "checklistUUID"), Checklist.schema.name);
        checklist = General.pick(checklist, ["uuid"], ["items"]);

        if (childEntityClass === ChecklistItem)
            BaseEntity.addNewChild(child, checklist.items);
        else
            throw `${childEntityClass.name} not support by ${Checklist.name}`;

        return checklist;
    }

    clone() {
        const checklist = new Checklist();
        checklist.uuid = this.uuid;
        checklist.name = this.name;
        checklist.programEnrolment = this.programEnrolment;
        checklist.baseDate = this.baseDate;
        checklist.items = [];
        this.items.forEach((checklistItem) => {
            checklist.items.push(checklistItem.clone());
        });
        return checklist;
    }

    getChecklistItem(name) {
        return _.find(this.items, (item) => item.concept.name === name);
    }

    addChecklistItems(expectedChecklist, conceptFinder) {
        expectedChecklist.items.forEach((expectedItem) => {
            var checklistItem = this.getChecklistItem(expectedItem.name);
            if (_.isNil(checklistItem)) {
                checklistItem = ChecklistItem.create();
                const concept = conceptFinder.getConceptByName(expectedItem.name);
                if (_.isNil(concept)) throw Error(`Concept with name: ${expectedItem.name} not found`);
                checklistItem.concept = concept;
                this.items.push(checklistItem);
            }
            checklistItem.dueDate = expectedItem.dueDate;
            checklistItem.maxDate = expectedItem.maxDate;
        });
    }

    setCompletionDate(checklistItemName, value) {
        const checklistItem = this.getChecklistItem(checklistItemName);
        checklistItem.completionDate = value;
    }

    upcomingItems() {
        return _.values(_.groupBy(_.sortBy(_.filter(this.items, (item) => item.isStillDue), (item) => item.dueDate), (item) => item.dueDate));
    }

    groupedItems() {
        return _.values(_.groupBy(_.sortBy(this.items, (item) => item.dueDate), (item) => item.dueDate));
    }

    addItem(item) {
        this.items.push(item);
    }
}

export default Checklist;