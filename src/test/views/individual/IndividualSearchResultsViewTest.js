import {Text} from 'react-native';
import React from 'react';
import {expect} from 'chai';
import {shallow} from 'enzyme';
import IndividualSearchResultsView from '../../../js/views/individual/IndividualSearchResultsView';
import TestContext from "../testframework/TestContext";

describe('IndividualSearchResultsViewTest', () => {
    it('no results', () => {
        const context = new TestContext();
        console.log(context);
        const wrapper = shallow(<IndividualSearchResultsView params=
                                                        {{
                                                            searchResults: []
                                                        }}/>, {context});
        expect(wrapper.containsMatchingElement(<Text>zeroNumberOfResults</Text>)).to.equal(true);
    });
});