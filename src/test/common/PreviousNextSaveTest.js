import React from 'react';
import {View, ListView, TouchableHighlight} from 'react-native';
import {shallow} from 'enzyme';
import {expect} from 'chai';
import PreviousNextSave from '../../js/views/common/PreviousNextSave';
import TestContext from "../views/testframework/TestContext";

describe('PreviousNextSave View Test', () => {
    const context = new TestContext();

    it('It should just show 2 buttons if hasBeforeQuestion is false', () => {
        const wrapper = shallow(<PreviousNextSave hasQuestionBefore={false}
                                                  nextParams={{}}
                                                  parent={{}}
                                                  nextView={()=> {
                                                  }}/>, {context});
        const buttons = wrapper.node.props.buttons;
        expect(buttons.length).to.be.equal(2);
        expect(buttons[0].text).to.be.equal("previous");
        expect(buttons[0].visible).to.be.true;
        expect(buttons[1].text).to.be.equal("next");
        expect(buttons[1].visible).to.be.true;
    });

    it('It should  show 2 buttons next and previous if hasBeforeQuestion is true', () => {
        const wrapper = shallow(<PreviousNextSave hasQuestionBefore={true}
                                                  nextParams={{}}
                                                  parent={{}}
                                                  nextView={()=> {
                                                  }}/>, {context});
        const buttons = wrapper.node.props.buttons;
        expect(buttons.length).to.be.equal(2);
        expect(buttons[0].text).to.be.equal("previous");
        expect(buttons[0].visible).to.be.true;
        expect(buttons[1].text).to.be.equal("next");
        expect(buttons[1].visible).to.be.true;
    });

    it('It should  show 2 buttons next and save if nextView is undefined', () => {
        const wrapper = shallow(<PreviousNextSave hasQuestionBefore={false}
                                                  nextParams={{}}
                                                  parent={{}}
                                                  nextView={undefined}/>, {context});
        const buttons = wrapper.node.props.buttons;
        expect(buttons.length).to.be.equal(2);
        expect(buttons[0].text).to.be.equal("previous");
        expect(buttons[0].visible).to.be.true;
        expect(buttons[1].text).to.be.equal("saveAndRestart");
        expect(buttons[1].visible).to.be.true;
    });
});