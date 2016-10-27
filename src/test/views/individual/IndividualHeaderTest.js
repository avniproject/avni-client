import React from 'react';
import {Text} from 'react-native';
import {expect} from 'chai';
import {shallow} from 'enzyme';
import IndividualHeader from "../../../js/views/individual/IndividualHeader";
import Individual from "../../../js/models/Individual";
import moment from "moment";
import AddressLevel from "../../../js/models/AddressLevel";

describe('IndividualHeaderTest', () => {
    it('view', () => {
        var maya = Individual.create("maya", moment().subtract(5, 'years').toDate(), "Male", AddressLevel.create("Nijhma", 1));
        const wrapper = shallow(<IndividualHeader individual=
                                                      {
                                                          maya
                                                      }/>);
        expect(wrapper.containsMatchingElement(<Text>Nijhma</Text>)).to.equal(true, wrapper.debug());
    });
});