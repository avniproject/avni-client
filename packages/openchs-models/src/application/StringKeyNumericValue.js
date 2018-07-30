class StringKeyNumericValue {
    static schema = {
        name: 'StringKeyNumericValue',
        properties: {
            key: 'string',
            value: 'double'
        }
    };

    static fromResource(key, value) {
        const stringKeyNumericValue = new StringKeyNumericValue();
        stringKeyNumericValue.key = key;
        stringKeyNumericValue.value = value;
        return stringKeyNumericValue;
    }

    get toResource() {
        const resource = {};
        resource[this.key] = this.value;
        return resource;
    }

    getValue() {

    }
}

export default StringKeyNumericValue;