import {assert} from "chai";
import VisitScheduleBuilder from "../src/rules/builders/VisitScheduleBuilder";

const monthlyVisit = {
    name: 'Monthly Visit',
    encounterType: 'Monthly Visit',
    earliestDate: new Date(),
    maxDate: new Date()
};

const dropoutVisit = {
    name: 'Dropout Home Visit',
    encounterType: 'Dropout Home Visit',
    earliestDate: new Date(),
    maxDate: new Date()
};

describe("ScheduleBuilderTest", () => {
    let scheduleBuilder;
    beforeEach(() => {
        scheduleBuilder = new VisitScheduleBuilder({});
    });

    it("Should only return unique visits", () => {
        scheduleBuilder.add(monthlyVisit).whenItem(true).truthy;
        scheduleBuilder.add(monthlyVisit).whenItem(true).truthy;
        scheduleBuilder.add(dropoutVisit).whenItem(true).truthy;
        scheduleBuilder.add(dropoutVisit).whenItem(true).truthy;
        const allVisits = scheduleBuilder.getAll();
        const uniqueVisits = scheduleBuilder.getAllUnique("encounterType");
        assert.lengthOf(allVisits, 4);
        assert.lengthOf(uniqueVisits, 2);
    });
});