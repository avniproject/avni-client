/**
 * ⚠️ CRITICAL: Central Service Registration File
 *
 * PURPOSE:
 * This file ensures all @Service decorators execute at module load time, registering
 * services in the BeanRegistry before GlobalContext.initialiseGlobalContext() is called.
 *
 * WHY THIS EXISTS:
 * - JavaScript decorators (@Service) only execute when the module is imported/evaluated
 * - Without explicit imports, services are never registered in the BeanRegistry
 * - Actions receive an empty Map as context, causing "service not found" errors
 *
 * IMPORT ORDER:
 * 1. App.js imports this file (line 10)
 * 2. All service decorators execute
 * 3. Services register in GlobalContext.getInstance().beanRegistry
 * 4. GlobalContext.initialiseGlobalContext() is called (App.js componentDidMount)
 * 5. BeanRegistry.init() creates service instances from registered classes
 *
 * ⚠️ CONSEQUENCES OF REMOVING THIS FILE:
 * - All services will fail to register
 * - BeanRegistry._beansMap will be empty
 * - Actions will receive empty Map as context
 * - App will crash with "Cannot read property 'methodName' of undefined"
 *
 * MAINTENANCE:
 * - Add new service imports when creating new service files
 * - Run test: `npm test -- ServiceRegistrationTest` to verify all services are included
 * - Keep imports organized by category for readability
 *
 * BUNDLE OPTIMIZATION:
 * - Marked as sideEffect in package.json to prevent tree-shaking
 * - All services loaded upfront (acceptable for offline-first architecture)
 * - Future: Consider lazy loading for non-critical services
 */

// Core services
import './AddressLevelService';
import './AuthService';
import './BaseAddressLevelService';
import './ChecklistService';
import './ConceptService';
import './CustomDashboardCacheService';
import './CustomFilterService';
import './DashboardCacheService';
import './EncounterService';
import './EncounterTypeService';
import './EntityApprovalStatusService';
import './EntityQueueService';
import './EntityService';
import './EntitySyncStatusService';
import './FamilyService';
import './FormMappingService';
import './GroupSubjectService';
import './IdentifierAssignmentService';
import './IndividualService';
import './LocalCacheService';
import './LocationHierarchyService';
import './MediaQueueService';
import './MediaService';
import './MessageService';
import './OrganisationConfigService';
import './PrivilegeService';
import './ProgramConfigService';
import './ProgramEnrolmentService';
import './ResetSyncService';
import './RuleEvaluationService';
import './RuleService';
import './SettingsService';
import './SubjectMigrationService';
import './SubjectTypeService';
import './SyncService';
import './SyncTelemetryService';
import './UserInfoService';
import './UserSubjectAssignmentService';
import './VideoService';

// Application services
import './application/MenuItemService';

// Custom Dashboard services
import './customDashboard/CustomDashboardService';
import './customDashboard/DashboardSectionCardMappingService';
import './customDashboard/ReportCardService';

// Report services
import './reports/DashboardFilterService';

// News service
import './news/NewsService';

// Comment services
import './comment/CommentService';
import './comment/CommentThreadService';

// Task services
import './task/TaskService';
import './task/TaskStatusService';
import './task/TaskTypeService';
import './task/TaskUnAssignmentService';

// Program services
import './program/ProgramEncounterService';
import './program/ProgramService';
import './program/SubjectProgramEligibilityService';

// Draft services
import './draft/DraftEncounterService';
import './draft/DraftSubjectService';

// Query services
import './query/RealmQueryService';

// Relationship services
import './relationship/IndividualRelationGenderMappingService';
import './relationship/IndividualRelationshipService';
import './relationship/IndividualRelationshipTypeService';

// Auth services
import './CognitoAuthService';
import './KeycloakAuthService';
import './StubbedAuthService';
import './BaseAuthProviderService';

// Other services
import './AnonymizeRealmService';
import './BackupRestoreRealmService'; // Note: File named BackupRestoreRealmService.js, class is BackupRestoreRealmService
import './BeneficiaryModePinService';
import './CallService';
import './EncryptionService';
import './ExtensionService';
import './GlificService';
import './MetricsService';
import './PhoneVerificationService';

// Export empty object to indicate module loaded
export default {};
