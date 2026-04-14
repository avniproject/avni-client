# Avni Deep Linking Implementation

## Overview
This implementation adds deep linking support to the Avni app, allowing pump operators to tap a link in WhatsApp messages and have the Avni app open directly to the appropriate form.

## How It Works

### URL Scheme
The app now responds to URLs with the format:
```
avni://form?type=<type>&id=<id>&entityType=<entityType>
```

### Supported Parameters
- **type** (required): The type of form to open
  - `enrollment` - Program enrollment form
  - `encounter` - Encounter/visit form  
  - `registration` - Individual registration form
- **id** (optional): The UUID of the specific entity (individual, enrollment, or encounter)
- **entityType** (optional): The type of entity (e.g., subject type name, program name)
- **Additional parameters**: Any extra parameters can be added as needed

### Example Deep Links

1. **Open enrollment form for a specific individual:**
   ```
   avni://form?type=enrollment&id=12345-abcde-67890&entityType=Maternal Health Program
   ```

2. **Open encounter form:**
   ```
   avni://form?type=encounter&id=encounter-uuid-123&entityType=Monthly Visit
   ```

3. **Open registration form:**
   ```
   avni://form?type=registration&entityType=Person
   ```

## WhatsApp Message Template Example

```
Hello! Please fill out the required form by clicking the link below:

avni://form?type=enrollment&id={{individual_uuid}}&entityType={{program_name}}

Thank you!
```

## Implementation Details

### Files Modified

1. **AndroidManifest.xml** (`android/app/src/main/AndroidManifest.xml`)
   - Added intent filter for `avni://` URL scheme
   - Set `launchMode="singleTask"` to handle deep links properly
   - Added `BROWSABLE` category to allow links from browsers/WhatsApp

2. **DeepLinkHandler.js** (`src/utility/DeepLinkHandler.js`)
   - New utility class to handle deep link parsing and routing
   - Methods to initialize listeners, parse URLs, and generate deep links
   - Supports both cold start and warm start scenarios

3. **App.js** (`src/App.js`)
   - Added deep link initialization in `componentDidMount`
   - Handles pending deep links from cold starts
   - Stores deep link info in GlobalContext for views to process

4. **LandingView.js** (`src/views/LandingView.js`)
   - Added `didFocus()` lifecycle method to check for pending deep links
   - Implements navigation logic for different form types
   - Routes to appropriate screens based on deep link parameters

## Testing

### Manual Testing with ADB

You can test deep links using ADB commands:

```bash
# Test opening enrollment form
adb shell am start -W -a android.intent.action.VIEW -d "avni://form?type=enrollment&id=test-123" com.avni.app

# Test opening registration form
adb shell am start -W -a android.intent.action.VIEW -d "avni://form?type=registration" com.avni.app
```

### Testing via Browser

1. Create an HTML file with the deep link:
```html
<a href="avni://form?type=enrollment&id=test-uuid">Open Avni Form</a>
```

2. Open the HTML file in Chrome on your Android device
3. Tap the link - it should open the Avni app

### Testing via WhatsApp

1. Send yourself a message with the deep link
2. Tap the link in WhatsApp
3. The app should open and navigate to the appropriate form

## Deep Link Flow

### Cold Start (App not running)
1. User taps link in WhatsApp
2. Android launches Avni app with the deep link URL
3. App initializes normally
4. After initialization, pending deep link is processed
5. User is navigated to the appropriate form

### Warm Start (App already running)
1. User taps link in WhatsApp
2. Android brings Avni app to foreground
3. Deep link listener receives the URL
4. Deep link is immediately processed
5. User is navigated to the appropriate form

## Security Considerations

- The app validates all deep link parameters before navigation
- Malformed or unsupported links are safely ignored
- User authentication is still required - deep links don't bypass login
- If user is not logged in, they'll be taken to login screen first

## Future Enhancements

Potential improvements to consider:

1. **Server-side form URL**: Support HTTPS URLs that redirect to avni:// scheme
   ```
   https://avni.example.com/form?type=enrollment&id=123
   ```

2. **Form pre-filling**: Pass form field values in the deep link
   ```
   avni://form?type=registration&name=John&phone=1234567890
   ```

3. **Fallback handling**: Open Play Store if app is not installed

4. **Analytics**: Track which deep links are being used most frequently

5. **Authentication tokens**: Include secure tokens in deep links for auto-login

## Troubleshooting

### App doesn't open when tapping link
- Verify the URL scheme is exactly `avni://`
- Check AndroidManifest.xml has the correct intent filter
- Ensure the app is installed on the device

### Wrong screen opens
- Check the `type` parameter is valid (enrollment, encounter, or registration)
- Verify the `id` parameter is a valid UUID
- Check logs in Logcat for deep link parsing errors

