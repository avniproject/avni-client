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
    let organisationName = _.get(getUserInfo(), 'organisationName', 'Unknown');
    const buildType = ConfigModule?.BUILD_TYPE || 'unknown';
    const environment = Config.ENV || 'unknown';
    const isProductionBuild = ConfigModule?.IS_PRODUCTION_BUILD || false;
    
    return Promise.all([
        firebaseAnalytics.setUserProperty("organisation", organisationName),
        firebaseAnalytics.setUserProperty("build_type", buildType),
        firebaseAnalytics.setUserProperty("environment", environment),
        firebaseAnalytics.setUserProperty("is_production", isProductionBuild.toString())
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


export const firebaseEvents = {
    SYNC_COMPLETE: 'sync_complete',
    SYNC_FAILED: 'sync_failed',
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
    QUICK_FORM_EDIT: 'quick_form_edit'
};
