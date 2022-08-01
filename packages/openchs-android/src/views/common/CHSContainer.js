import PropTypes from "prop-types";
import React from "react";
import {Container} from "native-base";
import getTheme from './../../../native-base-theme/components';
import themes from "./../primitives/themes";
import customVariables from "./../../../native-base-theme/variables/platform";
import {NativeBaseProvider} from 'native-base';

class CHSContainer extends React.Component {

    static propTypes = {
        style: PropTypes.object,
    };

    render() {
        return (
            <NativeBaseProvider>
                <Container style={this.props.style}>
                    {this.props.children}
                </Container>
            </NativeBaseProvider>
        );
    }
}

export default CHSContainer;
