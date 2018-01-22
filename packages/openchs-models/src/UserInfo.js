class UserInfo {
    static UUID = 'ce9ad8ee-193e-49ee-8626-49802c8b4bd7';

    static schema = {
        name: "UserInfo",
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            catchmentType: "string",
            organisationName: "string"
        }
    };

    static fromResource(resource) {
        let userInfo = new UserInfo();
        userInfo.uuid = UserInfo.UUID;
        userInfo.catchmentType = resource.catchmentType;
        userInfo.organisationName = resource.organisationName;
        return userInfo;
    }

    clone() {
        let userInfo = new UserInfo();
        userInfo.uuid = this.uuid;
        userInfo.catchmentType = this.catchmentType;
        userInfo.organisationName = this.organisationName;
        return userInfo;
    }

    static createEmptyInstance() {
        let userInfo = new UserInfo();
        userInfo.catchmentType = "Villages";
        return userInfo;
    }

}

export default UserInfo;