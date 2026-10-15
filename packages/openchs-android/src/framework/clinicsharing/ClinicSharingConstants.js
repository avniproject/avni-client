export const LEDGER_RETENTION_DAYS = 7;
export const LEDGER_PRUNE_INTERVAL_MS = 60 * 60 * 1000;
export const CLINIC_SYNC_INTERVAL_SECONDS = 30;

// Upload-queue names of the records phones share through the hub. Each has a round-trip test.
// Not shared: per-device or server-owned records such as IdentifierAssignment, Task, News and telemetry.
export const SHAREABLE_ENTITIES = [
    'Individual', 'ProgramEnrolment', 'ProgramEncounter', 'Encounter', 'Checklist', 'ChecklistItem',
    'IndividualRelationship', 'GroupSubject', 'EntityApprovalStatus', 'Comment', 'CommentThread',
    'SubjectProgramEligibility', 'Session', 'AttendanceRecord',
];
export const HELD_UPLOAD_WARNING_DAYS = 3;
