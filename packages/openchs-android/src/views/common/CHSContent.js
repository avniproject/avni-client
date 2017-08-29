import React from "react";
import {Content} from "native-base";


class CHSContent extends Content {
    static defaultProps = {
        keyboardShouldPersistTaps: "always"
    };
}

export default CHSContent;