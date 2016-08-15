import _ from 'lodash';

class Answer {
    constructor(value) {
        this.value = value;
    }

    isNilOrEmpty() {
        return _.isNil(this.value) || _.isEmpty(_.trim(this.value));
    }
}

export default Answer;