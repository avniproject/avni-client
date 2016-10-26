import {Text} from 'react-native';
import React from 'react';
import {expect} from 'chai';
import {shallow} from 'enzyme';
import TestContext from "../testframework/TestContext";
import IndividualEncounterView from "../../../js/views/individual/IndividualEncounterView";
import Individual from "../../../js/models/Individual";
import moment from "moment";
import AddressLevel from "../../../js/models/AddressLevel";

describe('IndividualEncounterViewTest', () => {
    const context = new TestContext();

    it('open default consultation without program', () => {
        var maya = Individual.create("maya", moment().subtract(5, 'years').toDate(), "Male", AddressLevel.create("Nijhma", 1));
        const wrapper = shallow(<IndividualEncounterView params=
                                                                 {{
                                                                     individual: {maya}
                                                                 }}/>, {context});
    });
});