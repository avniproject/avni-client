import React, { AppRegistry, Component, StyleSheet, View } from 'react-native';
import App from './src/js/App';

class OpenCHSClient extends Component {

  static styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'stretch',
      backgroundColor: '#FFFFFF'
    }
  });

  render() {
    return (
      <View style={OpenCHSClient.styles.container}>
        <App />
      </View>
    );
  }
}

AppRegistry.registerComponent('OpenCHSClient', () => OpenCHSClient);
