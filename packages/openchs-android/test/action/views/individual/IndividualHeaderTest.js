import React from 'react';
import {Text} from 'react-native';
import {expect} from 'chai';
import {shallow} from 'enzyme';
import {Individual, AddressLevel} from "openchs-models";
import moment from "moment";
import TestContext from "../testframework/TestContext";
import IndividualHeader from "../../../../src/views/individual/IndividualHeader";

describe('IndividualHeaderTest', () => {
    const context = new TestContext();

    it('view', () => {
        Individual.newInstance()
        var maya = Individual.newInstance("d5b08dab-0974-4871-8962-ac644de0b489", "maya", "rani", moment().subtract(5, 'years').toDate(), false, "Male", AddressLevel.create("c85dc72b-5e17-41ac-a726-15548022b62b", "Nijhma", 1));
        const wrapper = shallow(<IndividualHeader individual=
                                                      {
                                                          maya
                                                      }/>, {context});
        expect(wrapper.containsMatchingElement(<Text>Nijhma</Text>)).to.equal(true, wrapper.debug());
    });
});