class UserInfo {
    static UUID = 'ce9ad8ee-193e-49ee-8626-49802c8b4bd7';

    static schema = {
        name: "UserInfo",
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            organisationName: "string"
        }
    };

    static fromResource(resource) {
        let userInfo = new UserInfo();
        userInfo.uuid = UserInfo.UUID;
        userInfo.organisationName = resource.organisationName;
        return userInfo;
    }

    clone() {
        let userInfo = new UserInfo();
        userInfo.uuid = this.uuid;
        userInfo.organisationName = this.organisationName;
        return userInfo;
    }

    static createEmptyInstance() {
        return new UserInfo();
    }

}

export default UserInfo;