import _ from "lodash";
import {Checklist, ChecklistDetail, ChecklistItem, Concept} from "openchs-models";
import TestConceptFactory from "../../test/model/TestConceptFactory";
import General from "../../src/utility/General";
import moment from "moment/moment";

class TestChecklistService {
    static createChecklist(programEnrolment, db, withDue = true) {
        const checklistConcept = db.create(Concept, TestConceptFactory.createWithDefaults({dataType: Concept.dataType.Text}));
        const checklistDetail = db.create(ChecklistDetail, {
            uuid: General.randomUUID(),
            name: 'ck-detail',
            items: [],
            voided: false})
        const checklist = {
            uuid: General.randomUUID(),
            items: [
                {
                    uuid: General.randomUUID(),
                    detail: {
                        uuid: General.randomUUID(),
                        concept: checklistConcept,
                        stateConfig: [{
                            state: "Due",
                            from: {key: "key1", value: 1},
                            to: {key: "key2", value: 2},
                            color: "red",
                            displayOrder: 3,
                            start: -1,
                            end: +1
                        }],
                        checklistDetail: checklistDetail,
                    }
                }]
        }
        let checklistToBeCreated = Checklist.create();
        checklistToBeCreated.uuid = _.isNil(checklist.uuid) ? checklistToBeCreated.uuid : checklist.uuid;
        checklistToBeCreated.baseDate = withDue ? moment().toDate() : moment().add(-2, "day").toDate();
        checklistToBeCreated.detail = checklistDetail;
        const savedChecklist = db.create(Checklist, checklistToBeCreated, true);
        const checklistItems = checklist.items.map((item) => {
            const checklistItem = ChecklistItem.create({
                uuid: item.uuid,
                checklist: savedChecklist,
                detail: item.detail
            });
            return db.create(ChecklistItem, checklistItem, true);
        });
        checklistItems.forEach(ci => savedChecklist.items.push(ci));
        programEnrolment.addChecklist(savedChecklist);
        savedChecklist.programEnrolment = programEnrolment;
    }
}

export default TestChecklistService;
