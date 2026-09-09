import {UserInfo} from 'openchs-models';
import analytics from '@react-native-firebase/analytics';
import {defaultTo} from 'lodash';
import Config from '../framework/Config';
import EnvironmentConfig from "../framework/EnvironmentConfig";
import _ from "lodash";
import {NativeModules} from 'react-native';
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
        setUserProperties()
            .then(() => firebaseAnalytics.logEvent(name, params))
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
        const timeTaken = startTime ? Date.now() - startTime : undefined;
        const buildType = ConfigModule?.BUILD_TYPE || 'unknown';
        const environment = Config.ENV || 'unknown';
        
        getConnectionInfo().then(({isConnected}) => {
            const eventParams = {
                screen_name: screenName,
                screen_class: screenName,
                is_offline: (!isConnected).toString(),
                build_type: buildType,
                environment: environment,
                ...(timeTaken !== undefined && {time_taken_ms: timeTaken})
            };
            
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
    logEvent(firebaseEvents.TASK_DURATION, _.omitBy({
        task_type: taskType,
        task_name: taskName,
        duration_ms: durationMs,
        outcome
    }, _.isNil));
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
    logEvent(firebaseEvents.TASK_DURATION, _.omitBy({
        task_type: taskType,
        task_name: taskName,
        outcome: 'started'
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
