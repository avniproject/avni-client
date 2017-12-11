class Format {
    static schema = {
        name: 'Format',
        properties: {
            regex: 'string',
            descriptionKey: 'string'
        }
    };

    static fromResource(resource) {
        const format = new Format();
        format.regex = resource.regex;
        format.descriptionKey = resource.descriptionKey;
        return format;
    }

    valid(value){
        return new RegExp(this.regex).test(value)
    }
}

export default Format;