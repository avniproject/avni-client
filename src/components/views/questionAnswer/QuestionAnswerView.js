import React, { Component, View } from 'react-native';
import Path from '../../routing/Path';
import TypedTransition from '../../routing/TypedTransition';
import AnswerList from './AnswerList';
import QuestionHeader from './QuestionHeader';
import QuestionService from '../../service/QuestionService';

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
      question: QuestionService.getQuestion(props.params.diseaseName, 0),
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
