/* @flow */
import {AppRegistry} from 'react-native';

// Initialize Bugsnag before anything else
import './src/utility/bugsnag';

// import App from './integrationTest/RealmIssuesApp';
// import App from "./src/Playground";
// import App from "./integrationTest/IntegrationTestApp";
import App from "./src/Avni";
AppRegistry.registerComponent('Avni', () => App);
