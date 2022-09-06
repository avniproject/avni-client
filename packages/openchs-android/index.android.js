/* @flow */
import {AppRegistry, LogBox} from 'react-native';
import Avni from "./src/App";

LogBox.ignoreAllLogs();
AppRegistry.registerComponent('Avni', () => Avni);
