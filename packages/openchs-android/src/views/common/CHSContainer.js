import PropTypes from "prop-types";
import React from "react";
import {Container} from "native-base";
import getTheme from './../../../native-base-theme/components';
import themes from "./../primitives/themes";
import customVariables from "./../../../native-base-theme/variables/platform";
import {NativeBaseProvider, Box} from 'native-base';

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