### Deep link works in testing but not in WhatsApp
- WhatsApp may require HTTPS URLs - consider implementing a web redirect page
- Test with different WhatsApp versions
- Check if link preview is interfering with the deep link

## Support

For issues or questions about deep linking implementation, check:
- Android logs: `adb logcat | grep -i "deeplink"`
- App debug logs with tag: `DeepLinkHandler`
- App debug logs with tag: `LandingView`


import { Linking } from 'react-native';
import General from './General';
import _ from 'lodash';

class DeepLinkHandler {
  static DEEP_LINK_SCHEME = 'avni://';
  static FORM_HOST = 'form';

  /**
   * Initialize deep link listeners
   * Should be called when app is ready to handle deep links
   */
  static initialize(onHandleDeepLink) {
    // Handle deep link when app is already running
    Linking.addEventListener('url', (event) => {
      const { url } = event;
      General.logDebug('DeepLinkHandler', `Received deep link while app running: ${url}`);
      this.handleDeepLink(url, onHandleDeepLink);
    });

    // Handle deep link when app is opened from cold start
    Linking.getInitialURL().then((url) => {
      if (url) {
        General.logDebug('DeepLinkHandler', `App opened with deep link: ${url}`);
        // Store the URL to be processed after app initialization
        this.pendingDeepLink = url;
      }
    }).catch((err) => {
      General.logError('DeepLinkHandler', 'Error getting initial URL', err);
    });
  }

  /**
   * Check if there's a pending deep link from cold start
   */
  static getPendingDeepLink() {
    const url = this.pendingDeepLink;
    this.pendingDeepLink = null; // Clear after reading
    return url;
  }

  /**
   * Handle incoming deep link URL
   */
  static handleDeepLink(url, onHandleDeepLink) {
    if (!url || !url.startsWith(this.DEEP_LINK_SCHEME)) {
      General.logDebug('DeepLinkHandler', `Ignoring non-avni deep link: ${url}`);
      return;
    }

    try {
      const parsed = this.parseDeepLink(url);
      if (parsed) {
        General.logDebug('DeepLinkHandler', `Parsed deep link:`, parsed);
        onHandleDeepLink(parsed);
      }
    } catch (error) {
      General.logError('DeepLinkHandler', 'Error handling deep link', error);
    }
  }

  /**
   * Parse deep link URL into structured data
   * Expected format: avni://form?type=<type>&id=<id>&entityType=<entityType>
   * 
   * Supported types:
   * - enrollment: Open program enrollment form
   * - encounter: Open encounter form
   * - registration: Open individual registration form
   */
  static parseDeepLink(url) {
    try {
      const urlWithoutScheme = url.replace(this.DEEP_LINK_SCHEME, '');
      const [host, queryString] = urlWithoutScheme.split('?');

      if (host !== this.FORM_HOST) {
        General.logDebug('DeepLinkHandler', `Unsupported deep link host: ${host}`);
        return null;
      }

      if (!queryString) {
        General.logDebug('DeepLinkHandler', 'No query parameters in deep link');
        return null;
      }

      const params = this.parseQueryString(queryString);
      
      return {
        type: params.type || null,
        id: params.id || null,
        entityType: params.entityType || null,
        formType: params.formType || null,
        rawParams: params
      };
    } catch (error) {
      General.logError('DeepLinkHandler', 'Error parsing deep link', error);
      return null;
    }
  }

  /**
   * Parse query string into key-value pairs
   */
  static parseQueryString(queryString) {
    const params = {};
    const pairs = queryString.split('&');
    
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    }
    
    return params;
  }

  /**
   * Generate deep link URL for WhatsApp message
   * @param {Object} params - Deep link parameters
   * @param {string} params.type - Form type (enrollment, encounter, registration)
   * @param {string} params.id - Entity ID (optional)
   * @param {string} params.entityType - Entity type (optional)
   * @returns {string} Deep link URL
   */
  static generateDeepLink(params) {
    const { type, id, entityType, formType, ...extraParams } = params;
    
    if (!type) {
      throw new Error('Deep link type is required');
    }

    let queryString = `type=${encodeURIComponent(type)}`;
    
    if (id) {
      queryString += `&id=${encodeURIComponent(id)}`;
    }
    
    if (entityType) {
      queryString += `&entityType=${encodeURIComponent(entityType)}`;
    }
    
    if (formType) {
      queryString += `&formType=${encodeURIComponent(formType)}`;
    }

    // Add any extra parameters
    for (const [key, value] of Object.entries(extraParams)) {
      queryString += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    }

    return `${this.DEEP_LINK_SCHEME}${this.FORM_HOST}?${queryString}`;
  }
}

export default DeepLinkHandler;
