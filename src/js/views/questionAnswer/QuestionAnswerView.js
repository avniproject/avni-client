import React, {Component, View, Text, TextInput} from 'react-native';
import Path from '../../routing/Path';
import Question from './Question.js';
import AnswerList from './AnswerList.js';

@Path('/questionAnswer')
class QuestionAnswerView extends Component {

    static propTypes = {
        params: React.PropTypes.object.isRequired
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired
    };

    constructor(props, context) {
        super(props, context);
        this.questionnaire = context.getService("questionnaireService").getQuestionnaire(props.params.diseaseName);
    }

    toAnswer = function (questionAnswer) {
        if (questionAnswer.questionDataType === 'Numeric')
            return (<TextInput />);
        else
            return (<AnswerList answers={this.state.questionAnswer.answers}/>);
    };

    render() {
        this.state = {questionAnswer: this.questionnaire.currentQuestion()};
        return (
            <View>
                <Question question={this.state.questionAnswer.question}/>
                {this.toAnswer(this.state.questionAnswer)}
            </View>
        );
    }
}

export default QuestionAnswerView;
