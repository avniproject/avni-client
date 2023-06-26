import AsyncStorage from '@react-native-async-storage/async-storage';
import _ from 'lodash';
import {SubjectType} from 'openchs-models';
import General from '../utility/General';

class LocalCacheService {

  static async _storeData(key, value) {
    if(!key) {
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
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        return value;
      }
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

  static saveCurrentlySelectedSubjectType(subjectType) {
    if(!subjectType || !subjectType.uuid) {
      return false;
    }
    LocalCacheService._storeData(CacheKeys.SELECTED_SUBJECT_TYPE, subjectType.uuid);
  }
}

const CacheKeys = {
  SELECTED_SUBJECT_TYPE: `dashboard#selectedSubjectType`,
};

export default LocalCacheService;