/* @flow */
import {AppRegistry} from 'react-native';

// Initialize Bugsnag before anything else
import './src/utility/bugsnag';

// Import ALL services before app initialization to ensure @Service decorators register them
import './src/service/UserInfoService';
import './src/service/SettingsService';
import './src/service/SyncTelemetryService';
import './src/service/EntitySyncStatusService';
import './src/service/application/MenuItemService';
import './src/service/EntityService';

import App from './integrationTest/RealmIssuesApp';
// import App from "./src/Playground";
// import App from "./integrationTest/IntegrationTestApp";
// import App from "./src/Avni";
AppRegistry.registerComponent('Avni', () => App);
