import _ from 'lodash';

export default class Pin {
    constructor() {
        this.position = 0;
        this.values = ['', '', '', ''];
    }

    getCharacter(text) {
        const character = text.charAt(text.length - 1);
        return isNaN(character) ? '' : character;
    }

    setValue(text, index) {
        const character = this.getCharacter(text);
        if (!_.isEmpty(character)) {
            this.values[index] = character;
            this.position = _.min([this.values.length - 1, index + 1]);
        }
    }

    isFilled() {
        return _.findIndex(this.values, (value) => _.isEmpty(value)) === -1;
    }

    getValue() {
        return this.isFilled() ? _.toNumber(_.join(this.values, '')) : NaN;
    }
}