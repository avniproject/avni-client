import React, { Component, StyleSheet, Text, View, ListView, DrawerLayoutAndroid } from 'react-native';
import Path from '../routing/path';
import TypedTransition from '../routing/typedTransition';
import questionAnswer from './questionAnswer';
import settingsView from './settingsView';

class DiseaseButton extends Component {

  static propTypes = {
    diseaseName: React.PropTypes.string.isRequired,
  };

  static contextTypes = {
    navigator: React.PropTypes.func.isRequired,
  };

  static styles = StyleSheet.create({
    item: {
      backgroundColor: '#CCC',
      margin: 10,
      width: 100,
      height: 100,
      textAlign: 'center',
      justifyContent: 'center',
    },
  });

  onSelect = () => {
    TypedTransition
      .from(this)
      .with({ diseaseName: this.props.diseaseName })
      .to(questionAnswer);
  };

  render() {
    return (
      <Text onPress={this.onSelect} style={DiseaseButton.styles.item}>{this.props.diseaseName}</Text>
    );
  }
}

class DiseaseViewHeader extends Component {

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
      <Text style={DiseaseViewHeader.styles.header}>Pick a Disease</Text>
    );
  }
}

@Path('/diseaseList', true)
export default class DiseaseList extends Component {

  static contextTypes = {
    navigator: React.PropTypes.func.isRequired,
    getStore: React.PropTypes.func.isRequired,
  };

  static styles = StyleSheet.create({
    list: {
      justifyContent: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    button: {
      textAlign: 'left',
    },
  });

  static initialDataSource = () =>
    new ListView.DataSource({ rowHasChanged: (r1, r2) => r1 !== r2 });

  state = {
    dataSource: DiseaseList.initialDataSource().cloneWithRows(['Disease 1']),
  };

  goToSettings = () => {
    TypedTransition.from(this).to(settingsView);
  };

  navigationView = () => (
    <View>
      <Text style={DiseaseList.styles.button} onPress={this.goToSettings}>Settings</Text>
    </View>
  );

  render() {
    return (
      <DrawerLayoutAndroid
        drawerWidth={300}
        drawerPosition={DrawerLayoutAndroid.positions.Left}
        renderNavigationView={this.navigationView}
      >
        <View>
          <DiseaseViewHeader/>
          <ListView
            contentContainerStyle={DiseaseList.styles.list}
            dataSource={this.state.dataSource}
            renderRow={(rowItem) => <DiseaseButton diseaseName={rowItem}/>}
          />
        </View>
      </DrawerLayoutAndroid>
    );
  }
}
