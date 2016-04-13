import React, { Component, StyleSheet, Text, View } from 'react-native';
import Path from '../routing/path';
import TypedTransition from '../routing/typedTransition';
import Dsl from '../../Dsl';
import compiler from 'ljspjs';
import fakeDisease from 'openchs-diseases/lib/fake.json';

@Path('/questionAnswer', false)
export default class QuestionAnswer extends Component {

  static propTypes = {
    params: React.PropTypes.object.isRequired,
  };

  static contextTypes = {
    getStore: React.PropTypes.func.isRequired,
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

  state = {
    question: compiler.execute(fakeDisease.algorithm, Dsl),
  };

  nextQuestion = (answer) => {
    const nextQuestion = answer.next();

    if (nextQuestion) {
      this.setState({ question: nextQuestion });
    } else {
      TypedTransition.from(this).goBack();
    }
  };

  render() {
    const next = this.nextQuestion;

    return (
      <View>
        <Text style={QuestionAnswer.styles.header}>{this.state.question.content}</Text>
        {this.state.question.answers.map(a => <Text key={a.content} onPress={next.bind(this, a)}>{a.content}</Text>)}
      </View>
    );
  }
}
