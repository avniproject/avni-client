import React from 'react';
import {View, ListView} from 'react-native';
import {shallow} from 'enzyme';
import {expect} from 'chai';
import TabularListView from '../../../js/views/common/TabularListView';

describe('Tabular List View Test', () => {
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
    const context = {getService: getService, navigator: ()=>{}};
    it('Should not render blank view if data is empty array', () => {
        const wrapper = shallow(<TabularListView data={[]} message={"none"}/>, {context});
        expect(wrapper.equals(<View/>)).to.be.true;
    });

    it('Should render section header and data if data exists', () => {
        const wrapper = shallow(<TabularListView data={[{key: "Weight", value: 12}, {key: "Heigh", value: 122}]}
                                                 message={"Section Header"}/>, {context});
        expect(wrapper.find(ListView)).to.have.length(1);
    });
});