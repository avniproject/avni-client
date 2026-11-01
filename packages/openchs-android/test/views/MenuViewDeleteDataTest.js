/**
 * Delete Data says how many records have not been synced before it wipes the database.
 *
 * Run: npx jest --selectProjects unit --testPathPattern MenuViewDeleteDataTest
 */
jest.mock('react-native-randombytes', () => ({randomBytes: () => new Uint8Array(16)}));
jest.mock('react-native-zip-archive', () => ({zip: jest.fn(), unzip: jest.fn(), subscribe: jest.fn(() => ({remove: jest.fn()}))}));
jest.mock('react-native-keychain', () => ({
    getGenericPassword: jest.fn(async () => false), setGenericPassword: jest.fn(async () => {}), resetGenericPassword: jest.fn(async () => {}),
}));
jest.mock('react-native-geolocation-service', () => ({}));
jest.mock('react-native-tcp-socket', () => ({}));
jest.mock('react-native-background-timer', () => ({}));
jest.mock('react-native-keep-awake', () => ({__esModule: true, default: () => null}));
jest.mock('@react-native-documents/picker', () => ({}));
jest.mock('react-native-vision-camera', () => ({}));
jest.mock('@react-native-clipboard/clipboard', () => ({}));
jest.mock('react-native-share', () => ({}));
jest.mock('react-native-file-viewer', () => ({}));

import {Alert} from "react-native";
import MenuView from "../../src/views/MenuView";
import EntityQueueService from "../../src/service/EntityQueueService";
import I18n from "i18n-js";
import en from "../../translations/en.json";

function menu(pendingFieldDataCount) {
    const instance = Object.create(MenuView.prototype);
    instance._i18n = {t: (key, opts) => opts ? `${key} ${JSON.stringify(opts)}` : key};
    instance.context = {
        getService: (service) => {
            if (service === 'clinicSpokeService') return {isInCamp: async () => false};
            if (service === EntityQueueService) return {getPendingFieldDataCount: () => pendingFieldDataCount};
        }
    };
    instance.deleteData = jest.fn();
    return instance;
}

describe("Delete Data", () => {
    let alert;
    beforeEach(() => {
        alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    });
    afterEach(() => jest.restoreAllMocks());

    it("says how many records have not been synced, with Cancel first and Delete anyway deleting", async () => {
        const view = menu(14);

        await view.onDelete();

        const [title, message, buttons] = alert.mock.calls[0];
        expect(title).toEqual('deleteSchemaNoticeTitle');
        expect(message).toEqual('deleteSchemaUnsyncedRecordsMessage {"count":14}');
        expect(buttons.map(button => button.text)).toEqual(['cancel', 'deleteAnyway']);
        expect(buttons[0].style).toEqual('cancel');
        buttons[0].onPress();
        expect(view.deleteData).not.toHaveBeenCalled();
        buttons[1].onPress();
        expect(view.deleteData).toHaveBeenCalled();
    });

    it("keeps the usual confirmation when everything is synced", async () => {
        await menu(0).onDelete();

        const [title, message, buttons] = alert.mock.calls[0];
        expect(title).toEqual('deleteSchemaNoticeTitle');
        expect(message).toEqual('deleteSchemaConfirmationMessage');
        expect(buttons.map(button => button.text)).toEqual(['yes', 'no']);
    });

    it("reads correctly for a single unsynced record", async () => {
        I18n.translations = {en: en.translations};
        I18n.locale = 'en';
        const view = menu(1);
        view._i18n = I18n;

        await view.onDelete();

        expect(alert.mock.calls[0][1]).toEqual('Records not yet synced: 1. Deleting data will remove them permanently.');
    });
});
