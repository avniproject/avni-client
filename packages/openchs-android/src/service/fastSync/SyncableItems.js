import {post} from '../../framework/http/requests';
import General from '../../utility/General';

/**
 * The set of {entityName, entityTypeUuid} pairs the calling user's own group privileges allow,
 * as the server computes it.
 *
 * Posting no entity sync statuses is what makes the answer an allowlist rather than a work list.
 * /v2/syncDetails merges the server's syncable set into the statuses it is given and then keeps
 * only the entries whose data has changed since their loadedSince — against a freshly restored
 * dump, whose checkpoints are the uploader's and recent, most of what this user may sync would be
 * missing from the reply. With nothing posted there is nothing to narrow it against.
 *
 * Read-only on the server, and answers null rather than throwing: a caller that cannot get the
 * list must leave the data alone, not fail.
 */
export async function fetchSyncableItems(serverURL) {
    try {
        const response = await post(`${serverURL}/v2/syncDetails?includeUserSubjectType=true`, [], true);
        const {syncDetails} = await response.json();
        return syncDetails;
    } catch (error) {
        General.logError('SyncableItems', `Could not read this user's syncable items: ${error.message}`);
        return null;
    }
}
