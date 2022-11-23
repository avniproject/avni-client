import PropTypes from 'prop-types';
import React, {Component} from "react";
import {Container, Box} from "native-base";


class CHSContent extends Component {
    static defaultProps = {
        keyboardShouldPersistTaps: "handled"
    };

    constructor(props) {
        super(props);
    }

    render() {
        return <>
            {this.props.children}
        </>;
    }
}

export default CHSContent;
