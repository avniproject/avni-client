class KeyValue {
    static schema = {
        name: 'KeyValue',
        properties: {
            key: 'string',
            value: 'string'
        }
    };

    static fromResource(resource) {
        const keyValue = new KeyValue();
        keyValue.key = resource.key;
        keyValue.value = JSON.stringify(resource.value);
        return keyValue;
    }

    getValue() {
        return JSON.parse(this.value);
    }
}

export default KeyValue;