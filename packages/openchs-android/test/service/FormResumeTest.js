import AsyncStorage from "@react-native-async-storage/async-storage";
import FormResume, {FormResumeType, RESUME_WINDOW_MINUTES} from "../../src/service/draft/FormResume";
import SessionUsername from "../../src/service/SessionUsername";

describe("FormResume", () => {
    const minutes = (n) => n * 60 * 1000;
    const closedAt = 1_700_000_000_000;

    beforeEach(async () => {
        await AsyncStorage.clear();
        await SessionUsername.set("worker@org");
    });

    it("resumes the form within the window", async () => {
        await FormResume.remember(FormResumeType.Encounter, "draft-1", 2, closedAt);
        expect(await FormResume.take(closedAt + minutes(RESUME_WINDOW_MINUTES - 1))).toMatchObject({type: FormResumeType.Encounter, draftUUID: "draft-1", pageNumber: 2});
    });

    it("opens the home screen once the window has passed, and drops the note", async () => {
        await FormResume.remember(FormResumeType.Encounter, "draft-1", 2, closedAt);
        expect(await FormResume.take(closedAt + minutes(RESUME_WINDOW_MINUTES + 1))).toBeNull();
        expect(await FormResume.take(closedAt)).toBeNull();
    });

    it("keeps the first close time when a resumed form is closed again", async () => {
        await FormResume.remember(FormResumeType.Encounter, "draft-1", 2, closedAt);
        await FormResume.take(closedAt + minutes(1));
        await FormResume.resumedFormOpened();
        await FormResume.remember(FormResumeType.Encounter, "draft-1", 3, closedAt + minutes(50));
        expect(await FormResume.take(closedAt + minutes(RESUME_WINDOW_MINUTES + 1))).toBeNull();
    });

    it("starts a new clock for a different form", async () => {
        await FormResume.remember(FormResumeType.Encounter, "draft-1", 2, closedAt);
        await FormResume.remember(FormResumeType.ProgramEnrolment, "draft-2", 1, closedAt + minutes(50));
        expect(await FormResume.take(closedAt + minutes(RESUME_WINDOW_MINUTES + 1))).toMatchObject({draftUUID: "draft-2"});
    });

    it("leaves the note in place so a resume that Android closes again can resume again", async () => {
        await FormResume.remember(FormResumeType.Encounter, "draft-1", 2, closedAt);
        await FormResume.take(closedAt + minutes(1));
        await FormResume.resumedFormOpened();
        expect(await FormResume.take(closedAt + minutes(2))).toMatchObject({draftUUID: "draft-1"});
    });

    it("gives up after three starts in a row where the resumed form never opened", async () => {
        await FormResume.remember(FormResumeType.Encounter, "draft-1", 2, closedAt);
        for (let i = 1; i <= 3; i++) expect(await FormResume.take(closedAt + minutes(i))).not.toBeNull();
        expect(await FormResume.take(closedAt + minutes(4))).toBeNull();
    });

    it("does not resume another user's form", async () => {
        await FormResume.remember(FormResumeType.Encounter, "draft-1", 2, closedAt);
        await SessionUsername.set("someone-else@org");
        expect(await FormResume.take(closedAt + minutes(1))).toBeNull();
    });

    it("forgets the form", async () => {
        await FormResume.remember(FormResumeType.Encounter, "draft-1", 2, closedAt);
        await FormResume.forget();
        expect(await FormResume.take(closedAt + minutes(1))).toBeNull();
    });
});
