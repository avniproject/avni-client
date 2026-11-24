let mockListener;
jest.mock('react-native', () => ({
    AppState: {addEventListener: jest.fn((event, handler) => { mockListener = handler; return {remove: jest.fn()}; })}
}));
jest.mock('../../../src/utility/General', () => ({logError: jest.fn()}));

import BackgroundDraftSaver from "../../../src/views/common/BackgroundDraftSaver";
import General from "../../../src/utility/General";

describe("BackgroundDraftSaver", () => {
    const viewWith = (loaded) => ({isDataLoaded: () => loaded, dispatchAction: jest.fn()});

    beforeEach(() => jest.clearAllMocks());

    it("saves when the app goes to the background after the form has loaded", () => {
        const view = viewWith(true);
        new BackgroundDraftSaver(view, "ON_APP_BACKGROUND").start();
        mockListener('background');
        expect(view.dispatchAction).toHaveBeenCalledWith("ON_APP_BACKGROUND", {});
    });

    it("does not save while the form is still loading, when the screen still holds the previous form", () => {
        const view = viewWith(false);
        new BackgroundDraftSaver(view, "ON_APP_BACKGROUND").start();
        mockListener('background');
        expect(view.dispatchAction).not.toHaveBeenCalled();
    });

    it("does nothing when the app comes back to the front", () => {
        const view = viewWith(true);
        new BackgroundDraftSaver(view, "ON_APP_BACKGROUND").start();
        mockListener('active');
        expect(view.dispatchAction).not.toHaveBeenCalled();
    });

    it("logs and swallows an error from the save", () => {
        const view = viewWith(true);
        view.dispatchAction.mockImplementation(() => { throw new Error("boom"); });
        new BackgroundDraftSaver(view, "ON_APP_BACKGROUND").start();
        expect(() => mockListener('background')).not.toThrow();
        expect(General.logError).toHaveBeenCalled();
    });
});
