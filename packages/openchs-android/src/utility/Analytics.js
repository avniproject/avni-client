import {UserInfo} from 'openchs-models';
import analytics from '@react-native-firebase/analytics';
import NetInfo from "@react-native-community/netinfo";
import {defaultTo} from 'lodash';
import Config from '../framework/Config';
import EnvironmentConfig from "../framework/EnvironmentConfig";
import _ from "lodash";
import {NativeModules} from 'react-native';
import General from './General';

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
    
    const userProps = {
        organisation: organisationName,
        build_type: buildType,
        environment: environment,
        is_production: isProductionBuild.toString()
    };
    
    General.logDebug('Analytics', 'Setting Firebase user properties:', userProps);
    
    return Promise.all([
        firebaseAnalytics.setUserProperty("organisation", organisationName),
        firebaseAnalytics.setUserProperty("build_type", buildType),
        firebaseAnalytics.setUserProperty("environment", environment),
        firebaseAnalytics.setUserProperty("is_production", isProductionBuild.toString())
    ]).then(() => {
        General.logDebug('Analytics', 'Firebase user properties set successfully');
    }).catch(error => {
        General.logError('Analytics', 'Failed to set Firebase user properties:', error);
        throw error;
    });
};

export const logEvent = (name, params) => {
    if (logAnalytics) {
        General.logDebug('Analytics', `Logging custom event: ${name}`, params);
        setUserProperties()
            .then(() => {
                General.logDebug('Analytics', `Sending custom event to Firebase: ${name}`);
                return firebaseAnalytics.logEvent(name, params);
            })
            .then(() => {
                General.logDebug('Analytics', `✓ Firebase custom event sent successfully: ${name}`);
            })
            .catch(error => {
                General.logError('Analytics', `Failed to log custom event ${name}:`, error);
            });
    } else {
        General.logDebug('Analytics', `Analytics logging disabled - skipping custom event: ${name}`);
    }
};

export const screenRenderStart = () => Date.now();

export const logScreenEvent = (screenName, startTime) => {
    if (logAnalytics) {
        const timeTaken = startTime ? Date.now() - startTime : undefined;
        const buildType = ConfigModule?.BUILD_TYPE || 'unknown';
        const environment = Config.ENV || 'unknown';
        
        General.logDebug('Analytics', `Logging screen event: ${screenName}`);
        
        NetInfo.fetch().then(({isConnected}) => {
            const eventParams = {
                screen_name: screenName,
                screen_class: screenName,
                is_offline: (!isConnected).toString(),
                build_type: buildType,
                environment: environment,
                ...(timeTaken !== undefined && {time_taken_ms: timeTaken})
            };
            
            General.logDebug('Analytics', 'Firebase screen event params:', eventParams);
            General.logDebug('Analytics', `Network status: ${isConnected ? 'online' : 'offline'}`);
            
            return setUserProperties()
                .then(() => {
                    General.logDebug('Analytics', `Sending screen_view event to Firebase for: ${screenName}`);
                    return firebaseAnalytics.logScreenView(eventParams);
                })
                .then(() => {
                    General.logDebug('Analytics', `✓ Firebase screen_view event sent successfully for: ${screenName}`);
                })
                .catch(error => {
                    General.logError('Analytics', `Failed to log screen event for ${screenName}:`, error);
                });
        }).catch(error => {
            General.logError('Analytics', 'Failed to fetch network info:', error);
        });
    } else {
        General.logDebug('Analytics', `Analytics logging disabled - skipping event for: ${screenName}`);
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
