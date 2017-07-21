import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path, {PathRoot} from "../framework/routing/Path";
import IndividualSearchView from "./individual/IndividualSearchView";
import MenuView from "./MenuView";
import {Tabs} from "native-base";
import themes from "./primitives/themes";
import CHSContainer from "./common/CHSContainer";
import CHSContent from "./common/CHSContent";
import {StatusBar} from "react-native";
import Styles from "./primitives/Styles";

@Path('/landingView')
@PathRoot
class LandingView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context);
    }

    viewName() {
        return "LandingView";
    }

    render() {
        return (
            <CHSContainer theme={themes}>
                <CHSContent>
                    <StatusBar backgroundColor={Styles.blackColor} barStyle="light-content"/>
                    <Tabs>
                        <IndividualSearchView tabLabel='Home' tabStyle={{backgroundColor: 'red'}}/>
                        <MenuView tabLabel='Menu'/>
                    </Tabs>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default LandingView;