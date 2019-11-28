/* @flow */
import {AppRegistry} from 'react-native';
import Avni from "./src/Avni";

console.ignoredYellowBox = ['Warning: You are manually calling'];
AppRegistry.registerComponent('Avni', () => Avni);
console.disableYellowBox = true;
