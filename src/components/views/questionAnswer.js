import React, { Component, StyleSheet, Text, View } from 'react-native';
import Path from '../routing/path';
import TypedTransition from '../routing/typedTransition';

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

  constructor(props, context) {
    super(props, context);
    this.state = {
      question: this.context.getStore().objects('Question')
        .filtered(`disease = "${this.props.params.diseaseName}"`)[0],
    };
  }

  nextQuestion = (answer) => {
    if (answer.questions[0]) {
      this.setState({ question: answer.questions[0] });
    } else {
      TypedTransition.from(this).goBack();
    }
  };

  render() {
    const next = this.nextQuestion;
    return (
      <View>
        <Text style={QuestionAnswer.styles.header}>{this.state.question.content}</Text>
        {this.state.question.answers.map(a => <Text key={a.id} onPress={next.bind(this, a)}>{a.content}</Text>)}
      </View>
    );
  }
}
