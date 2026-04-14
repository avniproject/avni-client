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
