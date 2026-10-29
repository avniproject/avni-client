export const CLINIC_PORT = 7373;
export const CLINIC_SYNC_INTERVAL_SECONDS = 30;

// Upload-queue names of the records phones share through the hub. Each has a round-trip test.
// Not shared: per-device or server-owned records such as IdentifierAssignment, Task, News and telemetry.
export const SHAREABLE_ENTITIES = [
    'Individual', 'ProgramEnrolment', 'ProgramEncounter', 'Encounter', 'Checklist', 'ChecklistItem',
    'IndividualRelationship', 'GroupSubject', 'EntityApprovalStatus', 'Comment', 'CommentThread',
    'SubjectProgramEligibility', 'Session', 'AttendanceRecord',
];
export const HELD_UPLOAD_WARNING_DAYS = 3;
// The organisation setup a phone must share with the hub to join its camp; user- and catchment-scoped types are left out.
export const SETUP_TYPES = [
    'Form', 'FormElementGroup', 'FormElement', 'FormMapping', 'Concept', 'ConceptAnswer', 'SubjectType', 'Program',
    'EncounterType', 'Rule', 'RuleDependency', 'OrganisationConfig', 'ChecklistDetail', 'ChecklistItemDetail',
];
// A phone leaving the camp tries one last sync with the hub, but never waits long for a hub out of reach.
export const LEAVE_SYNC_TIMEOUT_MS = 15 * 1000;
export const HUB_MIN_FREE_STORAGE_MB = 500;
export const MEDIA_BYTES_PER_HUB_SYNC = 20 * 1024 * 1024;
export const MEDIA_CHUNK_BYTES = 256 * 1024;
