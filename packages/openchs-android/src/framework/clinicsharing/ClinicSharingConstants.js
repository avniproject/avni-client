export const LEDGER_RETENTION_DAYS = 7;
export const LEDGER_PRUNE_INTERVAL_MS = 60 * 60 * 1000;

// Expand only after the toResource→fromResource adapter is verified for each type
// (the server renames some reference keys between push and pull formats).
export const SHAREABLE_ENTITIES = ['Individual', 'Encounter', 'ProgramEnrolment', 'ProgramEncounter'];
