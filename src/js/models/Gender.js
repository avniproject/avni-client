class Gender {
    static schema = {
        name: "Gender",
        primaryKey: 'uuid',
        properties: {
            uuid: "string",
            name: "string"
        }
    };

    static fromResource(genderResource) {
        var gender = new Gender();
        gender.name = genderResource.name;
        gender.uuid = genderResource.uuid;
        return gender;
    }
}

export default Gender;