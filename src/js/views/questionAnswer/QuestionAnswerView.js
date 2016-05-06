import React, {Component, View} from 'react-native';
import Path from '../../routing/Path';
import Question from './Question.js';
import Answer from './Answer.js';

@Path('/questionAnswer')
class QuestionAnswerView extends Component {

    static propTypes = {
        params: React.PropTypes.object.isRequired,
        question: React.PropTypes.string
    };

    static contextTypes = {
        navigator: React.PropTypes.func.isRequired,
        getService: React.PropTypes.func.isRequired,
    };

    constructor(props, context) {
        super(props, context);
        this.questionnaire = this.context.getService("questionnaireService").getQuestionnaire(props.params.diseaseName);
    }

    render() {
        this.state = {questionnaire: this.questionnaire.currentQuestion()};
        return (
            <View>
                <Question question={this.state.questionnaire.question}/>
                <Answer answer={this.state.questionnaire.answer}/>
            </View>
        );
    }
}

export default QuestionAnswerView;
