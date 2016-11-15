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
        var maya = Individual.newInstance("d5b08dab-0974-4871-8962-ac644de0b489", "maya", moment().subtract(5, 'years').toDate(), false, "Male", AddressLevel.create("c85dc72b-5e17-41ac-a726-15548022b62b", "Nijhma", 1));
        const wrapper = shallow(<IndividualHeader individual=
                                                      {
                                                          maya
                                                      }/>);
        expect(wrapper.containsMatchingElement(<Text>Nijhma</Text>)).to.equal(true, wrapper.debug());
    });
});