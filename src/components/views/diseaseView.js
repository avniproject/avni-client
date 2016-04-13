import React, { Component, StyleSheet, Text, View, ListView, DrawerLayoutAndroid } from 'react-native';
import diseases from '../../config/diseases.json';
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
      backgroundColor: '#FF8A80',
      color: '#FFFFFF',
      margin: 10,
      width: 100,
      height: 100,
      textAlign: 'center',
      textAlignVertical: 'center',
      justifyContent: 'center',
      fontWeight: 'bold'
    },
  });

  onSelect = () => {
    TypedTransition.from(this).to(questionAnswer);
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

@Path('/diseaseList', true)
export default class DiseaseList extends Component {

  static contextTypes = {
    navigator: React.PropTypes.func.isRequired,
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
    dataSource: DiseaseList.initialDataSource().cloneWithRows(Object.keys(diseases)),
    diseases,
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
