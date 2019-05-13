import PropTypes from "prop-types";
import React from "react";
import {Container, StyleProvider} from "native-base";
import getTheme from './../../../native-base-theme/components';
import themes from "./../primitives/themes";
import customVariables from "./../../../native-base-theme/variables/platform";


class CHSContainer extends React.Component {

    //Capuchin patch. Container does not allow custom Contents within them.
    renderContent() {
        return this.props.children;
    }

    render() {
        return (
            <StyleProvider style={getTheme({...customVariables, ...themes})}>
                <Container>
                    {this.props.children}
                </Container>
            </StyleProvider>
        );
    }
}

export default CHSContainer;