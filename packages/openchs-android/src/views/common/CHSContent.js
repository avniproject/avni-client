import React, {Component} from "react";

// This class is not needed anymore. It can be removed after merge is complete.
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
