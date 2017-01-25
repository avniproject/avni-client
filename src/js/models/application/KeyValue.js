class KeyValue {
    static schema = {
        name: 'KeyValue',
        properties: {
            key: 'string',
            value: 'string'
        }
    };

    static create(key, value) {
        const keyValue = new KeyValue();
        keyValue.key = key;
        keyValue.value = value;
        return keyValue;
    }
}

export default KeyValue;