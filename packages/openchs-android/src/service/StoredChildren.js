import _ from "lodash";

export const INDIVIDUAL_CHILD_LISTS = ["encounters", "enrolments", "relationships", "groupSubjects", "groups", "comments", "approvalStatuses"];
export const ENROLMENT_CHILD_LISTS = ["encounters", "checklists", "approvalStatuses"];

// A copy taken when a form opened would replace these lists on save, dropping children saved since.
export const keepStoredChildren = (entity, stored, listNames) => {
    if (_.isNil(stored)) return entity;
    listNames.forEach((name) => {
        const storedList = _.toArray(stored[name]);
        const storedUuids = new Set(storedList.map((child) => child.uuid));
        entity[name] = [...storedList, ..._.toArray(entity[name]).filter((child) => !storedUuids.has(child.uuid))];
    });
    return entity;
};
