import React, {
  AppRegistry,
  Component,
  StyleSheet,
  Text,
  View,
  ListView,
  Image
} from "react-native";

import logoList from "./config/app.json";


class DemoComponent extends Component {
  constructor(props) {
    super(props);
    var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    this.state = {data: ds.cloneWithRows(logoList)}
  }

  render() {
    return (
      <ListView dataSource={this.state.data}
                renderRow={(logoURI => <Image style={styles.thumb} source={{uri: logoURI}}></Image>)}>
      </ListView>);
  }
}

class trial extends Component {
  render() {
    return (
      <View style={styles.container}>
        <DemoComponent style={styles.welcome}>
        </DemoComponent>
        <Text style={styles.instructions}>
          To get started, edit index.android.js
        </Text>
        <Text style={styles.instructions}>
          Shake or press menu button for dev menu
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF'
  },
  thumb: {
    width: 80,
    height: 80,
    resizeMode: 'contain'
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5
  }
});

AppRegistry.registerComponent('trial', () => trial);
