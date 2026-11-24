/**
 * Locks the wiring that decides whether _persistAllBatch re-saves a parent during
 * sync association: jsonArrayListPropFor returns the parent's JSON-array list
 * property for a child synced via association, or null for FK-on-child children
 * (which carry their own link and need no parent re-save).
 *
 * Tracking issue: avniproject/avni-client#1955.
 */

import {jsonArrayListPropFor} from '../../../src/framework/db/SchemaGenerator';

describe('jsonArrayListPropFor — parent→child JSON-array wiring (#1955)', () => {
    it('returns the parent list property for JSON-array-backed associations', () => {
        expect(jsonArrayListPropFor('Concept', 'ConceptAnswer')).toBe('answers');
        expect(jsonArrayListPropFor('ReportCard', 'SubjectType')).toBe('standardReportCardInputSubjectTypes');
        expect(jsonArrayListPropFor('ReportCard', 'Program')).toBe('standardReportCardInputPrograms');
        expect(jsonArrayListPropFor('ReportCard', 'EncounterType')).toBe('standardReportCardInputEncounterTypes');
        expect(jsonArrayListPropFor('TaskType', 'Concept')).toBe('metadataSearchFields');
    });

    it('returns null for FK-on-child relationships (no parent re-save)', () => {
        expect(jsonArrayListPropFor('ProgramEnrolment', 'ProgramEncounter')).toBeNull();
        expect(jsonArrayListPropFor('Individual', 'ProgramEnrolment')).toBeNull();
        expect(jsonArrayListPropFor('Checklist', 'ChecklistItem')).toBeNull();
    });

    it('does not match a child against the wrong parent', () => {
        expect(jsonArrayListPropFor('TaskType', 'SubjectType')).toBeNull();
        expect(jsonArrayListPropFor('Concept', 'SubjectType')).toBeNull();
    });
});
