import React from "react"; import PropTypes from 'prop-types';
import {Content} from "native-base";


class CHSContent extends Content {
    static defaultProps = {
        keyboardShouldPersistTaps: "always"
    };
}

export default CHSContent;