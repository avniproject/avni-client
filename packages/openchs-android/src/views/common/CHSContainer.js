import PropTypes from "prop-types";
import React from "react";
import {Box, NativeBaseProvider} from "native-base";

class CHSContainer extends React.Component {

    static propTypes = {
        style: PropTypes.object,
    };

    render() {
        return (
            <NativeBaseProvider>
                    <Box style={this.props.style} flex={1}>
                        {this.props.children}
                    </Box>
            </NativeBaseProvider>
        );
    }
}

export default CHSContainer;
