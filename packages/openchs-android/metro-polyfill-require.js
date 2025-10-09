/**
 * Polyfill for global require() to be available before Metro's module system
 * This prevents "Property 'require' doesn't exist" errors in Hermes
 */
(function() {
    'use strict';
    
    // Only install if require doesn't exist
    if (typeof global !== 'undefined' && typeof global.require === 'undefined') {
        global.require = function(moduleId) {
            // If Metro's module system is ready, use it
            if (typeof global.__r === 'function') {
                return global.__r(moduleId);
            }
            
            // Fallback for common @babel/runtime helpers
            if (moduleId === '@babel/runtime/helpers/defineProperty') {
                return function defineProperty(obj, key, value) {
                    if (Object.defineProperty) {
                        Object.defineProperty(obj, key, {
                            value: value,
                            enumerable: true,
                            configurable: true,
                            writable: true
                        });
                    } else {
                        obj[key] = value;
                    }
                    return obj;
                };
            }
            
            if (moduleId === '@babel/runtime/helpers/classCallCheck') {
                return function classCallCheck(instance, Constructor) {
                    if (!(instance instanceof Constructor)) {
                        throw new TypeError("Cannot call a class as a function");
                    }
                };
            }
            
            if (moduleId === '@babel/runtime/helpers/createClass') {
                return function createClass(Constructor, protoProps, staticProps) {
                    if (protoProps) defineProperties(Constructor.prototype, protoProps);
                    if (staticProps) defineProperties(Constructor, staticProps);
                    return Constructor;
                };
                
                function defineProperties(target, props) {
                    for (var i = 0; i < props.length; i++) {
                        var descriptor = props[i];
                        descriptor.enumerable = descriptor.enumerable || false;
                        descriptor.configurable = true;
                        if ("value" in descriptor) descriptor.writable = true;
                        Object.defineProperty(target, descriptor.key, descriptor);
                    }
                }
            }
            
            // Return empty object for unknown modules
            console.warn('[Polyfill] require() called for unknown module:', moduleId);
            return {};
        };
        
        console.log('[Polyfill] Global require() installed for Hermes compatibility');
    }
})();
