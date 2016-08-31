import React from 'react';
import {View, ListView} from 'react-native';
import {shallow} from 'enzyme';
import {expect} from 'chai';
import DecisionSupportSessionComponent from '../../../js/views/conclusion/DecisionSupportSessionComponent';
import TabularListView from '../../../js/views/conclusion/TabularListView';

describe('DecisionSupportSessionComponent View Test', () => {
    function getService() {
        return {
            "getI18n": function () {
                return {
                    t: function (t) {
                        return t;
                    }
                };
            }
        };
    }

    it('Should call Tabular List View with proper params', () => {
        const decisionData = [{name: "Weight", value: 12}, {name: "Height", value: 122}];
        const data = [{key: "Weight", value: 12}, {key: "Height", value: 122}];
        const context = {getService: getService};
        const wrapper = shallow(<DecisionSupportSessionComponent
            decisions={decisionData}
            questionAnswers={data}/>, {context});
        var tabularListView = wrapper.find(TabularListView);
        expect(tabularListView).to.have.length(2);
        tabularListView.map((comp)=>expect(comp.props().data).to.deep.include.members(data));
    });
});