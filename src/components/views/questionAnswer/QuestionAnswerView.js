import React, { Component, View } from 'react-native';
import Path from '../../routing/Path';
import TypedTransition from '../../routing/TypedTransition';
import DSL from '../../../domain/DSL';
import AnswerList from './AnswerList';
import QuestionHeader from './QuestionHeader';

@Path('/questionAnswer')
export default class QuestionAnswerView extends Component {

  static propTypes = {
    params: React.PropTypes.object.isRequired,
  };

  static contextTypes = {
    navigator: React.PropTypes.func.isRequired,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      question: DSL.loadQuestions(props.params.diseaseName),
    };
  }

  nextQuestion = (answer) => () => {
    const nextQuestion = answer.next();

    if (nextQuestion) {
      this.setState({ question: nextQuestion });
    } else {
      TypedTransition.from(this).goBack();
    }
  };

  render() {
    return (
      <View>
        <QuestionHeader question={this.state.question}/>
        <AnswerList answers={this.state.question.answers} next={this.nextQuestion}/>
      </View>
    );
  }
}
