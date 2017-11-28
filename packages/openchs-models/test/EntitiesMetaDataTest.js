import {assert} from 'chai';
import EntityMetaData from "../src/EntityMetaData";
import Settings from "../src/Settings";
import Individual from "../src/Individual";

describe('EntitiesMetaDataTest', () => {
    it('entitiesLoadedFromServer', () => {
        var entitiesLoadedFromServer = EntityMetaData.entitiesLoadedFromServer();
        assert.notIncludeMembers(entitiesLoadedFromServer, [Settings, Individual]);
    });
});