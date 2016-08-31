import AnswerListModel from "./AnswerListModel";

class MultiSelectAnswerListModel extends AnswerListModel {
    toggleSelection(option) {
        if (this.isSelected(option)) {
            this.unSelect(option);
        } else {
            this.select(option);
        }
    }
}

export default MultiSelectAnswerListModel;