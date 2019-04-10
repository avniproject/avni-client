/* @flow */
import {AppRegistry} from 'react-native';
import OpenCHS from "./src/OpenCHS";

console.ignoredYellowBox = ['Warning: You are manually calling'];
AppRegistry.registerComponent('OpenCHS', () => OpenCHS);
console.disableYellowBox = true;
