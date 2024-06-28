import AbstractComponent from "../../framework/view/AbstractComponent";
import CHSContainer from "../common/CHSContainer";
import AppHeader from "../common/AppHeader";
import React, {Fragment} from "react";
import Reducers from "../../reducer";
import {CustomDashboardActionNames as Actions} from "../../action/customDashboard/CustomDashboardActions";
import {SafeAreaView, ScrollView, StyleSheet, Text, TouchableNativeFeedback, View} from "react-native";
import _ from "lodash";
import CustomDashboardTab from "./CustomDashboardTab";
import {DashboardSection} from 'openchs-models';
import TypedTransition from "../../framework/routing/TypedTransition";
import CHSNavigator from "../../utility/CHSNavigator";
import Colors from "../primitives/Colors";
import CustomActivityIndicator from "../CustomActivityIndicator";
import GlobalStyles from "../primitives/GlobalStyles";
import ApprovalListingView from "../../views/approval/ApprovalListingView";
import IndividualSearchResultPaginatedView from "../individual/IndividualSearchResultPaginatedView";
import IndividualListView from "../individuallist/IndividualListView";
import Styles from "../primitives/Styles";
import EntityService from "../../service/EntityService";
import CommentListView from "../comment/CommentListView";
import Path from "../../framework/routing/Path";
import TaskListView from "../task/TaskListView";
import FiltersViewV2 from "../filter/FiltersViewV2";
import ChecklistListingView from "../checklist/ChecklistListingView";
import {FilterActionNames} from '../../action/mydashboard/FiltersActionsV2';
import Distances from '../primitives/Distances';
import AppliedFiltersV2 from '../filter/AppliedFiltersV2';
import General from "../../utility/General";
import {CustomDashboardType} from "../../service/customDashboard/CustomDashboardService";
import MCIIcon from "react-native-vector-icons/MaterialCommunityIcons";
import Line from '../common/Line';
import {CardTileView} from './CardTileView';
import {CardListView} from './CardListView';

const viewNameMap = {
    'ApprovalListingView': ApprovalListingView,
    'IndividualSearchResultPaginatedView': IndividualSearchResultPaginatedView,
    'IndividualListView': IndividualListView,
    'CommentListView': CommentListView,
    'ChecklistListingView': ChecklistListingView
};

function SubHeader({I18n, onFilterPressed}) {
    const filterLabelStyle = {
        paddingLeft: 15,
        color: Styles.grey,
        fontSize: Styles.normalTextSize,
        fontWeight: 'bold',
        textTransform: 'uppercase'
    };
    return <TouchableNativeFeedback onPress={() => onFilterPressed()}>
        <View style={{
            backgroundColor: Colors.SubHeaderBackground,
            flexDirection: 'row',
            justifyContent: 'space-between',
            minHeight: 45,
            alignItems: 'center',
            marginRight: 20
        }}>
            <Text style={filterLabelStyle}>{I18n.t('filter')}</Text>
            <MCIIcon style={{fontSize: 30, color: Colors.DullIconColor}} name='tune'/>
        </View>
    </TouchableNativeFeedback>;
}

