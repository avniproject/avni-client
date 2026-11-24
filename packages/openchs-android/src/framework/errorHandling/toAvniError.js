import _ from 'lodash';
import AvniError from './AvniError';
import ErrorUtil from './ErrorUtil';

const toAvniError = (error) => {
    try {
        return ErrorUtil.getAvniErrorSync(error);
    } catch (e) {
        const message = _.get(error, "message", String(error));
        return AvniError.create(message, message);
    }
};

export default toAvniError;
