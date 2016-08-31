import _ from 'lodash';

class AnswerListModel {
    constructor(chosenAnswers, isMultiSelect) {
        this.chosenAnswers = chosenAnswers;
        this.isMultiSelect = isMultiSelect;
    }

    isSelected(option) {
        return _.indexOf(this.chosenAnswers, option) !== -1;
    }

    select(option) {
        this.chosenAnswers.push(option);
    }

    unSelect(option) {
        _.pull(this.chosenAnswers, option);
    }

    toggleSelection(option) {
    }
}

export default AnswerListModel;