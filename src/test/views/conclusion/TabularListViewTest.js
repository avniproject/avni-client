import React from 'react';
import {View, ListView, TouchableHighlight} from 'react-native';
import {shallow} from 'enzyme';
import {expect} from 'chai';
import TabularListView from '../../../js/views/common/TabularListView';
import TestContext from "../testframework/TestContext";

describe('Tabular List View Test', () => {
    const context = new TestContext();

    it('Should not render blank view if data is empty array', () => {
        const wrapper = shallow(<TabularListView data={[]} message={"none"}/>, {context});
        expect(wrapper.equals(<View/>)).to.be.true;
    });

    it('Should be clickable if handleCLick is passed', () => {
        var expected = 1;
        const wrapper = shallow(<TabularListView handleClick={(index)=> expected = index}
                                                 data={[{key: "Weight", value: 12}, {key: "Heigh", value: 122}]}
                                                 message={"Section Header"}/>, {context});
        expect(wrapper.find(ListView)).to.have.length(1);
        expect(wrapper.instance().clickable()).to.be.true;

    });

    it('Should render section header and data if data exists', () => {
        const wrapper = shallow(<TabularListView data={[{key: "Weight", value: 12}, {key: "Heigh", value: 122}]}
                                                 message={"Section Header"}/>, {context});
        expect(wrapper.find(ListView)).to.have.length(1);
        expect(wrapper.instance().clickable()).to.be.false;
    });
});