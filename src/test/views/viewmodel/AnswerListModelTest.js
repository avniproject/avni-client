import {expect} from "chai";
import SingleSelectAnswerListModel from "../../../js/views/viewmodel/SingleSelectAnswerListModel";
import MultiSelectAnswerListModel from "../../../js/views/viewmodel/MultiSelectAnswerListModel";

describe('AnswerListModelTest', () => {
    it('toggleSelection for single select', () => {
        var answerListModel = new SingleSelectAnswerListModel(["b"], false);
        answerListModel.toggleSelection("a");
        expect(answerListModel.isSelected("a")).is.equal(true);
        expect(answerListModel.isSelected("b")).is.equal(false);
        answerListModel.toggleSelection("b");
        expect(answerListModel.isSelected("a")).is.equal(false);
        expect(answerListModel.isSelected("b")).is.equal(true);
    });

    it('toggleSelection for multi select', () => {
        var answerListModel = new MultiSelectAnswerListModel(["b"], false);
        answerListModel.toggleSelection("a");
        expect(answerListModel.isSelected("a")).is.equal(true);
        expect(answerListModel.isSelected("b")).is.equal(true);
        answerListModel.toggleSelection("a");
        expect(answerListModel.isSelected("a")).is.equal(false);
        expect(answerListModel.isSelected("b")).is.equal(true);
    });
});