import {UserInfo} from 'openchs-models';
import analytics from '@react-native-firebase/analytics';
import {defaultTo} from 'lodash';
import Config from '../framework/Config';
import EnvironmentConfig from "../framework/EnvironmentConfig";
import _ from "lodash";
import {NativeModules} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import moment from 'moment';
import General from './General';
import {getConnectionInfo} from "./ConnectionInfo";

const {ConfigModule} = NativeModules;

let db;
const firebaseAnalytics = analytics();
const logAnalytics = EnvironmentConfig.logAnalytics();

export const initAnalytics = async (initialisedDatabase) => {
    db = initialisedDatabase;
}

export const updateAnalyticsDatabase = (updatedDatabase) => {
    db = updatedDatabase;
}

const getUserInfo = () => {
    const defaultOrg = {organisationName: 'Unknown'};
    try {
        const userInfo = db.objects(UserInfo.schema.name);
        return defaultTo(userInfo[0], defaultOrg);
    } catch (e) {
        return defaultOrg;
    }
};

// ---- device_details -------------------------------------------------------------------------
// One compact string describing the handset, e.g. "OnePlusCPH2493_8GBRAM_MT6983", sent as the
// `device_details` EVENT param on EVERY event (logEvent and the screen events) so it shows up
// inside each event's own params - one custom dimension (Event scope). Kept to 36 chars (the model part is truncated
// first; RAM and processor - the parts that explain inference/sync timing - are always kept).
// Processor comes from ConfigModule.SOC_MANUFACTURER/SOC_MODEL (API 31+, added natively); older
// devices fall back to Build.HARDWARE via DeviceInfo.getHardwareSync().
const USER_PROPERTY_VALUE_MAX = 36;
const alnum = (value) => _.isNil(value) ? '' : String(value).replace(/[^A-Za-z0-9]+/g, '');
let cachedDeviceDetails;

const buildDeviceDetails = () => {
    const brand = alnum(DeviceInfo.getBrand());
    const model = alnum(DeviceInfo.getModel());
    const deviceName = _.startsWith(_.toLower(model), _.toLower(brand)) ? model : `${brand}${model}`;
    const ramGb = Math.round(DeviceInfo.getTotalMemorySync() / (1024 * 1024 * 1024));
    const socParts = _.filter([ConfigModule?.SOC_MANUFACTURER, ConfigModule?.SOC_MODEL], v => !_.isEmpty(v));
    const processor = _.truncate(alnum(socParts.join('')) || alnum(DeviceInfo.getHardwareSync()) || 'UnknownCPU',
        {length: 16, omission: ''});
    const suffix = `_${ramGb}GBRAM_${processor}`;
    const deviceBudget = Math.max(USER_PROPERTY_VALUE_MAX - suffix.length, 4);
    return `${_.truncate(deviceName, {length: deviceBudget, omission: ''})}${suffix}`.substring(0, USER_PROPERTY_VALUE_MAX);
};

const getDeviceDetails = () => {
    if (cachedDeviceDetails) return cachedDeviceDetails;
    try {
        cachedDeviceDetails = buildDeviceDetails();
    } catch (e) {
        General.logError('Analytics', 'Failed to build device_details:', e);
        return 'unknown';
    }
    return cachedDeviceDetails;
};

// ---- timestamps and durations ---------------------------------------------------------------
// Firebase stamps every event itself (UTC, shown in the property's timezone), which loses the
// user's own local clock. `event_time_local` is the device's wall-clock time with its UTC offset,
// e.g. "2026-10-06 14:32:05 IST" - read as-is, no server-side conversion needed, and it sorts
// chronologically as text. Taken when the event is raised, not when it is later flushed.
// Durations are also sent in seconds (3 decimals, i.e. ms precision) next to the existing
// *_ms value - added alongside, not replacing it, so the registered "Milliseconds" metric and
// everything already charted on it keep working.
// moment can't name a timezone without moment-timezone, and Intl's short names are unreliable on
// Android ("GMT+5:30"), so the device's IANA zone is mapped to the abbreviation instead. Only India
// is mapped (this app's users); anywhere else falls back to an explicit "UTC+hh:mm" so the value is
// never ambiguous.
const TIMEZONE_ABBREVIATIONS = {'Asia/Kolkata': 'IST', 'Asia/Calcutta': 'IST'};
const getTimezoneLabel = (time) => {
    try {
        const abbreviation = TIMEZONE_ABBREVIATIONS[Intl.DateTimeFormat().resolvedOptions().timeZone];
        if (abbreviation) return abbreviation;
    } catch (e) {
        // Intl unavailable - fall through to the offset.
    }
    return `UTC${moment(time).format('Z')}`;
};
export const formatLocalTimestamp = (time = Date.now()) => `${moment(time).format('YYYY-MM-DD HH:mm:ss')} ${getTimezoneLabel(time)}`;
const msToSeconds = (ms) => _.round(ms / 1000, 3);

