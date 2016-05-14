import React, {Component, View, Text, TextInput} from 'react-native';
import Path from '../../routing/Path';
import Question from './Question.js';
import AnswerList from './AnswerList.js';
import TypedTransition from '../../routing/TypedTransition';
import ConclusionView from "../conclusion/ConclusionView";
import AppState from "../../hack/AppState"

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
        this.questionnaire = context.getService("questionnaireService").getQuestionnaire(AppState.conclusion.questionnaireName);
    }

    toAnswer(questionAnswer) {
        if (questionAnswer.questionDataType === 'Numeric')
            return (<TextInput />);
        else
            return (<AnswerList answers={this.state.questionAnswer.answers}/>);
    };

    previousButton(questionAnswer) {
        if (!questionAnswer.isFirstQuestion)
            return (<Text onPress={this.onPrevious}>Previous</Text>);
    };

    nextButton(questionAnswer) {
        return (<Text onPress={this.onNext}>Next</Text>);
    };

    onPrevious = () => {
        TypedTransition
            .from(this)
            .with({
                questionNumber: this.props.params.questionNumber - 1
            })
            .to(QuestionAnswerView);
    };

    onNext = () => {
        var typedTransition = TypedTransition.from(this);
        if (this.state.questionAnswer.isLastQuestion) {
            typedTransition.with().to(ConclusionView);
        } else {
                typedTransition.with({
                    questionNumber: this.props.params.questionNumber + 1
                })
                .to(QuestionAnswerView);            
        }
    };

    render() {
        this.questionnaire.setQuestionIndex(this.props.params.questionNumber);
        this.state = {questionAnswer: this.questionnaire.currentQuestion()};
        return (
            <View>
                <Question question={this.state.questionAnswer.question}/>
                {this.toAnswer(this.state.questionAnswer)}
                {this.previousButton(this.state.questionAnswer)}
                {this.nextButton(this.state.questionAnswer)}
            </View>
        );
    }
}

export default QuestionAnswerView;