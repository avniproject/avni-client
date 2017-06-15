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
        try {
            return JSON.parse(this.value);
        } catch (e) {
            return this.value;
        }
    }
}

export default KeyValue;