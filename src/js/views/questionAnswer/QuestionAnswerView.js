import React, {Component, View, Text} from 'react-native';
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

    render() {
        this.state = {questionnaire: this.questionnaire.currentQuestion()};
        return (
            <View>
                <Question question={this.state.questionnaire.question}/>
                <AnswerList answers={this.state.questionnaire.answers}/>
            </View>
        );
    }
}

export default QuestionAnswerView;
