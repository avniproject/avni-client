//-------------------------------------------------------------------------------------------------
// Purpose of this file is to create a singleton instance of the bugsnag client 
// so we don't have to duplicate our configuration anywhere.
//-------------------------------------------------------------------------------------------------

import { Client, Configuration } from 'bugsnag-react-native';
import Config from '../framework/Config';

const configuration = new Configuration();
configuration.autoNotify = false;
configuration.releaseStage = Config.ENV;
configuration.notifyReleaseStages = ['staging', 'prod', 'uat', 'prerelease', 'perf'];
console.log("Creating new instance of Bugsnag");
const client = new Client(configuration);

export default client;