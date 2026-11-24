// StaticMenuItemFactory only wires these views into StaticMenuItem instances; it never
// reaches into them. Stub them out so the test doesn't drag in their heavy (and
// native-module-laden) import trees.
jest.mock('../../../src/views/familyfolder/FamilyFolderView', () => ({__esModule: true, default: () => null}));
jest.mock('../../../src/views/videos/VideoListView', () => ({__esModule: true, default: () => null}));
jest.mock('../../../src/views/beneficiaryMode/BeneficiaryModeStartView', () => ({__esModule: true, default: () => null}));
jest.mock('../../../src/views/entitysyncstatus/EntitySyncStatusView', () => ({__esModule: true, default: () => null}));
jest.mock('../../../src/views/settings/DevSettingsView', () => ({__esModule: true, default: () => null}));
jest.mock('../../../src/views/customDashboard/CustomDashboardView', () => ({__esModule: true, default: () => null}));

// beanRegistry must exist at require time: importing StaticMenuItemFactory pulls in
// @Service-decorated modules that call GlobalContext.getInstance().beanRegistry.register()
// synchronously at import time, before beforeEach runs.
let mockGlobalContext = {
    beanRegistry: {register: jest.fn()},
};

jest.mock('../../../src/GlobalContext', () => ({
    __esModule: true,
    default: {getInstance: () => mockGlobalContext},
}));

const StaticMenuItemFactory = require('../../../src/views/menu/StaticMenuItemFactory').default;
const OrganisationConfigService = require('../../../src/service/OrganisationConfigService').default;

function contextWithEncryption(encrypted) {
    return {
        getService: (type) => {
            if (type === OrganisationConfigService) return {isDbEncryptionEnabled: () => encrypted};
            throw new Error(`unexpected service ${String(type)}`);
        }
    };
}

const names = (context) => StaticMenuItemFactory.getSyncMenus(context).map(item => item.uniqueName);

describe('StaticMenuItemFactory.getSyncMenus', () => {
    beforeEach(() => {
        mockGlobalContext = {
            beanRegistry: {register: jest.fn()},
            getActiveBackend: () => {
                throw new Error('getSyncMenus must not depend on the active backend');
            }
        };
    });

    it('offers fast sync setup without consulting the backend', () => {
        expect(names(contextWithEncryption(false))).toContain('uploadCatchmentDatabase');
    });

    it('hides fast sync setup under DB encryption', () => {
        expect(names(contextWithEncryption(true))).not.toContain('uploadCatchmentDatabase');
    });

    it('keeps entitySyncStatus regardless of encryption', () => {
        expect(names(contextWithEncryption(true))).toContain('entitySyncStatus');
        expect(names(contextWithEncryption(false))).toContain('entitySyncStatus');
    });
});
