import React, {Component, View, Text, TextInput} from 'react-native';
import Path from '../../routing/Path';
import Question from './Question.js';
import AnswerList from './AnswerList.js';
import TypedTransition from '../../routing/TypedTransition';

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

    previousButton = function (questionAnswer) {
        if (!questionAnswer.isFirstQuestion)
            return (<Text onPress={this.onPrevious}>Previous</Text>);
    };

    onNext = function () {
        TypedTransition
            .from(this)
            .with({diseaseName: this.props.diseaseName})
            .to(this);
    };

    nextButton = function (questionAnswer) {
        if (!questionAnswer.isLastQuestion)
            return (<Text onPress={this.onNext}>Next</Text>);
    };

    render() {
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