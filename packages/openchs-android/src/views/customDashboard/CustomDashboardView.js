import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AppHeader from "../common/AppHeader";
import React from "react";
import Reducers from "../../reducer";
import {CustomDashboardActionNames as Actions} from "../../action/customDashboard/CustomDashboardActions";
import {ScrollView, View, SafeAreaView} from "react-native";
import _ from "lodash";
import CustomDashboardTab from "./CustomDashboardTab";
import CustomDashboardCard from "./CustomDashboardCard";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualSearchResultsView from "../individual/IndividualSearchResultsView";
import CHSNavigator from "../../utility/CHSNavigator";
import Colors from "../primitives/Colors";
import Separator from "../primitives/Separator";

@Path('/customDashboardView')
class CustomDashboardView extends AbstractComponent {

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.customDashboard);
    }

    viewName() {
        return 'CustomDashboardView';
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
        super.componentWillMount();
    }

    onDashboardNamePress(uuid) {
        this.dispatchAction(Actions.ON_DASHBOARD_CHANGE, {dashboardUUID: uuid})
    }

    renderDashboards() {
        return _.map(this.state.dashboards, dashboard =>
            <CustomDashboardTab
                dashboard={dashboard}
                activeDashboardUUID={this.state.activeDashboardUUID}
                onDashboardNamePress={this.onDashboardNamePress.bind(this)}/>
        );
    }

    renderCards() {
        return _.map(this.state.reportCards, reportCard =>
            <CustomDashboardCard
                reportCard={reportCard}
                onCardPress={this.onCardPress.bind(this)}/>
        );
    }

    onCardPress(reportCardUUID) {
        return this.dispatchAction(Actions.ON_CARD_PRESS, {
            reportCardUUID,
            cb: (individualSearchResults, count) => TypedTransition.from(this).with({
                headerTitle: 'subjectsList',
                searchResults: individualSearchResults,
                totalSearchResultsCount: count,
                onIndividualSelection: (source, individual) => CHSNavigator.navigateToProgramEnrolmentDashboardView(source, individual.uuid)
            }).to(IndividualSearchResultsView, true)
        });
    }

    render() {
        return (
            <CHSContainer style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t('dashboards')}/>
                <SafeAreaView style={{height: 50}}>
                    <ScrollView horizontal style={{backgroundColor: Colors.cardBackgroundColor}}>
                        {this.renderDashboards()}
                    </ScrollView>
                </SafeAreaView>
                <CHSContent>
                    <ScrollView>
                        {this.renderCards()}
                    </ScrollView>
                </CHSContent>
            </CHSContainer>
        );
    }
}


export default CustomDashboardView