// device_details and tenant ride on every event as ordinary params, so each event is self-describing
// in DebugView/BigQuery without joining against user properties. tenant is re-read per event, so the
// first events of a fresh install (TANUH_Unknown) correct themselves after the first sync.
// build_version = versionName + "." + versionCode, e.g. "1.0.17.8500022". Firebase's own app_version
// carries only versionName, so this lets any event be segregated by the exact build.
let cachedBuildVersion;
const getBuildVersion = () => {
    if (cachedBuildVersion) return cachedBuildVersion;
    try {
        cachedBuildVersion = `${DeviceInfo.getVersion()}.${DeviceInfo.getBuildNumber()}`.substring(0, USER_PROPERTY_VALUE_MAX);
    } catch (e) {
        General.logError('Analytics', 'Failed to build build_version:', e);
        return 'unknown';
    }
    return cachedBuildVersion;
};

const withDeviceDetails = (params) => ({
    ...params,
    build_version: getBuildVersion(),
    device_details: getDeviceDetails(),
    tenant: buildTenant(_.get(getUserInfo(), 'organisationName'))
});

const withTiming = (params, eventTime) => {
    const timed = {...params, event_time_local: eventTime};
    if (_.isFinite(timed.duration_ms)) timed.duration_sec = msToSeconds(timed.duration_ms);
    if (_.isFinite(timed.time_taken_ms)) timed.time_taken_sec = msToSeconds(timed.time_taken_ms);
    return timed;
};

// ---- tenant ---------------------------------------------------------------------------------
// Each tenant/affiliate is modelled server-side as its own organisation, and UserInfo.organisationName
// (from the /me sync) already carries it, so nothing is hardcoded per tenant here. `tenant` is the
// same value prefixed with the programme name - "TANUH_<organisation name from server>" - sent as a
// separate `tenant` EVENT param (on every event, see withDeviceDetails) so the existing
// `organisation` user property series is left untouched. When the server's
// organisation is "tanuh" it reads TANUH_tanuh, then TANUH_apgovt, TANUH_nggovt, ... for the others.
// Falls back to "TANUH_Unknown" until the first sync has populated UserInfo.
const TENANT_PREFIX = 'TANUH';
const buildTenant = (organisationName) => {
    const org = _.trim(String(_.defaultTo(organisationName, '')).replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]+/g, ''), '_');
    if (_.isEmpty(org) || org === 'Unknown') return `${TENANT_PREFIX}_Unknown`;
    return `${TENANT_PREFIX}_${org}`.substring(0, USER_PROPERTY_VALUE_MAX);
};

// ---- active task ----------------------------------------------------------------------------
// AbstractComponent.logScreenEvent only knows the generic view class ("ProgramEncounterView"), so
// a screening encounter was indistinguishable from any other encounter. logTaskStarted() already
// receives the real task (encounter type / subject type name), so it also records it here and
// logEvent/logScreenEvent stamp it onto every event fired while the task is open, as
// active_task_type + active_task_name (same raw name task_duration.task_name carries, so the two
// join). Cleared when logTaskDuration reports completed/abandoned for that task type.
let activeTask = null;

// Events that describe the task itself or app-level state, not what the user is doing inside it.
const EVENTS_WITHOUT_ACTIVE_TASK = ['login', 'login_error', 'logout', 'sync_start', 'sync_complete', 'sync_failed', 'task_duration'];

const withActiveTask = (eventName, params) => {
    if (_.isNil(activeTask) || _.includes(EVENTS_WITHOUT_ACTIVE_TASK, eventName)) return params;
    return {
        active_task_type: activeTask.type,
        ...(!_.isNil(activeTask.name) && {active_task_name: _.truncate(String(activeTask.name), {length: 100, omission: ''})}),
        ...params
    };
};

