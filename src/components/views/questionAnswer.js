import React, { Component, StyleSheet, Text, View } from 'react-native';
import Path from '../routing/path';

@Path('/questionAnswer', false)
export default class QuestionAnswer extends Component {

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

  render() {
    return (
      <View>
        <Text style={QuestionAnswer.styles.header}>New Page</Text>
      </View>
    );
  }
}
