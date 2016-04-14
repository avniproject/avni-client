import React, { Component } from 'react-native';
import PathRegistry from './routing/PathRegistry';
import Realm from 'realm';
import models from '../models';
import './views';

export default class App extends Component {

  store = new Realm(models);

  static childContextTypes = {
    getStore: React.PropTypes.func.isRequired,
  };

  getChildContext = () => ({
    getStore: () => this.store,
  });

  render() {
    return PathRegistry.routes();
  }

}
