import AsyncStorage from '@react-native-async-storage/async-storage';
import _ from 'lodash';
import {SubjectType} from 'openchs-models';
import General from '../utility/General';

class LocalCacheService {
    static async _storeData(key, value) {
        if (!key) {
            return false;
        }
        try {
            await AsyncStorage.setItem(key, value);
            return true;
        } catch (error) {
            General.logDebug('LocalCacheService', `Error while storing data with key ${key}`);
            General.logDebug('LocalCacheService', error);
        }
        return false;
    };

    static async _storeObjectData(key, value) {
        return LocalCacheService._storeData(key, value ? JSON.stringify(value) : null);
    };

    static async _getData(key) {
        try {
            return await AsyncStorage.getItem(key);
        } catch (error) {
            General.logDebug('LocalCacheService', `Error while retrieving data with key ${key}`);
            General.logDebug('LocalCacheService', error);
        }
        return null;
    };

    static async _getObjectData(key) {
        let data = LocalCacheService._getData(key);
        try {
            return data && JSON.parse(data);
        } catch (error) {
            General.logDebug('LocalCacheService', `Error while parsing data with key ${key}`);
            General.logDebug('LocalCacheService', error);
        }
        return null;
    };

    static async getPreviouslySelectedSubjectTypeUuid() {
        return LocalCacheService._getData(CacheKeys.SELECTED_SUBJECT_TYPE);
    }

    static async saveCurrentlySelectedSubjectType(subjectType) {
        if (!subjectType || !subjectType.uuid) {
            return false;
        }
        return await LocalCacheService._storeData(CacheKeys.SELECTED_SUBJECT_TYPE, subjectType.uuid);
    }

    static async hasRegisterButtonGuideBeenShown() {
        const value = await LocalCacheService._getData(CacheKeys.REGISTER_BUTTON_GUIDE_SHOWN);
        return value === 'true';
    }

    static async markRegisterButtonGuideAsShown() {
        return await LocalCacheService._storeData(CacheKeys.REGISTER_BUTTON_GUIDE_SHOWN, 'true');
    }

    // Set while a full page's rule runs. Still set on the next start means the app was closed during the run.
    static async isFullPageRunning(dashboardUUID) {
        return (await LocalCacheService._getData(fullPageRunningKey(dashboardUUID))) === 'true';
    }

    static async markFullPageRunning(dashboardUUID) {
        return LocalCacheService._storeData(fullPageRunningKey(dashboardUUID), 'true');
    }

    static async clearFullPageRunning(dashboardUUID) {
        try {
            await AsyncStorage.removeItem(fullPageRunningKey(dashboardUUID));
        } catch (error) {
            General.logDebug('LocalCacheService', error);
        }
    }

    static async clearAllFullPageRunning() {
        try {
            const keys = await AsyncStorage.getAllKeys();
            await AsyncStorage.multiRemove(_.filter(keys, (key) => _.startsWith(key, FULL_PAGE_RUNNING_PREFIX)));
        } catch (error) {
            General.logDebug('LocalCacheService', error);
        }
    }

    static async clearCache() {
        try {
            const keys = Object.values(CacheKeys);
            await AsyncStorage.multiRemove(keys);
        } catch (error) {
            General.logDebug('LocalCacheService', 'Error while clearing cache');
            General.logDebug('LocalCacheService', error);
        }
    }

    static getPreviouslySelectedSubjectType(allowedSubjectTypes, cachedSubjectTypeUUID) {
        if (!allowedSubjectTypes || _.isEmpty(allowedSubjectTypes)) {
            return SubjectType.create("");
        }
        const fallbackSubjectType = allowedSubjectTypes[0];
        const cachedSubjectType = cachedSubjectTypeUUID && _.find(allowedSubjectTypes, subjectType => subjectType.uuid === cachedSubjectTypeUUID);
        return cachedSubjectType || fallbackSubjectType || SubjectType.create("");
    }
}

const FULL_PAGE_RUNNING_PREFIX = 'dashboard#fullPageRunning#';
const fullPageRunningKey = (dashboardUUID) => `${FULL_PAGE_RUNNING_PREFIX}${dashboardUUID}`;

const CacheKeys = {
    SELECTED_SUBJECT_TYPE: `dashboard#selectedSubjectType`,
    REGISTER_BUTTON_GUIDE_SHOWN: `guide#registerButtonGuideShown`,
};

export default LocalCacheService;
