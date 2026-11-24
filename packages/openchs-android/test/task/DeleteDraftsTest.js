import {expect} from "chai";
import moment from "moment";

const stubDraftService = (uuids, deleteMethodName) => {
    const filtered = jest.fn().mockReturnValue(uuids.map(uuid => ({uuid})));
    return {
        findAll: jest.fn().mockReturnValue({filtered}),
        filtered,
        [deleteMethodName]: jest.fn()
    };
};

const createDeleteDrafts = (drafts = {}) => {
    jest.resetModules();

    const services = {
        draftSubjectService: stubDraftService(drafts.subjects || [], 'deleteDraftSubjectByUUID'),
        draftEncounterService: stubDraftService(drafts.encounters || [], 'deleteDraftByUUID'),
        draftEnrolmentService: stubDraftService(drafts.enrolments || [], 'deleteDraftByUUID'),
        draftProgramEncounterService: stubDraftService(drafts.programEncounters || [], 'deleteDraftByUUID')
    };
    // The Realm handle: on a SQLite user it holds none of the drafts, so the job must not read it.
    const realm = {objects: jest.fn(), write: jest.fn()};
    const mockPostScheduledJobError = jest.fn();

    jest.doMock('../../src/GlobalContext', () => ({
        __esModule: true,
        default: {
            getInstance: jest.fn().mockReturnValue({
                isInitialised: jest.fn().mockReturnValue(true),
                db: realm,
                beanRegistry: {getService: jest.fn().mockImplementation(name => services[name])}
            })
        }
    }));
    jest.doMock('../../src/utility/ErrorHandler', () => ({
        __esModule: true,
        default: {postScheduledJobError: mockPostScheduledJobError}
    }));
    jest.doMock('../../src/utility/General', () => ({
        __esModule: true,
        default: {logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn()}
    }));

    jest.doMock('../../src/store/AppStore', () => ({__esModule: true, default: {}}));
    jest.doMock('../../src/framework/db/RealmFactory', () => ({__esModule: true, default: {}}));

    const DeleteDrafts = require('../../src/task/DeleteDrafts').default;
    return {DeleteDrafts, services, realm, mockPostScheduledJobError};
};

describe('DeleteDrafts', () => {
    it('deletes old drafts of every type through the active backend services', async () => {
        const {DeleteDrafts, services, realm, mockPostScheduledJobError} = createDeleteDrafts({
            subjects: ['s1'],
            encounters: ['e1', 'e2'],
            enrolments: ['en1'],
            programEncounters: ['pe1']
        });

        await DeleteDrafts.execute();

        expect(mockPostScheduledJobError.mock.calls).to.deep.equal([]);
        expect(realm.objects.mock.calls.length).to.equal(0);
        expect(services.draftSubjectService.deleteDraftSubjectByUUID.mock.calls).to.deep.equal([['s1']]);
        expect(services.draftEncounterService.deleteDraftByUUID.mock.calls).to.deep.equal([['e1'], ['e2']]);
        expect(services.draftEnrolmentService.deleteDraftByUUID.mock.calls).to.deep.equal([['en1']]);
        expect(services.draftProgramEncounterService.deleteDraftByUUID.mock.calls).to.deep.equal([['pe1']]);
    });

    it('selects drafts last updated on or before the end of the day 30 days ago', async () => {
        const {DeleteDrafts, services} = createDeleteDrafts();

        await DeleteDrafts.execute();

        const expectedCutoff = moment().subtract(30, 'days').endOf('day').toDate();
        Object.values(services).forEach(service => {
            const [query, cutoff] = service.filtered.mock.calls[0];
            expect(query).to.equal('updatedOn <= $0');
            expect(cutoff.getTime()).to.equal(expectedCutoff.getTime());
        });
    });

    it('keeps deleting the remaining drafts when one delete fails', async () => {
        const {DeleteDrafts, services, mockPostScheduledJobError} = createDeleteDrafts({
            encounters: ['e1', 'e2'],
            programEncounters: ['pe1']
        });
        services.draftEncounterService.deleteDraftByUUID.mockImplementationOnce(() => {
            throw new Error('boom');
        });

        await DeleteDrafts.execute();

        expect(services.draftEncounterService.deleteDraftByUUID.mock.calls).to.deep.equal([['e1'], ['e2']]);
        expect(services.draftProgramEncounterService.deleteDraftByUUID.mock.calls).to.deep.equal([['pe1']]);
        expect(mockPostScheduledJobError.mock.calls.length).to.equal(1);
    });
});
