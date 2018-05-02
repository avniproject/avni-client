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

    getValue() {

    }
}

export default StringKeyNumericValue;