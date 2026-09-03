import PropTypes from "prop-types";
import React from "react";
import {Box, NativeBaseProvider} from "native-base";
import {useEdgeToEdgeNavBarInset} from "../primitives/Distances";

// The strip is reserved with a transparent border rather than padding because the screens that break
// under edge-to-edge anchor their buttons with position:absolute, and Yoga resolves those insets
// against the padding box — it subtracts the container's border but not its padding. Backgrounds
// paint across a border, so the strip still carries the screen's own colour.
// A nested container reserves nothing: the outer one has already moved it off the window edge.
const ScreenBox = ({style, onLayout, children}) => {
    const navBarInset = useEdgeToEdgeNavBarInset();
    return (
        <Box style={[style, {borderBottomWidth: navBarInset, borderBottomColor: 'transparent'}]}
             flex={1}
             onLayout={onLayout}>
            {children}
        </Box>
    );
};

class CHSContainer extends React.Component {

    static propTypes = {
        style: PropTypes.object,
        onLayout: PropTypes.func
    };

    render() {
        return (
            <NativeBaseProvider>
                <ScreenBox style={this.props.style} onLayout={this.props.onLayout}>
                    {this.props.children}
                </ScreenBox>
            </NativeBaseProvider>
        );
    }
}

export default CHSContainer;
