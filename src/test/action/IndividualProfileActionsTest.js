import {expect} from "chai";
import {IndividualProfileActions as IPA} from "../../js/action/individual/IndividualProfileActions";
import TestContext from "../views/testframework/TestContext";
import Individual from "../../js/models/Individual";

describe('IndividualProfileActionsTest', () => {
    it('programEnrolmentFlow', () => {
        var state = IPA.getInitialState();
        const individual = Individual.createSafeInstance();
        individual.uuid = '811452cc-6cf4-43fa-83fc-af751de9e39c';
        state = IPA.individualSelected(state, {value: individual}, new TestContext());
        IPA.launchChooseProgram(state);
    });
});