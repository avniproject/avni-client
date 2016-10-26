import {Text, ListView} from 'react-native';
import React from 'react';
import {expect} from 'chai';
import {shallow} from 'enzyme';
import IndividualSearchResultsView from '../../../js/views/individual/IndividualSearchResultsView';
import TestContext from "../testframework/TestContext";
import Individual from "../../../js/models/Individual";
import AddressLevel from "../../../js/models/AddressLevel";
import moment from "moment";

describe('IndividualSearchResultsViewTest', () => {
    const context = new TestContext();

    it('no results', () => {
        const wrapper = shallow(<IndividualSearchResultsView params=
                                                        {{
                                                            searchResults: []
                                                        }}/>, {context});
        expect(wrapper.containsMatchingElement(<Text>zeroNumberOfResults</Text>)).to.equal(true, wrapper.debug());
    });

    it('some results', () => {
        const wrapper = shallow(<IndividualSearchResultsView params=
                                                                 {{
                                                                     searchResults: [Individual.create("chandan", moment().subtract(5, 'years').toDate(), "Male", AddressLevel.create("Jinjgaon", 1))]
                                                                 }}/>, {context});
        expect(wrapper.containsMatchingElement(<Text>zeroNumberOfResults</Text>)).to.equal(false, wrapper.debug());
    });
});