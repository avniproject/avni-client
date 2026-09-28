/**
 * Where the restoring user's own allowlist of {entityName, entityTypeUuid} comes from, and what
 * it answers when the server cannot be reached.
 *
 * Run: yarn jest test/service/fastSync/SyncableItemsTest.js --selectProjects unit --verbose
 */

const mockPost = jest.fn();
jest.mock('../../../src/framework/http/requests', () => ({post: (...args) => mockPost(...args)}));
jest.mock('../../../src/utility/General', () => ({
    __esModule: true,
    default: {logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), logDebug: jest.fn()},
}));

const {fetchSyncableItems} = require('../../../src/service/fastSync/SyncableItems');

const responseOf = (body) => ({json: async () => body});

describe('fetching the syncable item list', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns the items the server names for this user', async () => {
        mockPost.mockResolvedValue(responseOf({
            syncDetails: [{entityName: 'Individual', entityTypeUuid: 'st-1'}],
            now: '2026-09-28T00:00:00.000Z',
        }));

        await expect(fetchSyncableItems('https://server'))
            .resolves.toEqual([{entityName: 'Individual', entityTypeUuid: 'st-1'}]);
    });

    /*
     * /v2/syncDetails merges the server's syncable set into the statuses posted with the request
     * and then drops every entry whose data has not changed since its loadedSince. Posting the
     * restored dump's own checkpoints would therefore answer with a subset of what this user may
     * sync, and everything missing from it would be read here as forbidden.
     */
    it('posts no entity sync statuses, so the answer is not narrowed to what has changed', async () => {
        mockPost.mockResolvedValue(responseOf({syncDetails: []}));

        await fetchSyncableItems('https://server');

        const [url, body] = mockPost.mock.calls[0];
        expect(url).toMatch(/\/v2\/syncDetails\?/);
        expect(body).toEqual([]);
    });

    it('asks for the user subject type too, as a sync does', async () => {
        mockPost.mockResolvedValue(responseOf({syncDetails: []}));

        await fetchSyncableItems('https://server');

        expect(mockPost.mock.calls[0][0]).toContain('includeUserSubjectType=true');
    });

    it('answers with nothing when the request fails', async () => {
        mockPost.mockRejectedValue(new Error('offline'));

        await expect(fetchSyncableItems('https://server')).resolves.toBeNull();
    });

    it('answers with nothing when the response body cannot be read', async () => {
        mockPost.mockResolvedValue({json: async () => { throw new Error('not json'); }});

        await expect(fetchSyncableItems('https://server')).resolves.toBeNull();
    });
});
