import _ from 'lodash';
import {assert} from 'chai';
import Settings from "../src/Settings";

describe('Settings', () => {
    it('validates against bad values in Settings', () => {
        const settings = new Settings();
        Object.assign(settings, {
            uuid: '54bee5ab-3b5b-43ce-872e-5036a26d8751',
            serverURL: 'http://localhost:8000',
            catchment: 1,
            logLevel: 1,
            locale: 'en',
        });

        let validationResult = settings.validate();
        assert.isFalse(validationResult.hasValidationError());


        validationResult = _.merge(settings, {catchment: 'a'}).validate();
        assert.isTrue(validationResult.hasValidationError());
        console.log(validationResult.resultFor('catchment'));
        assert.isFalse(validationResult.resultFor('catchment').success);
        assert.isTrue(validationResult.resultFor('logLevel').success);
        assert.isTrue(validationResult.resultFor('serverURL').success);

    });
});