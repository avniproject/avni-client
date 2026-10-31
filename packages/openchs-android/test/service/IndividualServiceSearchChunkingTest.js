/**
 * avni-client#2110: IndividualService.search chunks the matched UUIDs into 500s and queries
 * each chunk. The slice end was `((chunk+1)*chunkSize) - 1`, and _.slice's end is exclusive,
 * so the last UUID of every chunk was never queried and those subjects vanished from search
 * results. Fix: slice end is `(chunk+1)*chunkSize`.
 *
 * Drives the real search() with a fake repository whose filtered(query, ...uuids) echoes back
 * exactly the UUIDs it was handed. So any UUID the slice drops never comes back — which is the
 * bug — and the assertion is simply "every input UUID is in the result".
 *
 *   npx jest --selectProjects unit --testPathPattern IndividualServiceSearchChunking
 */
import IndividualService from '../../src/service/IndividualService';

function fakeThis(store) {
    const chunkResult = (uuids) => ({asArray: () => uuids.map(u => store[u])});
    const baseResult = {filtered: (_query, ...uuids) => chunkResult(uuids)};
    const afterFilter = {sorted: () => baseResult};
    const base = {filtered: () => afterFilter};   // no withHydration -> used as-is
    return {repository: {findAll: () => base}};
}

const criteria = {
    getFilterCriteria: () => 'voided = false',   // non-empty -> reaches the chunking branch
    getMinDateOfBirth: () => null,
    getMaxDateOfBirth: () => null,
};

function run(count) {
    const uuids = Array.from({length: count}, (_v, i) => `uuid-${String(i).padStart(5, '0')}`);
    const store = Object.fromEntries(uuids.map(u => [u, {uuid: u, name: u}]));
    const results = IndividualService.prototype.search.call(fakeThis(store), criteria, uuids);
    return {uuids, got: new Set(results.map(r => r.uuid))};
}

describe('IndividualService.search chunking returns every matched subject (#2110)', () => {
    // 500 = one exact chunk (old bug dropped index 499);
    // 501 = spills into a second chunk; 1000 = two exact chunks (dropped 499 and 999);
    // 1234 = two full chunks + a partial.
    it.each([1, 499, 500, 501, 999, 1000, 1001, 1234])('returns all %i matched subjects', (count) => {
        const {uuids, got} = run(count);
        expect(got.size).toBe(count);
        const missing = uuids.filter(u => !got.has(u));
        expect(missing).toEqual([]);
    });
});
