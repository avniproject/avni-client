class Concepts {
    constructor(data) {
        this.data = data;
    }

    findByName(name) {
        return this.data.find(function (concept) {
            return name === concept.name;
        });
    }
}

export default Concepts;