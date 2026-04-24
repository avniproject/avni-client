/**
 * Example: How to generate deep links for WhatsApp messages
 * 
 * This file shows how the DIL integration can generate deep links
 * to include in WhatsApp nudge messages for pump operators.
 */

import DeepLinkHandler from '../utility/DeepLinkHandler';

// Example 1: Generate link for program enrollment
function generateEnrollmentLink(individualUUID, programName) {
  return DeepLinkHandler.generateDeepLink({
    type: 'enrollment',
    id: individualUUID,
    entityType: programName
  });
}

// Example 2: Generate link for encounter/visit
function generateEncounterLink(encounterUUID, encounterType) {
  return DeepLinkHandler.generateDeepLink({
    type: 'encounter',
    id: encounterUUID,
    entityType: encounterType
  });
}

// Example 3: Generate link for new registration
function generateRegistrationLink(subjectTypeName) {
  return DeepLinkHandler.generateDeepLink({
    type: 'registration',
    entityType: subjectTypeName
  });
}

// Example 4: Generate link with custom parameters
function generateCustomLink(params) {
  return DeepLinkHandler.generateDeepLink({
    type: params.type,
    id: params.id,
    entityType: params.entityType,
    formType: params.formType,
    ...params.extraParams
  });
}

// Usage Examples:

// For DIL integration - WhatsApp message template
const messageTemplates = {
  enrollment: (individualUUID, programName) => {
    const deepLink = generateEnrollmentLink(individualUUID, programName);
    return `Hello! Please complete your ${programName} enrollment by clicking this link:\n\n${deepLink}\n\nThank you!`;
  },

  encounter: (encounterUUID, encounterType) => {
    const deepLink = generateEncounterLink(encounterUUID, encounterType);
    return `Hi! Your ${encounterType} is due. Please fill the form:\n\n${deepLink}\n\nThank you!`;
  },

  registration: () => {
    const deepLink = generateRegistrationLink('Person');
    return `Welcome! Please register using this link:\n\n${deepLink}\n\nThank you!`;
  }
};

// Example generated links (only in development mode):
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log('Enrollment Link:', generateEnrollmentLink('12345-abcde', 'Maternal Health'));
  // Output: avni://form?type=enrollment&id=12345-abcde&entityType=Maternal%20Health

  console.log('Encounter Link:', generateEncounterLink('enc-uuid-123', 'Monthly Visit'));
  // Output: avni://form?type=encounter&id=enc-uuid-123&entityType=Monthly%20Visit

  console.log('Registration Link:', generateRegistrationLink('Person'));
  // Output: avni://form?type=registration&entityType=Person

  // Example WhatsApp message:
  console.log('\nWhatsApp Message Example:');
  console.log(messageTemplates.enrollment('user-123-uuid', 'Water Pump Inspection'));
  // Output:
  // Hello! Please complete your Water Pump Inspection enrollment by clicking this link:
  //
  // avni://form?type=enrollment&id=user-123-uuid&entityType=Water%20Pump%20Inspection
  //
  // Thank you!
}

export {
  generateEnrollmentLink,
  generateEncounterLink,
  generateRegistrationLink,
  generateCustomLink,
  messageTemplates
};
