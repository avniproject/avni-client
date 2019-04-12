import ChecklistItem from "../src/ChecklistItem";
import Checklist from "../src/Checklist";
import moment from "moment";
import ChecklistItemStatus from "../src/ChecklistItemStatus";
import ChecklistItemDetail from "../src/ChecklistItemDetail";

describe("ChecklistItemTest", () => {
    let checklist, checklistItem, polio0, polio1;

    beforeEach(() => {
        checklist = new Checklist();

        polio0 = createChecklistItem(checklist, "Polio 0", null, null, null, null, 15);
        polio0.detail.stateConfig = [
            createChecklistItemStatus(0, 15, "day", "Due", 1),
        ];

        polio1 = createChecklistItem(checklist, "Polio 1", polio0, true, 42, 28);
        polio1.detail.concept = {name: "Polio 0"};
        polio1.detail.stateConfig = [
            createChecklistItemStatus(0, 21, "day", "Due", 1),
            createChecklistItemStatus(21, 28, "day", "Critical", 2),
            createChecklistItemStatus(28, 1095, "day", "Overdue", 2)
        ];
        checklist.items = [polio0, polio1];

        checklistItem = createChecklistItem(checklist);
        checklistItem.detail.stateConfig = [
            createChecklistItemStatus(42, 63, "week", "Due", 1),
            createChecklistItemStatus(63, 70, "week", "Critical", 2),
            createChecklistItemStatus(70, 140, "week", "Overdue", 3)
        ];
    });

    /**
     * @param checklist
     * @param [conceptName]
     * @param [dependentOn]
     * @param [scheduleOnExpiryOfDependency]
     * @param [minDaysFromStartDate]
     * @param [expiresAfter]
     * @return ChecklistItem
     */
    function createChecklistItem(checklist, conceptName, dependentOn, scheduleOnExpiryOfDependency, minDaysFromStartDate, minDaysFromDependent, expiresAfter) {
        const item = new ChecklistItem();
        item.checklist = checklist;
        item.detail = new ChecklistItemDetail();
        item.detail.concept = {name: conceptName};
        item.detail.dependentOn = dependentOn;
        item.detail.scheduleOnExpiryOfDependency = scheduleOnExpiryOfDependency;
        item.detail.minDaysFromStartDate = minDaysFromStartDate;
        item.detail.minDaysFromDependent = minDaysFromDependent;
        item.detail.expiresAfter = expiresAfter;
        return item;
    }

    function createChecklistItemStatus(from, to, unit, state, displayOrder) {
        let checklistItemStatus = new ChecklistItemStatus();
        checklistItemStatus.state = state;
        checklistItemStatus.displayOrder = displayOrder;
        checklistItemStatus.start = from;
        checklistItemStatus.end = to;
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

        currentDate = moment(checklist.baseDate).add(71, "days").startOf("day");
        status = polio1.calculateApplicableState(currentDate).status;
        expect(status.state).toBe("Critical");
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
