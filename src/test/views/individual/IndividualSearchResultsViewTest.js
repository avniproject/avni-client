import React from 'react';
import {expect} from 'chai';
import {shallow} from 'enzyme';
import IndividualSearchResultsView from '../../../js/views/individual/IndividualSearchResultsView';
import TestContext from "../testframework/TestContext";
import Individual from "../../../js/models/Individual";
import AddressLevel from "../../../js/models/AddressLevel";
import moment from "moment";
import {Container, Content, List, ListItem, Thumbnail, Grid, Row, Col, Text, Button} from 'native-base';

describe('IndividualSearchResultsViewTest', () => {
    const context = new TestContext();

    it('no results', () => {
        const wrapper = shallow(<IndividualSearchResultsView searchResults={[]}/>, {context});
        expect(wrapper.containsMatchingElement(<Text>zeroNumberOfResults</Text>)).to.equal(true, wrapper.debug());
    });

    it('some results', () => {
        const wrapper = shallow(<IndividualSearchResultsView searchResults={[Individual.newInstance('d5b08dab-0974-4871-8962-ac644de0b489', "chandan", moment().subtract(5, 'years').toDate(), false, "Male", AddressLevel.create("f65e1478-324e-41d7-a0c2-f2d9d780cf43", "Jinjgaon", 1))]}/>, {context});
        expect(wrapper.containsMatchingElement(<Text>zeroNumberOfResults</Text>)).to.equal(false, wrapper.debug());
    });
});