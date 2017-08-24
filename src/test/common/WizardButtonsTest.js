import React from "react";
import {shallow} from "enzyme";
import {expect} from "chai";
import WizardButtons from "../../js/views/common/WizardButtons";
import TestContext from "../views/testframework/TestContext";
import {Button} from "native-base";

describe('WizardButtons View Test', () => {
    const context = new TestContext();

    it('no previous', () => {
        const wrapper = shallow(<WizardButtons previous={{func: ()=> {}, visible: false}} next={{func: ()=> {}, visible: true}}/>, {context});
        const buttons = wrapper.find(Button);
        expect(buttons.length).to.be.equal(1);
    });

    it('both previous and next', () => {
        const wrapper = shallow(<WizardButtons previous={{func: ()=> {}, visible: true}} next={{func: ()=> {}, visible: true}}/>, {context});
        const buttons = wrapper.find(Button);
        expect(buttons.length).to.be.equal(2);
    });
});