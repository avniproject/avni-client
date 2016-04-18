import React, { Component, StyleSheet, Text } from 'react-native';

class DiseaseViewHeader extends Component {

  static styles = StyleSheet.create({
    header: {
      backgroundColor: '#F44336',
      color: '#FFFFFF',
      height: 30,
      width: 1000,
      alignSelf: 'center',
      textAlign: 'center',
      textAlignVertical: 'center',
      marginBottom: 5,
    },
  });

  render() {
    return (
      <Text style={DiseaseViewHeader.styles.header}>Pick a Disease</Text>
    );
  }
}

export default DiseaseViewHeader;