/**
 * Utility class for generating HTML content for documentation WebView components
 */
export default class DocumentationHtmlRenderer {
  // Script to handle links in WebView and direct them to the external browser
  static LINK_HANDLER_SCRIPT = `
    document.addEventListener('click', function(e) {
        var target = e.target;
        while(target && target.tagName !== 'A') {
            target = target.parentNode;
        }
        if (target && target.tagName === 'A') {
            e.preventDefault();
            window.ReactNativeWebView.postMessage(target.href);
        }
    }, false);
  `;

  /**
   * Creates HTML content for documentation display in WebView
   * 
   * @param {Object} options - Configuration options
   * @param {string} options.contentHtml - Main HTML content to render
   * @param {string} [options.linkColor='#007AFF'] - Color for links
   * @param {string} [options.visitedLinkColor='#5856D6'] - Color for visited links
   * @param {boolean} [options.bodyMarginFix=true] - Apply margin fix to body element
   * @returns {string} - Formatted HTML string
   */
  static createDocumentationHtml({
    contentHtml, 
    linkColor = '#007AFF',
    visitedLinkColor = '#5856D6',
    bodyMarginFix = true
  }) {
    const bodyStyles = bodyMarginFix ? 
      'margin-top: -18px !important; margin-bottom: -18px !important;' : '';
    
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta http-equiv="content-type" content="text/html; charset=utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
          <style>
              body { ${bodyStyles} }
              a { color: ${linkColor}; text-decoration: underline; }
              a:visited { color: ${visitedLinkColor}; }
              img { max-width: 100%; height: auto; }
          </style>
          <script>
              ${this.LINK_HANDLER_SCRIPT}
          </script>
      </head>
      <body>
          ${contentHtml || '<p>No content available</p>'}
      </body>
      </html>`;
  }
}
