import React from "react";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path from "../framework/routing/Path";
import IndividualSearchView from "./individual/IndividualSearchView";
import MenuView from "./MenuView";
import {Tabs} from "native-base";
import themes from "./primitives/themes";
import CHSContainer from "./common/CHSContainer";
import CHSContent from "./common/CHSContent";
import {StatusBar} from "react-native";
import Styles from "./primitives/Styles";
import CHSNavigator from "../utility/CHSNavigator";
import AuthService from "../service/AuthService";
import bugsnag from "../utility/bugsnag";
import General from "../utility/General";
import {LandingViewActionsNames as Actions} from "../action/LandingViewActions";
import Reducers from "../reducer";
import RegistrationFAB from "./individual/RegistrationFAB";


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
        super(props, context, Reducers.reducerKeys.landingView);
    }

    viewName() {
        return "LandingView";
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD);
        const authService = this.context.getService(AuthService);
        authService.getUserName().then(username => {
            bugsnag.setUser(username, username, username);
        });

        return super.componentWillMount();
    }

    componentDidMount() {
        this._tabs.goToPage(this.props.tabIndex);
    }

    render() {
        General.logDebug("LandingView", "render");
        return (
            <CHSContainer theme={themes}>
                <StatusBar backgroundColor={Styles.blackColor} barStyle="light-content"/>
                <Tabs ref={ t => this._tabs = t }>
                    <IndividualSearchView
                        tabLabel={this.I18n.t('home')}
                        tabStyle={{backgroundColor: 'red'}}
                        onIndividualSelection={(source, individual) => CHSNavigator.navigateToProgramEnrolmentDashboardView(source, individual.uuid)}
                    />
                    <MenuView tabLabel={this.I18n.t('menu')} {...this.props.menuProps}/>
                </Tabs>
                {/*<RegistrationFAB parent={this}/>*/}
            </CHSContainer>
        );
    }
}

export default LandingView;
