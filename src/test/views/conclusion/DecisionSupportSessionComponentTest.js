import React from 'react';
import {View, ListView} from 'react-native';
import {shallow} from 'enzyme';
import {expect} from 'chai';
import DecisionSupportSessionComponent from '../../../js/views/conclusion/DecisionSupportSessionComponent';
import TabularListView from '../../../js/views/common/TabularListView';
import TestContext from "../testframework/TestContext";

describe('DecisionSupportSessionComponent View Test', () => {
    const context = new TestContext();
    it('Should call Tabular List View with proper params', () => {
        const decisionData = [{name: "Weight", value: 12}, {
            name: "Height",
            value: 122
        }].map((obj, idx)=> Object.assign(obj, {index: idx}));
        const data = [{key: "Weight", value: 12}, {
            key: "Height",
            value: 122
        }].map((obj, idx)=> Object.assign(obj, {index: idx}));

        const wrapper = shallow(<DecisionSupportSessionComponent
            decisions={decisionData}
            questionAnswers={data}/>, {context});
        var tabularListView = wrapper.find(TabularListView);
        expect(tabularListView).to.have.length(2);
        tabularListView.map((comp)=>expect(comp.props().data).to.deep.include.members(data));
    });
});