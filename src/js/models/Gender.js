class Gender {
    static schema = {
        name: "Gender",
        primaryKey: 'uuid',
        properties: {
            uuid: "string",
            title: "string",
            lastModifiedDateTime: "date"
        }
    };

    static create(genderResource) {
        var gender = new Gender();
        gender.name = genderResource.name;
        gender.uuid = genderResource.uuid;
        gender.lastModifiedDateTime = genderResource.lastModifiedDateTime;
        return gender;
    }
}

export default Gender;