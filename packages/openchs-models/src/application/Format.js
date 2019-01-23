import _ from 'lodash';

class Format {
    static map = new Map();

    static schema = {
        name: 'Format',
        properties: {
            regex: 'string',
            descriptionKey: 'string'
        }
    };

    static fromResource(resource) {
        if(_.isNil(resource)) return null;
        const format = new Format();
        format.regex = resource.regex;
        format.descriptionKey = resource.descriptionKey;
        return format;
    }

    valid(value) {
        let regexp = Format.map.get(this.regex);
        if (_.isNil(regexp)) {
            regexp = new RegExp(this.regex);
            Format.map.set(this.regex, regexp);
        }
        return regexp.test(value);
    }
}

export default Format;