const setUserProperties = () => {
    const userInfo = getUserInfo();
    let organisationName = _.get(userInfo, 'organisationName', 'Unknown');
    const buildType = ConfigModule?.BUILD_TYPE || 'unknown';
    const environment = Config.ENV || 'unknown';
    const isProductionBuild = ConfigModule?.IS_PRODUCTION_BUILD || false;
    // Config.COMMIT_ID is the short git SHA the Makefile's _create_config bakes into Config.js at
    // build time (see MenuView/LoginView's "Build Version 2.6.1-45f4c" footer) - already computed
    // per-build, just never sent to analytics before. Distinguishes two builds sharing the same
    // versionName (e.g. ad hoc builds, which all report app_version "1").
    const commitId = Config.COMMIT_ID || 'unknown';
    // Firebase's own per-user identity field (shows as `user_id` in BigQuery, distinct from the
    // auto-populated `user_pseudo_id`, which is only device/install-scoped and unreliable on
    // shared devices). userUUID - not username - deliberately, since it's an opaque identifier
    // rather than a human-readable one, keeping PII out of the analytics pipeline. Falls back to
    // null (never undefined - setUserId throws on anything that isn't a string or null) when no
    // user is loaded yet or the field isn't populated.
    const userUUID = _.get(userInfo, 'userUUID', null);

    return Promise.all([
        firebaseAnalytics.setUserId(userUUID),
        firebaseAnalytics.setUserProperty("organisation", organisationName),
        firebaseAnalytics.setUserProperty("build_type", buildType),
        firebaseAnalytics.setUserProperty("environment", environment),
        firebaseAnalytics.setUserProperty("is_production", isProductionBuild.toString()),
        firebaseAnalytics.setUserProperty("commit_id", commitId)
    ]).catch(error => {
        General.logError('Analytics', 'Failed to set Firebase user properties:', error);
        throw error;
    });
};

export const logEvent = (name, params) => {
    if (logAnalytics) {
        const eventTime = formatLocalTimestamp();
        setUserProperties()
            .then(() => firebaseAnalytics.logEvent(name, withTiming(withDeviceDetails(withActiveTask(name, params)), eventTime)))
            .catch(error => {
                General.logError('Analytics', `Failed to log custom event ${name}:`, error);
            });
    }
};

export const screenRenderStart = () => Date.now();

/**
 * Logs screen view events to Firebase Analytics.
 * Sends TWO events for each screen:
 * 1. screen_view - Standard Firebase event for automatic tracking and Console reports, Ignores timeTaken info
 * 2. screen_load_time - Custom event for detailed performance analysis in BigQuery, retains timeTaken info
 * 
 * Both events contain identical parameters including timing data, ensuring consistency
 * across Firebase Console reports and custom analytics dashboards,
 * but only screen_load_time retains timeTaken details that can be used for filtering and analysis.
 */
export const logScreenEvent = (screenName, startTime) => {
    if (logAnalytics) {
        const eventTime = formatLocalTimestamp();
        const timeTaken = startTime ? Date.now() - startTime : undefined;
        const buildType = ConfigModule?.BUILD_TYPE || 'unknown';
        const environment = Config.ENV || 'unknown';
        
        getConnectionInfo().then(({isConnected}) => {
            const eventParams = withTiming(withDeviceDetails({
                ...withActiveTask('screen_view'),
                screen_name: screenName,
                screen_class: screenName,
                is_offline: (!isConnected).toString(),
                build_type: buildType,
                environment: environment,
                ...(timeTaken !== undefined && {time_taken_ms: timeTaken})
            }), eventTime);
            
            return setUserProperties()
                .then(() => {
                    // Send both events in parallel with independent failure handling
                    return Promise.allSettled([
                        firebaseAnalytics.logScreenView(eventParams),
                        firebaseAnalytics.logEvent('screen_load_time', eventParams)
                    ]);
                })
                .then((results) => {
                    // Log any failures without blocking the other event
                    results.forEach((result, index) => {
                        if (result.status === 'rejected') {
                            const eventType = index === 0 ? 'screen_view' : 'screen_load_time';
                            General.logError('Analytics', `Failed to log ${eventType} for ${screenName}:`, result.reason);
                        }
                    });
                })
                .catch(error => {
                    General.logError('Analytics', `Failed to log screen event for ${screenName}:`, error);
                });
        }).catch(error => {
            General.logError('Analytics', 'Failed to fetch network info:', error);
        });
    }
};


