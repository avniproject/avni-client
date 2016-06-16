class Concepts {
    constructor(data, locale) {
        this.data = data;
        this.locale = locale;
    }

    findByName(name) {
        return this.data.find(function (x) {
            return name === x.name;
        });
    }
}

export default Concepts;