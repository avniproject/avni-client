import React from 'react';
import {View, ListView, TouchableHighlight} from 'react-native';
import {shallow} from 'enzyme';
import {expect} from 'chai';
import WizardButtons from '../../js/views/common/WizardButtons';
import TestContext from "../views/testframework/TestContext";

describe('WizardButtons View Test', () => {
    const context = new TestContext();

    it('It should show no button if the button array passed is empty', () => {
        const wrapper = shallow(<WizardButtons buttons={[]}/>, {context});
        const buttons = wrapper.find(TouchableHighlight);
        expect(buttons.length).to.be.equal(0);
    });

    it('It should show 1 button if button is passed', () => {
        var expected = 0;
        const wrapper = shallow(<WizardButtons
            buttons={[{text: "First Button", func: ()=>expected = 1002, visible: true}]}/>, {context});
        const buttons = wrapper.find(TouchableHighlight);
        expect(buttons.length).to.be.equal(1);
    });

    it('It should show 2 button if button is passed', () => {
        var expected = 0;
        const wrapper = shallow(<WizardButtons
            buttons={[{text: "First Button", func: ()=>expected = 1002, visible: true}, {
                text: "Second Button",
                func: ()=>expected = 1002,
                visible: true
            }]}/>, {context});
        const buttons = wrapper.find(TouchableHighlight);
        expect(buttons.length).to.be.equal(2);
    });
});