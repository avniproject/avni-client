import {expect} from 'chai';
import Checklist from "../../js/models/Checklist";
import EntityFactory from "./EntityFactory";

describe('ChecklistTest', () => {
    it('orderedAndGroupedUpcomingItems', () => {
        const checklist = Checklist.create();
        EntityFactory.addChecklistItem(checklist, '0', new Date(2015, 2, 1));
        EntityFactory.addChecklistItem(checklist, 'b', new Date(2035, 2, 1));
        EntityFactory.addChecklistItem(checklist, 'a.1', new Date(2035, 1, 1));
        EntityFactory.addChecklistItem(checklist, 'a.2', new Date(2035, 1, 1));
        EntityFactory.addChecklistItem(checklist, 'c.1', new Date(2035, 3, 4));
        EntityFactory.addChecklistItem(checklist, 'c.2', new Date(2035, 3, 4));

        const upcomingItems = checklist.upcomingItems();
        expect(upcomingItems.length).is.equal(3);
        expect(upcomingItems[0].length).is.equal(2);
        expect(upcomingItems[0][0].dueDate.valueOf()).is.equal(new Date(2035, 1, 1).valueOf());
        expect(upcomingItems[1].length).is.equal(1);
        expect(upcomingItems[2].length).is.equal(2);
    });
});