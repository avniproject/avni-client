import {expect} from 'chai';
import _ from "lodash";
import ChecklistItem from "../src/ChecklistItem";
import Checklist from "../src/Checklist";
import moment from "moment";
import ChecklistItemStatus from "../src/ChecklistItemStatus";
import EntityFactory from "./EntityFactory";
import Concept from "../src/Concept";
import ChecklistItemDetail from "../src/ChecklistItemDetail";
import StringKeyNumericValue from "../src/application/StringKeyNumericValue";

describe('ChecklistItemTest', () => {
    let checklist;
    let checklistItem;

    beforeEach(() => {
        checklist = new Checklist();
        checklistItem = new ChecklistItem();
        checklistItem.checklist = checklist;
        let checklistItemDetail = new ChecklistItemDetail();
        checklistItemDetail.stateConfig = [createChecklistItemStatus(6, 9, "Due", 1), createChecklistItemStatus(9, 10, "Critical", 2), createChecklistItemStatus(10, 20, "Overdue", 3)];
        checklistItem.detail = checklistItemDetail;
    });

    function createChecklistItemStatus(from, to, state, displayOrder) {
        let checklistItemStatus = new ChecklistItemStatus();
        checklistItemStatus.state = state;
        checklistItemStatus.displayOrder = displayOrder;
        let stringKeyNumericValue = new StringKeyNumericValue();
        checklistItemStatus.from = stringKeyNumericValue;
        stringKeyNumericValue.key = "week";
        stringKeyNumericValue.value = from;

        stringKeyNumericValue = new StringKeyNumericValue();
        checklistItemStatus.to = stringKeyNumericValue;
        stringKeyNumericValue.key = "week";
        stringKeyNumericValue.value = to;
        return checklistItemStatus;
    }

    it('getApplicableState when completed', () => {
        checklist.baseDate = moment().subtract(8, 'week').toDate();
        checklistItem.completionDate = moment().subtract(4, 'week');
        expect(checklistItem.calculateApplicableState().status.state).is.equal(ChecklistItemStatus.completed.state);
    });

    it('getApplicableState when past dueDate', function () {
        checklist.baseDate = moment().subtract(8, 'week').toDate();
        let applicableState = checklistItem.calculateApplicableState().status;
        expect(applicableState.state).is.equal("Due");
    });

    it('getApplicableState when before due', function () {
        checklist.baseDate = moment().subtract(4, 'week').toDate();
        let applicableState = checklistItem.calculateApplicableState().status;
        expect(applicableState).is.null;
    });

    it('getApplicableState when after max', function () {
        checklist.baseDate = moment().subtract(4, 'year').toDate();
        let applicableState = checklistItem.calculateApplicableState().status;
        expect(applicableState.state).is.equal("Past Expiry");
    });
});