import PropTypes from 'prop-types';
import React, {Component} from "react";
import {Box} from "native-base";


class CHSContent extends Component {
    static defaultProps = {
        keyboardShouldPersistTaps: "handled"
    };

    constructor(props) {
        super(props);
    }

    render() {
        return <Box>
            {this.props.children}
        </Box>;
    }
}

export default CHSContent;
