import {expect} from 'chai';
import EntityMetaData from "../src/EntityMetaData";
import Settings from "../src/Settings";
import Individual from "../src/Individual";

describe('EntitiesMetaDataTest', () => {
    it('entitiesLoadedFromServer', () => {
        var entitiesLoadedFromServer = EntityMetaData.entitiesLoadedFromServer();
        expect(entitiesLoadedFromServer).to.not.include.members([Settings, Individual]);
    });
});