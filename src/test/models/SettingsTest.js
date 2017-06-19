import _ from 'lodash';
import {expect} from 'chai';
import Settings from "../../js/models/Settings";

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
        expect(validationResult.hasNoValidationError()).to.be.false;


        validationResult = _.merge(settings, {catchment: 'a'}).validate();
        expect(validationResult.hasNoValidationError()).to.be.true;
        console.log(validationResult.resultFor('catchment'));
        expect(validationResult.resultFor('catchment').success).to.be.false;
        expect(validationResult.resultFor('logLevel').success).to.be.true;
        expect(validationResult.resultFor('serverURL').success).to.be.true;

    });
});