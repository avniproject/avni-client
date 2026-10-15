// Sync pulls the server can answer without first counting every matching record.
const noCountPullPaths = {
    Individual: "individual/v2",
    ProgramEnrolment: "programEnrolment/v2",
    ProgramEncounter: "programEncounter/v2",
    Encounter: "encounter/v2",
    Checklist: "txNewChecklistEntity/v2",
    ChecklistItem: "txNewChecklistItemEntity/v2",
    IndividualRelationship: "individualRelationship/v2",
    GroupSubject: "groupSubject/v2",
    Comment: "comment/v2",
    CommentThread: "commentThread/v2",
    SubjectEntityApprovalStatus: "entityApprovalStatus/v2",
    EncounterEntityApprovalStatus: "entityApprovalStatus/v2",
    ProgramEncounterEntityApprovalStatus: "entityApprovalStatus/v2",
    ProgramEnrolmentEntityApprovalStatus: "entityApprovalStatus/v2",
    ChecklistItemEntityApprovalStatus: "entityApprovalStatus/v2",
    SubjectMigration: "subjectMigrations/v2",
    SubjectProgramEligibility: "subjectProgramEligibility/v2",
    Task: "task/v2",
    TaskUnAssignment: "taskUnAssignments/v2",
    UserSubjectAssignment: "userSubjectAssignment/v2",
    IdentifierAssignment: "identifierAssignment/v2",
    News: "news/v2",
    Session: "session/search/lastModified/v2",
    AttendanceRecord: "attendanceRecord/search/lastModified/v2",
};

export const noCountPullPath = (entityMetadata) => noCountPullPaths[entityMetadata.entityName];
