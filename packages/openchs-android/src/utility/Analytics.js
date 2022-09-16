import {UserInfo} from 'openchs-models';
import analytics from "@react-native-firebase/analytics";
import {defaultTo, isEmpty, noop} from 'lodash';
import Config from "../framework/Config";
import RealmFactory from "../framework/db/RealmFactory";

const db = RealmFactory.createRealm();;
const firebaseAnalytics = analytics();
const logAnalytics = Config.ENV === 'prod' || Config.debugFirebaseAnalyticsEvents === true;

const getUserInfo = () => {
    const defaultOrg = {organisationName: ''};
    try {
        const userInfo = db.objects(UserInfo.schema.name);
        return defaultTo(userInfo[0], defaultOrg);
    } catch (e) {
        return defaultOrg;
    }
};

const setUserProperties = () => {
    const userInfo = getUserInfo();
    return firebaseAnalytics.setUserProperty("organisation", userInfo.organisationName);
};

export const logEvent = (name, params) => {
    if (logAnalytics) {
        setUserProperties()
            .then(() => firebaseAnalytics.logEvent(name, params));
    }
};

export const logScreenEvent = (screenName) => {
    if (logAnalytics) {
        setUserProperties()
            .then(() => firebaseAnalytics.logScreenView({screen_name: screenName, screen_class: screenName}));
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
