import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {UserInfo} from 'avni-models';

@Service("userInfoService")
class UserInfoService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    init() {
    }

    getUserInfo() {
        const userInfo = this.findAll(UserInfo.schema.name);
        if (userInfo === undefined || userInfo.length === 0) return UserInfo.createEmptyInstance();
        return userInfo[0];
    }

    getUserSettings() {
        return this.getUserInfo().getSettings();
    }

    getUserSyncSettings() {
        return this.getUserInfo().getSyncSettings();
    }

    getSyncConcept1Values() {
        return _.get(this.getUserSyncSettings(), 'syncConcept1Values', []);
    }

    getSyncConcept2Values() {
        return _.get(this.getUserSyncSettings(), 'syncConcept2Values', []);
    }

    saveOrUpdate(entity) {
        return super.saveOrUpdate(entity, UserInfo.schema.name);
    }
}

export default UserInfoService;
