// Shared by GroupSubjectSaveTest and GroupSubjectBulkSaveTest so the two cannot drift on what
// saveGroupSubject is allowed to do.

import {GroupSubject} from "avni-models";
import GroupSubjectService from "../../src/service/GroupSubjectService";

const individualStub = () => ({addGroupSubject: jest.fn(), addGroup: jest.fn()});

// trackSaved models what both backends actually do inside one transaction: a read sees rows
// written earlier in the same transaction. SqliteProxy.write is re-entrant on a single
// connection, and Realm returns live managed objects.
export function harness(existingMembers, {trackSaved = false} = {}) {
    const service = Object.create(GroupSubjectService.prototype);
    const created = [];
    const savedGroupSubjects = () => created.filter(c => c.schema === GroupSubject.schema.name);

    service.getGroupSubjects = () => trackSaved
        ? [...existingMembers, ...savedGroupSubjects().map(c => c.obj)]
        : existingMembers;
    service.getService = () => ({findByUUID: () => individualStub()});
    // 18.0 persists via the repository abstraction: this.repository.create for the GroupSubject
    // and this.getRepository(schema).create for the linked Individual / EntityQueue rows.
    // this.repository resolves to getRepository() with no arg -> getSchema() -> GroupSubject.
    service.getRepository = (schema) => ({
        create: (obj) => {
            created.push({schema: schema || GroupSubject.schema.name, obj});
            return obj;
        }
    });
    return {service, created, savedGroupSubjects};
}

export const member = ({uuid, memberUUID = "m1", start = null, voided = false}) => ({
    uuid,
    groupSubject: {uuid: "g1"},
    memberSubject: {uuid: memberUUID},
    membershipStartDate: start,
    membershipEndDate: null,
    voided,
});
