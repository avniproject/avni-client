import StubbedBaseService from "./StubbedBaseService";
import _ from "lodash";

class StubbedDraftEnrolmentService extends StubbedBaseService {
    findByIndividualAndProgram(individual, program) {
        const draft = _.get(this.serviceData, 'draftEnrolment');
        if (_.isNil(draft) || _.isNil(individual) || _.isNil(program)) return null;
        return draft.individual.uuid === individual.uuid && draft.program.uuid === program.uuid ? draft : null;
    }

    deleteDraftByUUID() {}

    saveDraft(enrolment) {
        return enrolment;
    }
}

export default StubbedDraftEnrolmentService;