/**
 * Logs how long a multi-screen task took (login, registration, a screening encounter,
 * or a single wizard page like the oral image-capture group) — as opposed to
 * logScreenEvent, which times a single screen's render.
 *
 * taskName is optional (e.g. omitted for "login"); outcome defaults to "completed" —
 * "abandoned" tracking is a follow-up, not wired in yet.
 */
export const logTaskDuration = (taskType, taskName, durationMs, outcome = 'completed') => {
    if (activeTask && activeTask.type === taskType) activeTask = null;
    logEvent(firebaseEvents.TASK_DURATION, _.omitBy({
        task_type: taskType,
        task_name: taskName,
        duration_ms: durationMs,
        outcome
    }, _.isNil));
    // The 'completed' outcome here fires when the form is handed to the summary screen, NOT when
    // the registration is saved - the true completion is logged by logRegistrationCompleted() at
    // save time. Only the abandoned outcome is mirrored into the dedicated event.
    if (taskType === 'encounter' && outcome === 'abandoned') {
        finishScreening(firebaseEvents.PATIENT_SCREENING_ABANDONED);
    }
    if (taskType === 'registration' && outcome === 'abandoned') {
        logEvent(firebaseEvents.REGISTRATION_ABANDONED, _.omitBy({subject_type: taskName, duration_ms: durationMs}, _.isNil));
    }
};

/**
 * Logs the moment a timed task (login, registration, a screening encounter) actually began -
 * the counterpart to logTaskDuration's 'completed'/'abandoned' outcomes, which only fire at the
 * END and only tell you how long it took, not when it started. Firebase timestamps every event
 * with the device clock at the moment logEvent() runs, so this event's OWN timestamp *is* the
 * start time - no extra field needed. Query: task_duration where outcome='started' for "when did
 * it start", outcome='completed'/'abandoned' for "how long did it take" and how it ended. No
 * duration_ms here since none is known yet. Sync already had this exact pattern (sync_start) -
 * this brings login/registration/encounter to parity with it.
 */
export const logTaskStarted = (taskType, taskName) => {
    // login isn't a "what is the user doing" context worth stamping onto later events.
    if (taskType !== 'login') activeTask = {type: taskType, name: taskName};
    logEvent(firebaseEvents.TASK_DURATION, _.omitBy({
        task_type: taskType,
        task_name: taskName,
        outcome: 'started'
    }, _.isNil));
    // Patient/subject registration also gets its own dedicated event, so "how many registrations
    // were started" is a plain event count rather than a filter on task_duration.
    if (taskType === 'registration') {
        logEvent(firebaseEvents.REGISTRATION_STARTED, _.omitBy({subject_type: taskName}, _.isNil));
    }
};

// ---- patient screening lifecycle --------------------------------------------------------------
// A "screening" is a (program or general) encounter being filled in - oral screening, mental
// health, ... whatever the org configured as the encounter's name. Three dedicated events mirror the
// patient_registration_* ones: started when the encounter form opens, completed when it is actually
// SAVED, abandoned when the user backs out. They carry which screening it is (screening_name, plus
// program and subject_type) and, for completed/abandoned, how long it took from the first open.
// Kept apart from activeTask because that is cleared when the form is handed to the summary screen,
// whereas the screening is only finished once it is saved.
let activeScreening = null;

export const getScreeningDetails = (encounter) => ({
    uuid: _.get(encounter, 'uuid'),
    name: _.get(encounter, 'name') || _.get(encounter, 'encounterType.displayName'),
    program: _.get(encounter, 'programEnrolment.program.name'),
    subjectType: _.get(encounter, 'programEnrolment.individual.subjectType.name') || _.get(encounter, 'individual.subjectType.name')
});

const screeningParams = (screening, extra) => _.omitBy({
    screening_name: screening.name,
    program: screening.program,
    subject_type: screening.subjectType,
    ...extra
}, _.isNil);

export const logScreeningStarted = (encounter) => {
    const details = getScreeningDetails(encounter);
    // The encounter form re-mounts when the user steps back from the summary screen to change an
    // answer; that is the same screening continuing, so neither a second 'started' nor a reset clock.
    if (!_.isNil(details.uuid) && _.get(activeScreening, 'uuid') === details.uuid) return;
    activeScreening = {...details, startTime: Date.now()};
    logEvent(firebaseEvents.PATIENT_SCREENING_STARTED, screeningParams(details));
};

