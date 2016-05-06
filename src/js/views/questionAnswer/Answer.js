import React, {Component, View} from 'react-native';
import OptionList from './OptionList.js';
import NumericAnswer from './Numeric.js';

class Answer extends Component {

    static propTypes = {
        answer: React.PropTypes.func.isRequired,
    };

    static answerType = {
        "numeric": NumericAnswer,
        "options": OptionList
    };

    render() {
        var answer = this.props.answer;
//        var AnswerComponent = (Answer.answerType[answer.type]);
        return (
            <View>
            </View>
        );
    }
}

export default Answer;