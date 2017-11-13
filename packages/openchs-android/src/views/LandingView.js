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
class LandingView extends AbstractComponent {
    static propTypes = {
        tabIndex: React.PropTypes.number,
        menuProps: React.PropTypes.object
    };

    static defaultProps = {
        tabIndex: 0
    };

    constructor(props, context) {
        super(props, context);
        console.log("Landing view called with props", props)
    }

    viewName() {
        return "LandingView";
    }

    componentDidMount() {
        this._tabs.goToPage(this.props.tabIndex);
    }

    render() {
        return (
            <CHSContainer theme={themes}>
                <CHSContent>
                    <StatusBar backgroundColor={Styles.blackColor} barStyle="light-content"/>
                    <Tabs ref={ t => this._tabs = t }>
                        <IndividualSearchView tabLabel='Home' tabStyle={{backgroundColor: 'red'}}/>
                        <MenuView tabLabel='Menu' {...this.props.menuProps}/>
                    </Tabs>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default LandingView;