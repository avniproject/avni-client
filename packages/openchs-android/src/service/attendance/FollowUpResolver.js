import {EncounterType} from "avni-models";
import FormMappingService from "../FormMappingService";
import IndividualService from "../IndividualService";
import ProgramEnrolmentService from "../ProgramEnrolmentService";
import EntityService from "../EntityService";

// Pure preflight — no Realm writes. Returns the args needed to call
// Session.autoCreateFollowUps, or null if the AttendanceType doesn't configure
// follow-ups (or its referenced EncounterType has been voided/never synced).
// The caller passes context.get(...) so this stays test-friendly.
//
// `studentSubjectType` drives FormMapping resolution. studentLookup filters out
// students whose subject type doesn't match — protecting heterogeneous groups
// from cross-type follow-ups (mismatched students simply get no auto follow-up).
export function resolveFollowUps({attendanceType, studentSubjectType, context}) {
    const encTypeUuid = attendanceType.getFollowUpEncounterTypeUUID();
    if (!encTypeUuid) return null;

    const encounterType = context.get(EntityService).findByUUID(encTypeUuid, EncounterType.schema.name);
    if (!encounterType) return null;

    const formMappingService = context.get(FormMappingService);
    const individualService = context.get(IndividualService);
    const programEnrolmentService = context.get(ProgramEnrolmentService);

    const programUUID = formMappingService.findProgramUUIDForEncounterType(encounterType, studentSubjectType);
    const studentSubjectTypeUUID = studentSubjectType && studentSubjectType.uuid;

    return {
        encounterType,
        programUUID,
        studentLookup: (uuid) => {
            const individual = individualService.findByUUID(uuid);
            if (!individual) return null;
            const subjectType = individual.subjectType;
            if (!subjectType || subjectType.uuid !== studentSubjectTypeUUID) return null;
            return individual;
        },
        enrolmentLookup: programUUID
            ? (student) => programEnrolmentService.getEnrolmentBySubjectUuidAndProgramUuid(student.uuid, programUUID)
            : undefined,
    };
}
