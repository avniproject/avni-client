import AnswerListModel from "./AnswerListModel";

class SingleSelectAnswerListModel extends AnswerListModel {
    constructor(chosenAnswers) {
        super(chosenAnswers);
    }

    toggleSelection(option) {
        if (this.chosenAnswers.length === 0) {
            this.select(option);
        } else if(this.isSelected(option)) {
            this.unSelect(option);
        } else {
            this.unSelect(this.chosenAnswers[0]);
            this.select(option);
        }
    }
}

export default SingleSelectAnswerListModel;