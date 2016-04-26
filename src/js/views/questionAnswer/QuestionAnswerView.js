import React, { Component, View } from 'react-native';
import Path from '../../routing/Path';
import TypedTransition from '../../routing/TypedTransition';
import AnswerList from './AnswerList';
import QuestionHeader from './QuestionHeader';

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
        debugger;
        this.questionService = this.context.getService("questionService");
        this.state = {
            question: this.questionService.getQuestion(props.params.diseaseName, 0),
        };
    }

//  nextQuestion = (answer) => () => {
//    const nextQuestion = answer.next();
//
//    if (nextQuestion) {
//      this.setState({ question: nextQuestion });
//    } else {
//      TypedTransition.from(this).goBack();
//    }
//  };
//<AnswerList answers={this.state.question} next={this.state.question}/>

    render() {
        return (
            <View>
                <QuestionHeader question={this.state.question}/>
            </View>
        );
    }
}

export default QuestionAnswerView;
