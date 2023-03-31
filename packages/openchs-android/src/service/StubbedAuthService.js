import Service from "../framework/bean/Service";
import BaseAuthProviderService from "./BaseAuthProviderService";
import General from "../utility/General";

@Service("stubbedAuthService")
class StubbedAuthService extends BaseAuthProviderService {
    constructor( db, context ) {
        super(db, context);
    }

    async authenticate( userId, password ) {
        await super.persistUserId(userId);
        return {status: "LOGIN_SUCCESS"};
    }

    async userExists() {
        return true;
    }

    async getAuthToken() {
        return this.getUserName();
    }

    async refreshToken() {
        General.logError("Unsupported operation for stubbed auth");
    }

    async changePassword() {
        General.logError("Unsupported operation for stubbed auth");
    }

    async logout() {
        General.logDebug('StubbedAuth logout');
    }
}

export default StubbedAuthService;