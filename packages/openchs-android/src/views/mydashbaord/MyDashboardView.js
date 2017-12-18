import React from "react";
import {Text, View, StyleSheet} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import themes from "../primitives/themes";
import {MyDashboardActionNames as Actions} from "../../action/mydashboard/MyDashboardActions";
import AppHeader from "../common/AppHeader";
import Colors from '../primitives/Colors';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import Filters from "./Filters";

@Path('/MyDashboard')
class MyDashboardView extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "MyDashboard";
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.myDashboard);
    }

    static styles = StyleSheet.create({
        container: {}
    });

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD);
        super.componentWillMount();
    }

    render() {
        return (
            <CHSContainer theme={themes} style={{backgroundColor: Colors.TextOnPrimaryColor}}>
                <CHSContent>
                    <AppHeader title={this.I18n.t('dashboard')}/>
                    <View style={MyDashboardView.styles.container}>
                        <Filters/>
                    </View>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default MyDashboardView;