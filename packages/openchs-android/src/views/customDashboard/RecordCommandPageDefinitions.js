// Page-side lines for the record commands, one per command. `avni` and `send` are in scope where they run.
export const RECORD_PAGE_COMMAND_DEFINITIONS = [
    "avni.openSubject = function (subjectUUID, tab) { send('openSubject', {subjectUUID: subjectUUID, tab: tab}); };",
    "avni.openEnrolment = function (enrolmentUUID) { send('openEnrolment', {enrolmentUUID: enrolmentUUID}); };",
    "avni.openVisit = function (visitUUID) { send('openVisit', {visitUUID: visitUUID}); };",
    "avni.editRegistration = function (subjectUUID) { send('editRegistration', {subjectUUID: subjectUUID}); };",
    "avni.editEnrolment = function (enrolmentUUID) { send('editEnrolment', {enrolmentUUID: enrolmentUUID}); };",
    "avni.editExit = function (enrolmentUUID) { send('editExit', {enrolmentUUID: enrolmentUUID}); };",
];
