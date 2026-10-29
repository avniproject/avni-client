/**
 * #2196 — launch runs every init() on Realm and then moves to the committed backend. After
 * the move, the real MessageService and RuleService must hold the committed backend's
 * translations and shared rules, not what they read from Realm at boot.
 *
 * Run: npx jest test/service/LaunchReloadsFromCommittedBackendTest.js --selectProjects unit
 */

// The @Service decorator needs a no-op so the modules load outside the app container.
jest.mock('../../src/framework/bean/Service', () => () => (target) => target);
jest.mock('../../src/utility/General', () => ({
    __esModule: true,
    default: {logInfo: jest.fn(), logWarn: jest.fn(), logError: jest.fn(), logDebug: jest.fn()},
}));
jest.mock('../../src/framework/errorHandling/ErrorUtil', () => ({
    __esModule: true,
    default: {notifyBugsnag: jest.fn()},
}));

// Stands in for BeanRegistry.updateDatabase: the switch changes which database every
// repository reads, and reruns nothing.
let mockActive;
const mockGlobalContext = {
    getActiveBackend: () => mockActive,
    switchBackend: (backend) => { mockActive = backend; },
    openSqliteIfMissing: jest.fn(async () => true),
    openRealmIfMissing: jest.fn(async () => true),
};
jest.mock('../../src/GlobalContext', () => ({
    __esModule: true,
    default: {getInstance: () => mockGlobalContext},
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const MessageService = require('../../src/service/MessageService').default;
const RuleService = require('../../src/service/RuleService').default;
const UserInfoService = require('../../src/service/UserInfoService').default;
const MediaService = require('../../src/service/MediaService').default;
const SqliteMigrationService = require('../../src/service/SqliteMigrationService').default;
const SessionUsername = require('../../src/service/SessionUsername').default;

const translations = (language, values) => ({language, getTranslations: () => values});

// What each database holds for a user moved from Realm: Realm kept the day-of-move copy,
// SQLite has what the server sent since.
const databases = {
    realm: {
        PlatformTranslation: [translations('en', {logout: 'Logout'})],
        Translation: [],
        RuleDependency: [{code: "rulesConfig = {bundle: 'realm'}"}],
    },
    sqlite: {
        PlatformTranslation: [translations('en', {logout: 'Logout', clinicSharing: 'Clinic sharing'})],
        Translation: [translations('en', {logout: 'Logout (changed)'})],
        RuleDependency: [{code: "rulesConfig = {bundle: 'sqlite'}"}],
    },
};

function launch() {
    mockActive = 'realm';
    const services = new Map();
    const context = {
        getService: (key) => services.get(key),
        getRepositoryFactory: () => ({
            getRepository: (schema) => ({findAll: () => [...(databases[mockActive][schema] || [])]}),
        }),
    };
    const userInfoService = {getUserSettings: () => ({locale: 'en'}), getUserInfo: () => ({username: 'anjali@phulwari'})};
    const messageService = new MessageService(null, context);
    const ruleService = new RuleService(null, context);
    const migrationService = new SqliteMigrationService(null, context);
    [[UserInfoService, 'userInfoService', userInfoService],
        [MediaService, 'mediaService', {}],
        [MessageService, 'messageService', messageService],
        [RuleService, 'ruleService', ruleService],
        [null, 'ruleEvaluationService', {init: jest.fn()}],
    ].forEach(([cls, name, bean]) => {
        if (cls) services.set(cls, bean);
        services.set(name, bean);
    });
    // The bean registry boots on Realm.
    messageService.init();
    ruleService.init();
    return {messageService, ruleService, migrationService};
}

describe('launch reloads labels and shared rules from the committed backend (#2196)', () => {
    beforeEach(async () => {
        await AsyncStorage.clear();
        await SessionUsername.set('anjali@phulwari');
    });

    it('serves SQLite translations and rules after moving a SQLite user off the Realm boot', async () => {
        await SqliteMigrationService.persistStateForUser('anjali@phulwari', {activeBackend: 'sqlite', desiredBackend: 'sqlite'});
        const {messageService, ruleService, migrationService} = launch();
        expect(messageService.getI18n().t('logout')).toBe('Logout');

        await migrationService.openCommittedBackend();

        expect(mockActive).toBe('sqlite');
        expect(messageService.getI18n().t('logout')).toBe('Logout (changed)');
        expect(messageService.getI18n().t('clinicSharing')).toBe('Clinic sharing');
        expect(ruleService.allRules).toEqual({bundle: 'sqlite'});
    });

    it('leaves a Realm user on what the Realm boot loaded', async () => {
        await SqliteMigrationService.persistStateForUser('anjali@phulwari', {activeBackend: 'realm', desiredBackend: 'realm'});
        const {messageService, ruleService, migrationService} = launch();

        await migrationService.openCommittedBackend();

        expect(mockActive).toBe('realm');
        expect(messageService.getI18n().t('logout')).toBe('Logout');
        expect(ruleService.allRules).toEqual({bundle: 'realm'});
    });
});
