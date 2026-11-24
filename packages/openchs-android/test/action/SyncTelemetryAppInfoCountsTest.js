import {expect} from 'chai';
import {SyncTelemetryActions} from '../../src/action/SyncTelemetryActions';
import EntityService from '../../src/service/EntityService';

const contextOn = (db) => ({
    get: (service) => (service === EntityService
        ? {db, saveAndPushToEntityQueue: () => {}, getAll: () => []}
        : {})
});

const sqliteWith = (count) => ({isSqlite: true, execCountObservationsAndPoints: jest.fn(count)});

const startedWith = (appInfo) => {
    const state = SyncTelemetryActions.getInitialState();
    state.syncTelemetry.appInfo = JSON.stringify(appInfo);
    state.syncStarted = true;
    return state;
};

const appInfoAfter = (state, db) => JSON.parse(SyncTelemetryActions.syncCompleted(state, {}, contextOn(db)).syncTelemetry.appInfo);

describe('SyncTelemetryActions.syncCompleted app info counts', () => {
    it('on SQLite, records the observation and point counts read once the sync is over', () => {
        const db = sqliteWith(() => ({observations: 114, points: 6}));

        const appInfo = appInfoAfter(startedWith({dbSize: 5120, observationCount: null, pointCount: null}), db);

        expect(appInfo).to.include({dbSize: 5120, observationCount: 114, pointCount: 6, activeBackend: 'sqlite'});
    });

    it('on SQLite, replaces the Realm counts of a sync that moved the phone mid-way', () => {
        const db = sqliteWith(() => ({observations: 104, points: 0}));

        const appInfo = appInfoAfter(startedWith({observationCount: 130, pointCount: 0}), db);

        expect(appInfo).to.include({observationCount: 104, activeBackend: 'sqlite'});
    });

    it('on SQLite, records null rather than 0 when the counts cannot be read, so it is not taken for an empty phone', () => {
        const db = sqliteWith(() => { throw new Error('malformed'); });

        const appInfo = appInfoAfter(startedWith({dbSize: 5120, observationCount: null, pointCount: null}), db);

        expect(appInfo).to.include({dbSize: 5120, observationCount: null, pointCount: null, activeBackend: 'sqlite'});
    });

    it('on Realm, keeps the counts taken at the start', () => {
        const appInfo = appInfoAfter(startedWith({observationCount: 7, pointCount: 2}), {});

        expect(appInfo).to.include({observationCount: 7, pointCount: 2, activeBackend: 'realm'});
    });
});
