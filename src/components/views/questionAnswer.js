import React, { Component, StyleSheet, Text, View } from 'react-native';
import Path from '../routing/path';
import TypedTransition from '../routing/typedTransition';
import dsl from '../../domain/dsl';

@Path('/questionAnswer', false)
export default class QuestionAnswer extends Component {

  static propTypes = {
    params: React.PropTypes.object.isRequired,
  };

  static contextTypes = {
    navigator: React.PropTypes.func.isRequired,
  };

  static styles = StyleSheet.create({
    header: {
      height: 100,
      width: 100,
      alignSelf: 'center',
      textAlign: 'center',
      color: '#333333',
      marginBottom: 5,
    },
  });

  constructor(props, context) {
    super(props, context);
    this.state = {
      question: dsl.loadQuestions(props.params.diseaseName),
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

  toAnswerView = (answer) => (
    <Text key={answer.content} onPress={this.nextQuestion(answer)}>
      {answer.content}
    </Text>
  );

  render() {
    return (
      <View>
        <Text style={QuestionAnswer.styles.header}>
          {this.state.question.content}
        </Text>
        {this.state.question.answers.map(this.toAnswerView)}
      </View>
    );
  }
}
