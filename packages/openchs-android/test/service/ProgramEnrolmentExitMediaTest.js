/**
 * A photo or file on a programme exit form must be queued for upload, as on the enrolment form
 * and on visits; otherwise it stays a bare file name on the server and is lost with the phone.
 *
 * Run: npx jest --selectProjects unit --testPathPattern ProgramEnrolmentExitMediaTest
 */
jest.mock("../../src/framework/bean/Service", () => () => (target) => target);
jest.mock('react-native-randombytes', () => ({randomBytes: () => new Uint8Array(16)}));
jest.mock('react-native-zip-archive', () => ({zip: jest.fn(), unzip: jest.fn(), subscribe: jest.fn(() => ({remove: jest.fn()}))}));
jest.mock('react-native-keychain', () => ({
    getGenericPassword: jest.fn(async () => false), setGenericPassword: jest.fn(async () => {}), resetGenericPassword: jest.fn(async () => {}),
}));

import ProgramEnrolmentService from "../../src/service/ProgramEnrolmentService";
import MediaQueueService from "../../src/service/MediaQueueService";

describe('ProgramEnrolmentService.exit', () => {
    it("queues the exit form's photos and files for upload, inside the save", async () => {
        const addMediaToQueue = jest.fn();
        let inTransaction = false;
        const queuedInTransaction = [];
        addMediaToQueue.mockImplementation(() => queuedInTransaction.push(inTransaction));
        const service = Object.create(ProgramEnrolmentService.prototype);
        Object.defineProperty(service, 'transactionManager', {value: {write: (work) => { inTransaction = true; work(); inTransaction = false; }}});
        Object.defineProperty(service, 'repository', {value: {create: jest.fn()}});
        service.getRepository = () => ({create: jest.fn()});
        service.getUserInfo = () => ({});
        service.findByUUID = () => ({subjectType: {}});
        service.getService = (cls) => {
            if (cls === MediaQueueService) return {addMediaToQueue};
            if (cls && cls.name === 'FormMappingService') return {isApprovalEnabledForProgramForm: () => false};
            return {createPendingStatus: jest.fn(), addSubjectToGroup: () => jest.fn()};
        };
        const enrolment = {uuid: 'enrolment-1', individual: {uuid: 'p-1'}, program: {uuid: 'program-1'}, observations: [], programExitObservations: [], checklists: [], updateAudit: jest.fn()};

        service.exit(enrolment, true);

        expect(addMediaToQueue).toHaveBeenCalledWith(enrolment, 'ProgramEnrolment');
        expect(queuedInTransaction).toEqual([true]);
    });
});
