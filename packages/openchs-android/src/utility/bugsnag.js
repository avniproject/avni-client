//-------------------------------------------------------------------------------------------------
// Purpose of this file is to create a singleton instance of the bugsnag client
// so we don't have to duplicate our configuration anywhere.
//-------------------------------------------------------------------------------------------------

import Bugsnag from '@bugsnag/react-native';
import Config from '../framework/Config';
import General from "./General";

// Configure Bugsnag with error handling
try {
  Bugsnag.start({
    autoDetectErrors: false, // equivalent to autoNotify: false
    releaseStage: Config.ENV,
    enabledReleaseStages: ['staging', 'prod', 'uat', 'prerelease', 'perf'],
  });
  General.logDebug("Bugsnag", "Bugsnag configured successfully");
} catch (error) {
  console.warn("Bugsnag initialization failed:", error.message);
  // App can still function without Bugsnag
}

export default Bugsnag;
