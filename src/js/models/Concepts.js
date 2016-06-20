class Concepts {
    constructor(data) {
        this.data = data;
    }

    findByName(name) {
        return this.data.find(function (x) {
            return name === x.name;
        });
    }
}

export default Concepts;