@Path('/customDashboardView')
class CustomDashboardView extends AbstractComponent {
    static styles = StyleSheet.create({
        itemContent: {
            flexDirection: 'column',
            borderBottomWidth: 1,
            borderColor: Colors.InputBorderNormal,
            backgroundColor: Styles.greyBackground,
            paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
            paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems,
            elevation: 2,
            minWidth: '95%',
            minHeight: 60
        },
        buttons: {
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 8,
        },
        filterButton: {
            paddingHorizontal: 8,
            paddingVertical: 4,
            backgroundColor: Colors.ActionButtonColor,
            borderRadius: 3
        },
        buttonText: {
            color: Colors.TextOnPrimaryColor,
            fontSize: Styles.normalTextSize
        }
    });

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.customDashboard);
    }

    defaultProps = {
        showSearch: false
    };

    viewName() {
        return 'CustomDashboardView';
    }

    UNSAFE_componentWillMount() {
        const {customDashboardType} = this.props;
        this.dispatchAction(Actions.ON_LOAD, {customDashboardType});
        this.refreshCounts();
        super.UNSAFE_componentWillMount();
    }

    onClearFilters() {
        this.dispatchAction(Actions.ON_DASHBOARD_CHANGE, {dashboardUUID: this.state.activeDashboardUUID});
        this.refreshCounts();
    }

    refreshCounts() {
        this.dispatchAction(Actions.REMOVE_OLDER_COUNTS);
        setTimeout(() => this.dispatchAction(Actions.REFRESH_COUNT), 500);
    }

    onDashboardNamePress(uuid) {
        this.dispatchAction(FilterActionNames.ON_LOAD, {dashboardUUID: uuid});
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
                {name ? <Text style={styles.sectionNameTextStyle}>{this.I18n.t(name)}</Text> : null}
                {description ? <Text>{this.I18n.t(description)}</Text> : null}
            </View>
    }

    renderCards() {
        const splitNestedCards = (cardIter) => {
            const repeatTimes = cardIter.nested ? cardIter.countOfCards : 1;
            return Array(repeatTimes).fill(cardIter).map((card, i) => ({...card.toJSON(), itemKey: card.getCardId(i)}));
        }
        const activeDashboardSectionMappings = _.filter(this.state.reportCardSectionMappings, ({dashboardSection}) => this.state.activeDashboardUUID === dashboardSection.dashboard.uuid);
        const sectionWiseData = _.chain(activeDashboardSectionMappings)
            .groupBy(({dashboardSection}) => dashboardSection.uuid)
            .map((groupedData, sectionUUID) => {
                const section = this.getService(EntityService).findByUUID(sectionUUID, DashboardSection.schema.name);
                const cardsWithNestedContent = _.map(_.sortBy(groupedData, 'displayOrder'), ({card}) => card);
                const cards = _.flatMap(cardsWithNestedContent, splitNestedCards);
                return {section, cards};
            })
            .sortBy('section.displayOrder')
            .value();
        const onCardPressOp = _.debounce(this.onCardPress.bind(this), 500);

        return (
            <View style={styles.container}>
                {_.map(sectionWiseData, ({section, cards}) => (
                        <View key={section.uuid} style={styles.sectionContainer}>
                            {section.viewType !== DashboardSection.viewTypeName.Default &&
                                this.renderSectionName(section.name, section.description, section.viewType, cards)}
                            <View style={section.viewType === 'Tile'? styles.cardContainer: styles.listContainer}>
                                {_.map(cards, (card, index) => {
                                    return section.viewType === 'Tile' ?
                                        <CardTileView key={card.itemKey} reportCard={card} I18n={this.I18n}
                                                      onCardPress={onCardPressOp}
                                                      index={index}
                                                      countResult={this.state.cardToCountResultMap[card.itemKey]}/> :
                                        <CardListView key={card.itemKey} reportCard={card} I18n={this.I18n}
                                                      onCardPress={onCardPressOp}
                                                      countResult={this.state.cardToCountResultMap[card.itemKey]}
                                                      index={index} isLastCard={index === cards.length - 1}/>;

                                })}
                            </View>
                        </View>
                    )
                )}
            </View>
        )
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
            goToTaskLists: (taskTypeType, reportFilters) => {
                TypedTransition.from(this).with({
                    taskTypeType: taskTypeType,
                    backFunction: this.onBackPress.bind(this),
                    indicatorActionName: Actions.LOAD_INDICATOR,
                    reportFilters: reportFilters
                }).to(TaskListView);
            },
            onCustomRecordCardResults: (results, status, viewName, approvalStatus_status, reportFilters, reportCard) => TypedTransition.from(this).with({
                reportFilters: reportFilters,
                approvalStatus_status: approvalStatus_status,
                indicatorActionName: Actions.LOAD_INDICATOR,
                headerTitle: _.truncate(reportCard.name, {'length': 30}) || status,
                results: results,
                reportCardUUID,
                listType: _.lowerCase(status),
                backFunction: this.onBackPress.bind(this),
                onIndividualSelection: (source, individual) => CHSNavigator.navigateToProgramEnrolmentDashboardView(source, individual.uuid),
                onApprovalSelection: (source, entity) => CHSNavigator.navigateToApprovalDetailsView(source, entity),
            }).to(viewNameMap[viewName], true)
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

    renderFilters() {
        return this.state.filtersPresent && <SubHeader I18n={this.I18n} onFilterPressed={() => this.onFilterPressed()}/>;
    }

    onFilterPressed() {
        const {activeDashboardUUID} = this.state;
        TypedTransition.from(this)
            .with({
                dashboardUUID: activeDashboardUUID,
                onFilterChosen: (ruleInputArray) => this.dispatchAction(Actions.REFRESH_COUNT, {ruleInput: {ruleInputArray: ruleInputArray}, filterApplied: true}),
                loadFiltersData: (filters) => this.dispatchAction(Actions.SET_DASHBOARD_FILTERS, {customDashboardFilters: filters, filterApplied: true}),
            }).to(FiltersViewV2, true);
    }

    render() {
        General.logDebug("CustomDashboardView", "render");
        const {hideBackButton, startSync, renderSync, icon, customDashboardType, onSearch, showSearch} = this.props;
        const title = this.props.title || 'dashboards';
        const {hasFilters, loading} = this.state;
        return (
            <CHSContainer style={{
                marginBottom: Styles.ContentDistanceFromEdge
            }}>
                <AppHeader title={this.I18n.t(title)}
                           hideBackButton={hideBackButton}
                           startSync={startSync}
                           renderSync={renderSync}
                           icon={icon}
                           hideIcon={_.isNil(icon)}
                           renderSearch={showSearch}
                           onSearch={onSearch}
                />
                <Line/>
                {(_.isNil(customDashboardType) || customDashboardType === CustomDashboardType.None) &&
                    <SafeAreaView style={{height: 50}}>
                        <ScrollView horizontal style={{backgroundColor: Colors.cardBackgroundColor}}>
                            {this.renderDashboards()}
                            {this.renderZeroResultsMessageIfNeeded()}
                        </ScrollView>
                    </SafeAreaView>}
                {this.renderFilters()}
                <Fragment>
                    {hasFilters && <View style={{display: "flex", padding: 10}}>
                        <SafeAreaView style={{maxHeight: 160}}>
                            <ScrollView style={this.state.customDashboardFilters.applied && CustomDashboardView.styles.itemContent}>
                                <AppliedFiltersV2 dashboardUUID={this.state.activeDashboardUUID}
                                                  postClearAction={() => this.onClearFilters()}
                                                  applied={this.state.customDashboardFilters.applied}
                                                  selectedLocations={this.state.customDashboardFilters.selectedLocations}
                                                  selectedCustomFilters={this.state.customDashboardFilters.selectedCustomFilters}
                                                  selectedGenders={this.state.customDashboardFilters.selectedGenders}/>
                            </ScrollView>
                        </SafeAreaView>
                    </View>}
                    <CustomActivityIndicator loading={loading}/>
                    <ScrollView>
                        {this.renderCards()}
                    </ScrollView>
                </Fragment>
            </CHSContainer>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: Styles.ContainerHorizontalDistanceFromEdge,
        marginBottom: Styles.ContentDistanceFromEdge
    },
    sectionContainer: {
        marginVertical: Styles.ContentDistanceWithinContainer,
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
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    listContainer: {
      marginTop: 16
    }
});

export default CustomDashboardView
