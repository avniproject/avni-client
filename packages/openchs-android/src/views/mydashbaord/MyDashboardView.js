import React from "react";
import {Text} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import themes from "../primitives/themes";
import AppHeader from "../common/AppHeader";
import Colors from '../primitives/Colors';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";

@Path('/MyDashboard')
class MyDashboardView extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "MyDashboard";
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.dashboard);
    }

    render() {
        return (
            <CHSContainer theme={themes} style={{backgroundColor: Colors.GreyBackground}}>
                <CHSContent>
                    <AppHeader title={this.I18n.t('dashboard')}/>
                    <Text style={{color: "black"}}>Hello to My Dashboard</Text>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default MyDashboardView;