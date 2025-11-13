//-------------------------------------------------------------------------------------------------
// Purpose of this file is to create a singleton instance of the bugsnag client
// so we don't have to duplicate our configuration anywhere.
//-------------------------------------------------------------------------------------------------

import Bugsnag from '@bugsnag/react-native';
import Config from '../framework/Config';
import General from "./General";
import { NativeModules } from 'react-native';

// Initialize Bugsnag with the correct environment from JavaScript
// and then start the JS client after native is ready
try {
  if (NativeModules.BugsnagInitializer) {
    General.logDebug("Bugsnag", `Initializing Bugsnag with environment: ${Config.ENV}`);
    NativeModules.BugsnagInitializer.initializeWithEnvironment(Config.ENV)
      .then((result) => {
        General.logDebug("Bugsnag", `Bugsnag initialized: ${result}`);
        console.log(`Bugsnag: Successfully initialized with ${Config.ENV} environment`);
        
        // Now initialize the JS Bugsnag client after native is ready
        try {
          Bugsnag.start({
            // Native configuration is handled by BugsnagInitializer
          });
          General.logDebug("Bugsnag", "Bugsnag JS configured successfully");
        } catch (error) {
          console.warn("Bugsnag JS initialization failed:", error.message);
        }
      })
      .catch((error) => {
        console.warn("Failed to initialize Bugsnag:", error);
        General.logError("Bugsnag", `Bugsnag initialization failed: ${error.message}`);
        
        // Still try to initialize JS Bugsnag even if native failed
        try {
          Bugsnag.start({});
          General.logDebug("Bugsnag", "Bugsnag JS configured with fallback");
        } catch (jsError) {
          console.warn("Bugsnag JS fallback initialization failed:", jsError.message);
        }
      });
  } else {
    console.warn("BugsnagInitializer not available - initializing JS Bugsnag only");
    try {
      Bugsnag.start({});
      General.logDebug("Bugsnag", "Bugsnag JS configured without native");
    } catch (error) {
      console.warn("Bugsnag JS initialization failed:", error.message);
    }
  }
} catch (error) {
  console.warn("Error setting up Bugsnag:", error.message);
  // Try basic initialization as last resort
  try {
    Bugsnag.start({});
  } catch (fallbackError) {
    console.warn("Bugsnag fallback initialization failed:", fallbackError.message);
  }
}

export default Bugsnag;