const finishScreening = (eventName, uuid) => {
    if (_.isNil(activeScreening) || (!_.isNil(uuid) && activeScreening.uuid !== uuid)) return;
    const screening = activeScreening;
    activeScreening = null;
    logEvent(eventName, screeningParams(screening, {duration_ms: Date.now() - screening.startTime}));
};

// Called from the SAVE actions once the encounter is written to the database.
export const logScreeningCompleted = (encounterUuid) => finishScreening(firebaseEvents.PATIENT_SCREENING_COMPLETED, encounterUuid);

/**
 * Logs a registration that was actually SAVED (called from the SAVE actions, after the subject was
 * written to the database), with the total time from opening the registration form to saving it -
 * including the summary/recommendation screen, unlike the task_duration 'completed' outcome which
 * stops when the form is handed to that screen. Only for new registrations (startTime is null when
 * editing an existing subject).
 */
export const logRegistrationCompleted = (subjectTypeName, startTime) => {
    if (_.isNil(startTime)) return;
    logEvent(firebaseEvents.REGISTRATION_COMPLETED, _.omitBy({
        subject_type: subjectTypeName,
        duration_ms: Date.now() - startTime
    }, _.isNil));
};

/**
 * Turns a form-element-group / page name from the org's Avni server config (e.g. "Oral Screening",
 * however it's actually spelled there) into a stable, GA4-friendly identifier ("oral_screening") -
 * lowercased, non-alphanumeric runs collapsed to a single underscore, no leading/trailing underscore.
 * Never hardcode a specific page name in client code (it's config data, not something this repo
 * defines) - always derive it from the real name via this function instead.
 */
export const slugify = (name) => _.isNil(name) ? undefined : _.trim(
    _.toLower(name).replace(/[^a-z0-9]+/g, '_'), '_'
) || undefined;

/**
 * Logs how long the user spent on a single wizard page (a FormElementGroup) - e.g. the oral
 * image-capture page within the oral screening form - as opposed to logTaskDuration, which times
 * the whole multi-page flow. pageName is the group's real name from server config, run through
 * slugify() so this stays stable regardless of exact wording; not gated to any particular page -
 * fires for every page of every wizard (registration, encounter, enrolment, checklist, task forms),
 * so filtering to one page (e.g. task_name = "oral_screening") happens downstream in analytics,
 * not by matching page names in this code.
 */
export const logFormPageDuration = (pageName, durationMs, outcome = 'completed') => {
    logTaskDuration('form_page', slugify(pageName), durationMs, outcome);
};

/**
 * Logs a screen-to-screen navigation - distinct from screen_view/screen_load_time, which time a
 * single screen's own render. Hooked once, in TypedTransition.to()/goBack(), so every one of
 * CHSNavigator's ~50 navigateToX methods gets this for free instead of touching each call site.
 *
 * toScreen is only known for a genuine push/replace (TypedTransition.to() is given the target
 * view class directly). goBack() only pops the existing stack - there's no cheap way to resolve
 * which view a pop lands on from a route path alone, so that case logs fromScreen/method only and
 * leaves toScreen absent, rather than guessing. Multi-hop stack operations (toBeginning,
 * resetStack, popToBookmark) aren't instrumented at all for the same reason - their destination is
 * genuinely ambiguous without deeper plumbing, and a half-reliable to_screen would be worse than
 * an honestly absent one.
 */
export const logScreenNavigation = (fromScreen, toScreen, method) => {
    logEvent(firebaseEvents.SCREEN_NAVIGATION, _.omitBy({
        from_screen: fromScreen,
        to_screen: toScreen,
        method,
        current_screen: toScreen
    }, _.isNil));
};

/**
 * Logs a discrete tap on a button-like component - scoped deliberately narrow to start (per the
 * telemetry design doc's Open Questions resolution): the wizard's shared Previous/Next/"Next and
 * more" buttons in WizardButtons.js, the one component every wizard (registration, encounter,
 * enrolment, checklist, task forms) already renders through. current_screen isn't attached here -
 * no generic envelope layer exists yet to supply it (see the design doc's Next Steps), and
 * WizardButtons itself doesn't know which screen it's mounted in. It can be joined at analysis
 * time against the nearest screen_view/screen_navigation event for the session instead.
 */
