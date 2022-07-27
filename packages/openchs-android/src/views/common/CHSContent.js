import React from 'react';
import {Content} from 'native-base';


class CHSContent extends Content {
    static defaultProps = {
        keyboardShouldPersistTaps: "handled"
    };
}

export default CHSContent;
