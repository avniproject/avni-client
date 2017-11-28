import {assert} from 'chai';
import Checklist from "../src/Checklist";
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
        assert.equal(upcomingItems.length, 3);
        assert.equal(upcomingItems[0].length, 2);
        assert.equal(upcomingItems[0][0].dueDate.valueOf(), new Date(2035, 1, 1).valueOf());
        assert.equal(upcomingItems[1].length, 1);
        assert.equal(upcomingItems[2].length, 2);
    });
});