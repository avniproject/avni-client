// The eight record commands on every Custom Design Card page: the app side's handlers in the command service's map,
// the page side's lines in the script the page's WebView gets, and their messages in English.
jest.mock("../../../src/utility/CHSNavigator", () => ({
    __esModule: true,
    default: {navigateToProgramEnrolmentDashboardView: jest.fn()},
}));
jest.mock("../../../src/utility/Analytics", () => ({logEvent: jest.fn(), firebaseEvents: {}}));
jest.mock("../../../src/utility/bugsnag", () => ({__esModule: true, default: {notify: jest.fn()}}));

import english from "../../../translations/en.json";
import CHSNavigator from "../../../src/utility/CHSNavigator";
import CustomCardCommandService, {COMMANDS} from "../../../src/service/customDashboard/CustomCardCommandService";
import {MessageKeys, RECORD_COMMANDS} from "../../../src/service/customDashboard/CustomCardRecordCommands";
import {buildCustomCardPageScript, PAGE_COMMAND_DEFINITIONS} from "../../../src/views/customDashboard/CustomCardPageScript";
import {RECORD_PAGE_COMMAND_DEFINITIONS} from "../../../src/views/customDashboard/RecordCommandPageDefinitions";
import {fakePage, servicesFor, subject, visit} from "./RecordCommandFixture";

const EIGHT_COMMANDS = ['openSubject', 'openEnrolment', 'openVisit', 'editRegistration', 'editEnrolment', 'editExit', 'editVisit', 'startVisit'];

// A card page's own token, which its script puts on every command.
const PAGE_TOKEN = "0b7e4c1a-5d2f-4a8e-9c3b-7f6a1d2e8b40";

// The script a card page's WebView gets: buildCustomCardPageScript(PAGE_COMMAND_DEFINITIONS, token), built with that
// page's token. It runs here on fakes of the page's window, document and console, as CustomCardPageScriptTest runs it.
const runCardPage = () => {
    const listeners = [];
    const document = {addEventListener: (type, fn, capture) => listeners.push({type, fn, capture})};
    const posted = [];
    const window = {ReactNativeWebView: {postMessage: (m) => posted.push(m)}};
    const console = {warn: jest.fn()};
    new Function("window", "document", "console", buildCustomCardPageScript(PAGE_COMMAND_DEFINITIONS, PAGE_TOKEN))(window, document, console);
    const fire = (type) => listeners.filter((l) => l.type === type).forEach((l) => l.fn({type}));
    return {window, posted, console, fire};
};

describe("record commands on the card page", () => {
    beforeEach(() => jest.clearAllMocks());

    it("the record commands are the eight the card names", () => {
        expect(Object.keys(RECORD_COMMANDS).sort()).toEqual([...EIGHT_COMMANDS].sort());
    });

    it.each(EIGHT_COMMANDS)("%s is in the command service's map, as the record command", (name) => {
        expect(Object.prototype.hasOwnProperty.call(COMMANDS, name)).toBe(true);
        expect(COMMANDS[name]).toEqual(expect.any(Function));
        expect(COMMANDS[name]).toBe(RECORD_COMMANDS[name]);
    });

    it("the service hands a page's openVisit to the openVisit command, with itself, the args and the page", () => {
        const service = new CustomCardCommandService({}, {});
        const getService = servicesFor({
            records: {Individual: {s1: subject('s1')}, Encounter: {v1: visit('v1', {subjectUuid: 's1'})}},
            rights: {'View subject': ['st1']},
        });
        service.getService = getService;
        const page = fakePage();

        expect(service.dispatch({avniCommand: 'openVisit', args: {visitUUID: 'v1'}}, page)).toBe(true);

        expect(getService.entityService.findByUUID).toHaveBeenCalledWith('v1', 'Encounter');
        expect(page.showMessage).not.toHaveBeenCalled();
        expect(page.navigate).toHaveBeenCalledTimes(1);
        // A general visit opens its subject's dashboard on the general tab.
        expect(CHSNavigator.navigateToProgramEnrolmentDashboardView).toHaveBeenCalledTimes(1);
        expect(CHSNavigator.navigateToProgramEnrolmentDashboardView).toHaveBeenCalledWith(page.view, 's1', null, false, null, null, 3);
    });

    it("every record line is in the card page's command lines", () => {
        expect(RECORD_PAGE_COMMAND_DEFINITIONS).toHaveLength(8);
        expect(PAGE_COMMAND_DEFINITIONS).toEqual(expect.arrayContaining(RECORD_PAGE_COMMAND_DEFINITIONS));
    });

    it.each(Object.entries(MessageKeys))("the %s message, %s, is in English", (name, key) => {
        expect(Object.prototype.hasOwnProperty.call(english.translations, key)).toBe(true);
        expect(english.translations[key]).toEqual(expect.any(String));
        expect(english.translations[key].trim()).not.toBe('');
    });

    it("the not-available message reads as the card's decision has it", () => {
        expect(english.translations.customCardActionNotAvailable).toBe("This action is not available for this record");
    });

    it("the card page's script defines all eight commands on avni", () => {
        const {window} = runCardPage();
        expect(Object.keys(window.avni)).toEqual(expect.arrayContaining(EIGHT_COMMANDS));
    });

    it("the page's editVisit posts nothing before a touch", () => {
        const {window, posted, console} = runCardPage();
        window.avni.editVisit('v1');
        expect(posted).toEqual([]);
        expect(console.warn).toHaveBeenCalledWith("avni: editVisit ignored, the page has not been touched yet");
    });

    it.each(["touchstart", "click"])("the page's editVisit posts exactly its command after a %s", (type) => {
        const {window, posted, fire} = runCardPage();
        window.avni.editVisit('v1');
        expect(posted).toEqual([]);
        fire(type);
        window.avni.editVisit('v1');
        expect(posted).toEqual([`{"avniCommand":"editVisit","args":{"visitUUID":"v1"},"token":"${PAGE_TOKEN}"}`]);
    });
});
