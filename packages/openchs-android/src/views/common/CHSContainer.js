import PropTypes from "prop-types";
import React, {createContext, useContext} from "react";
import {Box, NativeBaseProvider} from "native-base";
import {useEdgeToEdgeNavBarInset} from "../primitives/Distances";

// Set once an enclosing container has already moved its subtree off the window edge, so the strip is
// reserved once rather than once per level. The measured inset cannot decide that on its own:
// NativeBaseProvider seeds every SafeAreaProvider it renders — nested ones included — with the
// full-window initialWindowMetrics, so a nested container would read the whole inset and reserve it a
// second time until its own measurement lands a frame later. LandingView nests four screens this way.
const NavBarInsetReserved = createContext(false);

// The strip is a transparent border rather than padding because the screens that break under
// edge-to-edge anchor their buttons with position:absolute, and Yoga resolves those insets against the
// padding box — it subtracts the container's border but not its padding.
const ScreenBox = ({style, onLayout, children}) => {
    const alreadyReserved = useContext(NavBarInsetReserved);
    const navBarInset = useEdgeToEdgeNavBarInset();
    return (
        <NavBarInsetReserved.Provider value={true}>
            <Box style={[style, {borderBottomWidth: alreadyReserved ? 0 : navBarInset, borderBottomColor: 'transparent'}]}
                 flex={1}
                 onLayout={onLayout}>
                {children}
            </Box>
        </NavBarInsetReserved.Provider>
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
