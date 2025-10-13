import React from 'react';

/**
 * Unified App Context combining services and navigation.
 * Replaces legacy contextTypes/getChildContext pattern.
 * 
 * Context value shape:
 * {
 *   getService: (serviceName) => service instance,
 *   getDB: () => database instance,
 *   getStore: () => redux store,
 *   navigator: () => navigator instance
 * }
 */
const ServiceContext = React.createContext(null);

export default ServiceContext;
