import {UserInfo} from 'openchs-models';
import analytics from '@react-native-firebase/analytics';
import NetInfo from "@react-native-community/netinfo";
import {defaultTo} from 'lodash';
import Config from '../framework/Config';
import EnvironmentConfig from "../framework/EnvironmentConfig";
import _ from "lodash";
import {NativeModules} from 'react-native';

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
    ]);
};

export const logEvent = (name, params) => {
    if (logAnalytics) {
        setUserProperties()
            .then(() => firebaseAnalytics.logEvent(name, params));
    }
};

export const screenRenderStart = () => Date.now();

export const logScreenEvent = (screenName, startTime) => {
    if (logAnalytics) {
        const timeTaken = startTime ? Date.now() - startTime : undefined;
        const buildType = ConfigModule?.BUILD_TYPE || 'unknown';
        const environment = Config.ENV || 'unknown';
        
        NetInfo.fetch().then(({isConnected}) =>
            setUserProperties()
                .then(() => firebaseAnalytics.logScreenView({
                    screen_name: screenName,
                    screen_class: screenName,
                    is_offline: (!isConnected).toString(),
                    build_type: buildType,
                    environment: environment,
                    ...(timeTaken !== undefined && {time_taken_ms: timeTaken})
                }))
        );
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