export const logUiClick = (elementName, extra = {}) => {
    logEvent(firebaseEvents.UI_CLICK, _.omitBy({
        element_name: elementName,
        element_type: 'button',
        ...extra
    }, _.isNil));
};

/**
 * Logs a business action that doesn't already have a named event of its own - deliberately NOT
 * used for edit_subject/edit_encounter/edit_enrolment/edit_program_encounter/edit_enrolment_exit
 * (the design doc's Open Questions confirmed those stay as named events, to avoid breaking
 * existing dashboards). Wired instead into the confirm dialogs that previously fired nothing at
 * all - delete/resolve/undo actions that pass skipEvent=true to AvniAlert because they aren't
 * form abandonment, but had no telemetry of their own either.
 */
export const logUserAction = (actionType, entityType) => {
    logEvent(firebaseEvents.USER_ACTION, _.omitBy({
        action_type: actionType,
        entity_type: entityType
    }, _.isNil));
};



export const firebaseEvents = {
    SYNC_START: 'sync_start',
    SYNC_COMPLETE: 'sync_complete',
    SYNC_FAILED: 'sync_failed',
    TASK_DURATION: 'task_duration',
    // Subject/patient registration lifecycle: started when the registration form opens, completed
    // when it is actually saved (duration_ms = open -> save), abandoned if the user backs out.
    // Screening (encounter) lifecycle - see "patient screening lifecycle" above.
    PATIENT_SCREENING_STARTED: 'patient_screening_started',
    PATIENT_SCREENING_COMPLETED: 'patient_screening_completed',
    PATIENT_SCREENING_ABANDONED: 'patient_screening_abandoned',
    REGISTRATION_STARTED: 'patient_registration_started',
    REGISTRATION_COMPLETED: 'patient_registration_completed',
    REGISTRATION_ABANDONED: 'patient_registration_abandoned',
    // The single, consolidated result for one image - a standalone single-model call, or (for
    // the 3-fold oral-screening ensemble) the unanimous-AND combination of every fold. Exactly
    // ONE row per image scored, always - see EdgeModelService.runInferenceOnImage/
    // runEnsembleInferenceOnImage. Count/filter THIS event for "how many images were screened".
    MODEL_INFERENCE_CONSOLIDATED: 'model_inference_consolidated',
    // One fold's own reading, emitted only while an ensemble is being evaluated - a diagnostic
    // for inspecting a specific model's behaviour, never a second "image screened". Carries
    // ensemble_models so a fold can be traced back to the consolidated verdict it fed into.
    MODEL_INFERENCE_INDIVIDUAL: 'model_inference_individual',
    CAMERA_CAPTURE: 'camera_capture',
    SEARCH_FILTER: 'search_filter',
    MY_DASHBOARD_FILTER: 'my_dashboard_filter',
    EDIT_SUBJECT: 'edit_subject',
    EDIT_ENCOUNTER: 'edit_encounter',
    EDIT_ENROLMENT: 'edit_enrolment',
    EDIT_PROGRAM_ENCOUNTER: 'edit_program_encounter',
    EDIT_PROGRAM_EXIT: 'edit_enrolment_exit',
    ABORT_FORM: 'abort_form',
    LOG_IN: 'login',
    LOG_IN_ERROR: 'login_error',
    LOG_OUT: 'logout',
    SUMMARY_PRESSED: 'summary_pressed',
    QUICK_FORM_EDIT: 'quick_form_edit',
    SCREEN_NAVIGATION: 'screen_navigation',
    UI_CLICK: 'ui_click',
    USER_ACTION: 'user_action',
    // Camera usability enhancement (Phase 2) — logged from MediaV2FormElement.js/MediaFormElement.js
    // after NativeModules.CameraModule.launchCamera() resolves, using the `quality` object it
    // returns (blur/brightness/contrast/noise scoring done natively via OpenCVUtils.kt/
    // ImageQualityAnalyzer.kt, TANUH-only). This is the telemetry sink decision from the camera
    // master doc, Section 8 decision #2 (Firebase Analytics, not PostHog — this app already
    // depends on @react-native-firebase/analytics, unlike fhir-app's PostHog-based reference).
    CAMERA_PHOTO_QUALITY: 'camera_photo_quality'
};
