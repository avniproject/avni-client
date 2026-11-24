import moment from "moment";
import {SYNC_TIMESTAMP_FORMAT} from "../../src/service/EntitySyncStatusService";

describe("Entity Sync Status timestamp format", () => {
    // 21 Sep 2026, 14:37:42.993 — the minute (37) and month (09) differ, and the
    // milliseconds (993) would surface as ":99" under the wrong seconds token.
    const date = new Date(2026, 8, 21, 14, 37, 42, 993);

    it("renders the real minute and second", () => {
        expect(moment(date).format(SYNC_TIMESTAMP_FORMAT)).toBe("21-09-2026 14:37:42");
    });

    it("does not reprint the month in the minutes position", () => {
        const [, time] = moment(date).format(SYNC_TIMESTAMP_FORMAT).split(" ");
        expect(time.split(":")[1]).toBe("37");
    });

    it("keeps seconds within range for a timestamp with high milliseconds", () => {
        const seconds = Number(moment(date).format(SYNC_TIMESTAMP_FORMAT).split(":")[2]);
        expect(seconds).toBeLessThan(60);
    });
});
