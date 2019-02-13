import ChecklistItem from "../src/ChecklistItem";
import Checklist from "../src/Checklist";
import moment from "moment";
import ChecklistItemStatus from "../src/ChecklistItemStatus";
import ChecklistItemDetail from "../src/ChecklistItemDetail";
import StringKeyNumericValue from "../src/application/StringKeyNumericValue";

describe("ChecklistItemTest", () => {
    let checklist;
    let checklistItem;
    let polio0, polio1;

    beforeEach(() => {
        checklist = new Checklist();

        polio0 = createChecklistItem(checklist, "Polio 0");
        polio0.detail.stateConfig = [
            createChecklistItemStatus(0, 15, "day", "Due", 1),
            createChecklistItemStatus(15, 1825, "day", "Expired", 2)
        ];

        polio1 = createChecklistItem(checklist, "Polio 1", polio0, true, 42);
        polio1.detail.concept = {name: "Polio 0"};
        polio1.detail.stateConfig = [
            createChecklistItemStatus(28, 49, "day", "Due", 1),
            createChecklistItemStatus(49, 56, "day", "Critical", 2),
            createChecklistItemStatus(56, 1095, "day", "Overdue", 2)
        ];
        checklist.items = [polio0, polio1];

        checklistItem = createChecklistItem(checklist);
        checklistItem.detail.stateConfig = [
            createChecklistItemStatus(6, 9, "week", "Due", 1),
            createChecklistItemStatus(9, 10, "week", "Critical", 2),
            createChecklistItemStatus(10, 20, "week", "Overdue", 3)
        ];
    });

    /**
     * @param checklist
     * @param [conceptName]
     * @param [dependentOn]
     * @param [scheduleOnExpiryOfDependency]
     * @param [minDaysFromStartDate]
     * @return ChecklistItem
     */
    function createChecklistItem(checklist, conceptName, dependentOn, scheduleOnExpiryOfDependency, minDaysFromStartDate) {
        const item = new ChecklistItem();
        item.checklist = checklist;
        item.detail = new ChecklistItemDetail();
        item.detail.concept = {name: conceptName};
        item.detail.dependentOn = dependentOn;
        item.detail.scheduleOnExpiryOfDependency = scheduleOnExpiryOfDependency;
        item.detail.minDaysFromStartDate = minDaysFromStartDate;
        return item;
    }

    function createChecklistItemStatus(from, to, unit, state, displayOrder) {
        let checklistItemStatus = new ChecklistItemStatus();
        checklistItemStatus.state = state;
        checklistItemStatus.displayOrder = displayOrder;
        let stringKeyNumericValue = new StringKeyNumericValue();
        checklistItemStatus.from = stringKeyNumericValue;
        stringKeyNumericValue.key = unit;
        stringKeyNumericValue.value = from;

        stringKeyNumericValue = new StringKeyNumericValue();
        checklistItemStatus.to = stringKeyNumericValue;
        stringKeyNumericValue.key = unit;
        stringKeyNumericValue.value = to;
        return checklistItemStatus;
    }

    it("is considering minDaysFromStartDate", () => {
        checklist.baseDate = new Date("2019-1-1");
        polio0.completionDate = new Date("2019-1-1");
        const minDaysFromStartDate = polio1.detail.minDaysFromStartDate;
        const currentDate = moment(checklist.baseDate).add(minDaysFromStartDate, "days").startOf("day");
        const status = polio1.calculateApplicableState(currentDate).status;
        expect(status.state).toBe("Due")
    });

    it("is considering minGapFromPrevious", () => {
        checklist.baseDate = new Date("2019-1-1");
        polio0.completionDate = moment(checklist.baseDate).add(15, "days").toDate();
        const minDaysFromStartDate = polio1.detail.minDaysFromStartDate;

        let currentDate = moment(checklist.baseDate).add(minDaysFromStartDate, "days").startOf("day");
        let status = polio1.calculateApplicableState(currentDate).status;
        expect(status).toBeNull();

        currentDate = moment(checklist.baseDate).add(43, "days").startOf("day");
        status = polio1.calculateApplicableState(currentDate).status;
        expect(status.state).toBe("Due");
    });

    it("is calculating state if lead item is expired", () => {
        checklist.baseDate = new Date("2019-1-1");
        const minDaysFromStartDate = polio1.detail.minDaysFromStartDate;
        let currentDate = moment(checklist.baseDate).add(minDaysFromStartDate, "days").startOf("day");
        expect(polio0.calculateApplicableState(currentDate).status.state).toBe("Expired");
        expect(polio1.calculateApplicableState(currentDate).status.state).toBe("Due");
    });


    it("getApplicableState when completed", () => {
        checklist.baseDate = moment().subtract(8, "week").toDate();
        checklistItem.completionDate = moment().subtract(4, "week");
        expect(checklistItem.calculateApplicableState().status.state).toBe(ChecklistItemStatus.completed.state);
    });

    it("getApplicableState when past dueDate", function() {
        checklist.baseDate = moment().subtract(8, "week").toDate();
        let applicableState = checklistItem.calculateApplicableState().status;
        expect(applicableState.state).toBe("Due");
    });

    it("getApplicableState when before due", function() {
        checklist.baseDate = moment().subtract(4, "week").toDate();
        let applicableState = checklistItem.calculateApplicableState().status;
        expect(applicableState).toBeNull();
    });
});
