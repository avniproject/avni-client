import _ from "lodash";

// Made-up records in the shape the server sends: fields on the body, links under _links.<name>.href.
const at = "2026-09-01T10:00:00.000Z";
const later = "2026-09-02T00:00:00.000Z";

// Individual.js:36 in avni-models; DUMMY_UUIDS holds it, so a row never points at it.
export const PLACEHOLDER_ADDRESS_UUID = "f71b2f45-2c11-427f-aa99-be6161a6b413";

// Parents and reference data the seeded phone needs beyond lazyFixture's SEED.
export const EXTRA_SEED = [
    ["AddressLevel", {uuid: "al-village", title: "Village", level: 1, type: "Village", voided: false}],
    ["Concept", {uuid: "c-symptoms", name: "Symptoms", datatype: "Coded", voided: false}],
    ["Concept", {uuid: "c-lmp", name: "Last menstrual period", datatype: "Date", voided: false}],
    ["Concept", {uuid: "c-note", name: "Note", datatype: "Text", voided: false}],
    ["Concept", {uuid: "c-vitals", name: "Vitals", datatype: "QuestionGroup", voided: false}],
    ["Concept", {uuid: "c-pulse", name: "Pulse", datatype: "Numeric", voided: false}],
    ["ChecklistDetail", {uuid: "cd-vaccines", name: "Vaccines", voided: false}],
    ["ChecklistItemDetail", {uuid: "cid-bcg", concept: {uuid: "c-note"}, checklistDetail: {uuid: "cd-vaccines"}, voided: false}],
    ["Checklist", {uuid: "cl-1", programEnrolment: {uuid: "enl-1"}, detail: {uuid: "cd-vaccines"}, baseDate: new Date(at)}],
];

// One answer of each common kind: number, coded (two answers), date, text, and a question group.
export const ANSWERS = {"c-weight": 54, "c-symptoms": ["c-fever", "c-cough"], "c-lmp": "2026-08-01T00:00:00.000Z", "c-note": "first visit", "c-vitals": {"c-pulse": 72}};
export const REPEATED_GROUP = {"c-vitals": [{"c-pulse": 70}, {"c-pulse": 74}]};

const AUDIT = {createdBy: "Admin", createdByUUID: "u-admin", lastModifiedBy: "Asha", lastModifiedByUUID: "u-asha"};
const links = (pairs) => _.mapValues(_.omitBy(pairs, _.isUndefined), (href) => ({href}));

export const without = (resource, ...keys) => _.omit(resource, keys);

export const individualResource = (fields = {}, linkOverrides = {}) => ({
    uuid: "ind-new", firstName: "Meera", middleName: "K", lastName: "Rao", profilePicture: "meera.jpg",
    dateOfBirth: "1990-05-01T00:00:00.000Z", dateOfBirthVerified: true, registrationDate: at, voided: false,
    observations: ANSWERS,
    registrationLocation: {x: 77.59, y: 12.97},
    subjectLocation: {coordinates: {x: 77.59, y: 12.97}, accuracy: 4.5},
    lastModifiedDateTime: later,
    ...fields,
    _links: links({subjectTypeUUID: "st-person", genderUUID: "g-f", addressUUID: "al-village", ...AUDIT, ...linkOverrides}),
});
