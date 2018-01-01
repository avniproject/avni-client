import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import {UserInfo} from "openchs-models";

@Service("userInfoService")
class UserInfoService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    init() {
    }

    getUserInfo() {
        const userInfo = this.db.objects(UserInfo.schema.name);
        if (userInfo === undefined || userInfo.length === 0) return UserInfo.createEmptyInstance();
        return userInfo[0];
    }

    saveOrUpdate(entity) {
        return super.saveOrUpdate(entity, UserInfo.schema.name);
    }
}

export default UserInfoService;