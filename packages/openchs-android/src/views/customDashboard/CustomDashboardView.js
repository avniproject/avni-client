import AbstractComponent from "../../framework/view/AbstractComponent";
import CHSContainer from "../common/CHSContainer";
import AppHeader from "../common/AppHeader";
import React from "react";
import Reducers from "../../reducer";
import {CustomDashboardActionNames as Actions} from "../../action/customDashboard/CustomDashboardActions";
import {SafeAreaView, ScrollView, StyleSheet, Text, View} from "react-native";
import _ from "lodash";
import CustomDashboardTab from "./CustomDashboardTab";
import {DashboardSection} from 'avni-models';
import TypedTransition from "../../framework/routing/TypedTransition";
import CHSNavigator from "../../utility/CHSNavigator";
import Colors from "../primitives/Colors";
import CustomActivityIndicator from "../CustomActivityIndicator";
import GlobalStyles from "../primitives/GlobalStyles";
import ApprovalListingView from "../../views/approval/ApprovalListingView";
import IndividualSearchResultPaginatedView from "../../views/individual/IndividualSearchSeasultPaginatedView";
import IndividualListView from "../individuallist/IndividualListView";
import Styles from "../primitives/Styles";
import EntityService from "../../service/EntityService";
import CustomDashboardCard from "./CustomDashboardCard";
import CommentListView from "../comment/CommentListView";
import {YearReviewBanner} from "../yearReview/YearReviewBanner";
import Path from "../../framework/routing/Path";
import TaskListView from "../task/TaskListView";

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
        this.refreshCounts();
        super.componentWillMount();
    }

    refreshCounts() {
        this.dispatchAction(Actions.REMOVE_OLDER_COUNTS);
        setTimeout(() => this.dispatchAction(Actions.REFRESH_COUNT), 500);
    }

    onDashboardNamePress(uuid) {
        this.dispatchAction(Actions.ON_DASHBOARD_CHANGE, {dashboardUUID: uuid});
        this.refreshCounts();
    }

    renderDashboards() {
        return _.map(this.state.dashboards, dashboard =>
            <CustomDashboardTab
                key={dashboard.uuid}
                dashboard={dashboard}
                activeDashboardUUID={this.state.activeDashboardUUID}
                onDashboardNamePress={this.onDashboardNamePress.bind(this)}/>
        );
    }

    renderSectionName(name, description, viewType) {
        return viewType === DashboardSection.viewTypeName.Default ? null :
            <View>
                {name ? <Text style={styles.sectionNameTextStyle}>{name}</Text> : null}
                {description ? <Text>{description}</Text> : null}
            </View>
    }

    renderCards() {
        const activeDashboardSectionMappings = _.filter(this.state.reportCardSectionMappings, ({dashboardSection}) => this.state.activeDashboardUUID === dashboardSection.dashboard.uuid);
        const sectionWiseData = _.chain(activeDashboardSectionMappings)
            .groupBy(({dashboardSection}) => dashboardSection.uuid)
            .map((groupedData, sectionUUID) => {
                const sections = this.getService(EntityService).findByUUID(sectionUUID, DashboardSection.schema.name);
                const cards = _.map(_.sortBy(groupedData, 'displayOrder'), ({card}) => card);
                return {...sections, cards};
            })
            .sortBy('displayOrder')
            .value();

        return (
            <View style={styles.container}>
                {_.map(sectionWiseData, ({uuid, name, description, viewType, cards}) => (
                    <View key={uuid} style={styles.sectionContainer}>
                        {viewType !== DashboardSection.viewTypeName.Default &&
                        this.renderSectionName(name, description, viewType)}
                        <View style={styles.cardContainer}>
                            {_.map(cards, (card, index) => (
                                <CustomDashboardCard
                                    key={card.uuid}
                                    reportCard={card}
                                    onCardPress={this.onCardPress.bind(this)}
                                    index={index}
                                    viewType={viewType}
                                />
                            ))}
                        </View>
                    </View>
                ))}
            </View>
        )
    }

    getViewByName(viewName) {
        const viewNameMap = {
            'ApprovalListingView': ApprovalListingView,
            'IndividualSearchResultPaginatedView': IndividualSearchResultPaginatedView,
            'IndividualListView': IndividualListView,
            'CommentListView': CommentListView
        };
        return viewNameMap[viewName]
    }

    onBackPress() {
        this.goBack();
    }

    didFocus() {
        this.refreshCounts();
    }

    onCardPress(reportCardUUID) {
        this.dispatchAction(Actions.LOAD_INDICATOR, {loading: true});
        return setTimeout(() => this.dispatchAction(Actions.ON_CARD_PRESS, {
            reportCardUUID,
            goToTaskLists: (taskTypeType) => {
                TypedTransition.from(this).with({
                    taskTypeType: taskTypeType,
                    backFunction: this.onBackPress.bind(this),
                    indicatorActionName: Actions.LOAD_INDICATOR
                }).to(TaskListView);
            },
            cb: (results, count, status, viewName) => TypedTransition.from(this).with({
                indicatorActionName: Actions.LOAD_INDICATOR,
                headerTitle: status || 'subjectsList',
                results: results,
                totalSearchResultsCount: count,
                reportCardUUID,
                listType: _.lowerCase(status),
                backFunction: this.onBackPress.bind(this),
                onIndividualSelection: (source, individual) => CHSNavigator.navigateToProgramEnrolmentDashboardView(source, individual.uuid),
                onApprovalSelection: (source, entity, schema) => CHSNavigator.navigateToApprovalDetailsView(source, entity, schema),
            }).to(this.getViewByName(viewName), true)
        }), 0);
    }

    renderZeroResultsMessageIfNeeded() {
        if (_.size(this.state.dashboards) === 0)
            return (
                <View>
                    <Text
                        style={GlobalStyles.emptyListPlaceholderText}>{this.I18n.t('dashboardsNotAvailable')}</Text>
                </View>
            );
        else
            return (<View/>);
    }

    render() {
        const title = this.props.title || 'dashboards';
        return (
            <CHSContainer style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t(title)}
                           hideBackButton={this.props.hideBackButton}
                           startSync={this.props.startSync}
                           renderSync={this.props.renderSync}
                           icon={this.props.icon}
                           hideIcon={_.isNil(this.props.icon)}/>
                {this.props.onlyPrimary && <YearReviewBanner t={this.I18n.t} from={this}/>}
                {!this.props.onlyPrimary &&
                <SafeAreaView style={{height: 50}}>
                    <ScrollView horizontal style={{backgroundColor: Colors.cardBackgroundColor}}>
                        {this.renderDashboards()}
                        {this.renderZeroResultsMessageIfNeeded()}
                    </ScrollView>
                </SafeAreaView>}
                <View style={{marginBottom: 140}}>
                    <CustomActivityIndicator loading={this.state.loading}/>
                    <ScrollView>
                        {this.renderCards()}
                    </ScrollView>
                </View>
            </CHSContainer>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: Styles.ContainerHorizontalDistanceFromEdge
    },
    sectionContainer: {
        marginVertical: Styles.ContainerHorizontalDistanceFromEdge,
        flexDirection: 'column'
    },
    sectionNameTextStyle: {
        fontSize: Styles.normalTextSize,
        fontStyle: 'normal',
        fontWeight: 'bold',
        color: Styles.blackColor,
        opacity: 0.8
    },
    cardContainer: {
        marginVertical: 20,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    }
});

export default CustomDashboardView
