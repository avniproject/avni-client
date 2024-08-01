import AbstractComponent from "../../framework/view/AbstractComponent";
import CHSContainer from "../common/CHSContainer";
import AppHeader from "../common/AppHeader";
import React, {Fragment} from "react";
import Reducers from "../../reducer";
import {
    CustomDashboardActionNames as Actions,
    performCustomDashboardActionAndClearRefresh,
    performCustomDashboardActionAndRefresh
} from "../../action/customDashboard/CustomDashboardActions";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableNativeFeedback,
    TouchableOpacity,
    View
} from "react-native";
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
import UserInfoService from "../../service/UserInfoService";
import DashboardFilterService from '../../service/reports/DashboardFilterService';
import DatePicker from '../primitives/DatePicker';
import moment from 'moment';

const viewNameMap = {
    'ApprovalListingView': ApprovalListingView,
    'IndividualSearchResultPaginatedView': IndividualSearchResultPaginatedView,
    'IndividualListView': IndividualListView,
    'CommentListView': CommentListView,
    'ChecklistListingView': ChecklistListingView
};

function RefreshSection({I18n, onRefreshPressed, lastUpdatedOn}) {
    const refreshSectionStyle = {
        paddingLeft: 15,
        color: Styles.grey,
        fontSize: Styles.smallerTextSize,
        fontWeight: 'bold'
    };
    return <TouchableNativeFeedback onPress={() => onRefreshPressed()}>
        <View style={{
            backgroundColor: Colors.SubHeaderBackground,
            flexDirection: 'row',
            minHeight: 45,
            alignItems: 'center'
        }}>
            <Text style={refreshSectionStyle}>{I18n.t('lastRefreshedMessage', {dateTime: General.formatDateTime(lastUpdatedOn)})}</Text>
            <MCIIcon style={{fontSize: 30, color: Colors.DullIconColor}} name='refresh'/>
        </View>
    </TouchableNativeFeedback>;
}

function FilterSection({dispatcher, asOnDateValue, asOnDateFilter, I18n, onFilterPressed}) {

    const onAsOnDateChange = (date) => {
        dispatcher.dispatchAction(FilterActionNames.ON_FILTER_UPDATE, {
            filter: asOnDateFilter, value: date
        });
        dispatcher.dispatchAction(FilterActionNames.BEFORE_APPLY_FILTER, {status: true});
        dispatcher.dispatchAction(FilterActionNames.APPLIED_FILTER, {navigateToDashboardView: _.noop});
        performCustomDashboardActionAndClearRefresh(dispatcher, Actions.FILTER_APPLIED);
    }

    const renderQuickDateOptions = (label, value, isFilled) => {
        const backgroundColor = {backgroundColor: isFilled ? Colors.ActionButtonColor : Colors.FilterButtonColor};
        const textColor = {color: isFilled ? Colors.TextOnPrimaryColor : Styles.accentColor};
        return (
          <TouchableOpacity
            style={[CustomDashboardView.styles.todayButton, backgroundColor]}
            onPress={() => isFilled ? _.noop() : onAsOnDateChange(value)}
          >
              <Text style={[CustomDashboardView.styles.buttonText, textColor]}>{I18n.t(label)}</Text>
          </TouchableOpacity>
        )
    }

    const isToday = moment(asOnDateValue).isSame(moment(), "day");
    const isTomorrow = moment(asOnDateValue).isSame(moment().add(1, "day"), "day");

    return (<Fragment>
        <View>
            <View style={CustomDashboardView.styles.itemContent}>
                <View style={CustomDashboardView.styles.buttons}>
                    <TouchableNativeFeedback onPress={() => onFilterPressed()}>
                        <View style={{
                            ...CustomDashboardView.styles.filterButton,
                        }}>
                            <Text style={CustomDashboardView.styles.filterText}>{I18n.t('filter')}</Text>
                        </View>
                    </TouchableNativeFeedback>
                    {asOnDateFilter && <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        flexWrap: 'wrap',
                        gap: 5,
                        flex: 0.6
                    }}>
                        <Text style={{...CustomDashboardView.styles.labelText}}>{I18n.t('asOnDate')}: </Text>
                        <DatePicker overridingStyle={CustomDashboardView.styles.buttonText} nonRemovable={true}
                                    pickTime={false} dateValue={asOnDateValue}
                                    onChange={onAsOnDateChange.bind(this)}/>
                        {renderQuickDateOptions('Today', new Date(), isToday)}
                        {renderQuickDateOptions('Tomorrow', moment().add(1, "day").toDate(), isTomorrow)}
                    </View>}
                </View>
            </View>
        </View>

    </Fragment>);
}

@Path('/customDashboardView')
class CustomDashboardView extends AbstractComponent {
    static styles = StyleSheet.create({
        itemContent: {
            flexDirection: 'column',
            // borderBottomWidth: 1,
            // borderColor: Colors.InputBorderNormal,
            // backgroundColor: Styles.blueColor,
            paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
            paddingBottom: Distances.ScaledVerticalSpacingBetweenOptionItems,
            elevation: 2,
            // minWidth: '95%',
            // minHeight: 45,
            marginHorizontal: 5
        },
        buttons: {
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
        },
        filterButton: {
            backgroundColor: Colors.FilterButtonColor,
            borderRadius: 3,
            padding: 5
        },
        filterText: {
            color: Styles.accentColor,
            fontSize: Styles.smallTextSize,
            fontWeight: 'bold',
            textTransform: 'uppercase',
        },
        buttonText: {
            color: Styles.accentColor,
            fontSize: Styles.smallerTextSize,
            fontWeight: 'bold',
        },
        labelText: {
            color: Styles.grey,
            fontSize: Styles.smallerTextSize,
            fontWeight: 'bold',
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
        performCustomDashboardActionAndClearRefresh(this, Actions.ON_LOAD, {customDashboardType});
        super.UNSAFE_componentWillMount();
    }

    onClearFilters() {
        performCustomDashboardActionAndClearRefresh(this, Actions.FILTER_CLEARED, {dashboardUUID: this.state.activeDashboardUUID});
    }

    onDashboardNamePress(uuid) {
        this.dispatchAction(FilterActionNames.ON_LOAD, {dashboardUUID: uuid});
        performCustomDashboardActionAndRefresh(this, Actions.ON_DASHBOARD_CHANGE, {dashboardUUID: uuid});
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

        const nonVoidedSectionWiseData = sectionWiseData.filter(item => !item.section.voided);

        return (
            <View style={styles.container}>
                {_.map(nonVoidedSectionWiseData, ({section, cards}) => (
                        <View key={section.uuid} style={styles.sectionContainer}>
                            {section.viewType !== DashboardSection.viewTypeName.Default &&
                                this.renderSectionName(section.name, section.description, section.viewType, cards)}
                            <View style={section.viewType === 'Tile' ? styles.cardContainer : styles.listContainer}>
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
                listType: status,
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

    onFilterPressed() {
        const {activeDashboardUUID} = this.state;
        TypedTransition.from(this)
            .with({
                dashboardUUID: activeDashboardUUID,
                onFilterChosen: (ruleInputArray) => performCustomDashboardActionAndClearRefresh(this, Actions.FILTER_APPLIED, {
                    ruleInput: {ruleInputArray: ruleInputArray},
                    filterApplied: true
                })
            }).to(FiltersViewV2, true);
    }

    render() {
        General.logDebug("CustomDashboardView", "render");

        const settings = this.getService(UserInfoService).getUserSettingsObject();
        const dashboard = this.state.dashboards.find((x) => x.uuid === this.state.activeDashboardUUID);

        const {hideBackButton, startSync, renderSync, icon, customDashboardType, onSearch, showSearch} = this.props;
        const title = this.props.title || 'dashboards';
        const {hasFiltersSet, loading} = this.state;

        const dashboardFilterService = this.getService(DashboardFilterService);
        const filters = dashboardFilterService.getFilters(dashboard.uuid);
        const filterConfigs = dashboardFilterService.getFilterConfigsForDashboard(dashboard.uuid);
        const asOnDateFilterUUID = _.findKey(filterConfigs, entity => entity.isAsOnDateFilter());
        const asOnDateFilter = _.find(filters, ({uuid}) => uuid === asOnDateFilterUUID);
        const asOnDateFilterValue = (asOnDateFilterUUID && this.state.customDashboardFilters[asOnDateFilterUUID])
          ? this.state.customDashboardFilters[asOnDateFilterUUID] : new Date();
        const filterUUIDsToIgnore = asOnDateFilterUUID ? [asOnDateFilterUUID] : [];

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
                <ScrollView>
                    <Line/>
                    {(_.isNil(customDashboardType) || customDashboardType === CustomDashboardType.None) &&
                        <SafeAreaView style={{height: 50}}>
                            <ScrollView horizontal style={{backgroundColor: Colors.cardBackgroundColor}}>
                                {this.renderDashboards()}
                                {this.renderZeroResultsMessageIfNeeded()}
                            </ScrollView>
                        </SafeAreaView>}
                    <View style={{display: "flex", flexDirection: "row", flex: 1, justifyContent: "space-between"}}>
                        <View style={{flex: 0.65}}>
                            {settings.autoRefreshDisabled && !_.isNil(this.state.resultUpdatedAt) &&
                                <RefreshSection I18n={this.I18n}
                                                onRefreshPressed={() => performCustomDashboardActionAndClearRefresh(this, Actions.FORCE_REFRESH)}
                                                lastUpdatedOn={this.state.resultUpdatedAt}/>}
                        </View>
                    </View>
                    <CustomActivityIndicator loading={loading}/>
                    <View>
                        {this.state.filtersPresent &&
                          <FilterSection dispatcher={this} asOnDateValue={asOnDateFilterValue}
                                         asOnDateFilter={asOnDateFilter} I18n={this.I18n}
                                         onFilterPressed={() => this.onFilterPressed()}/>}
                    </View>
                    <AppliedFiltersV2 dashboardUUID={this.state.activeDashboardUUID}
                                      postClearAction={() => this.onClearFilters()}
                                      dashboard={dashboard}
                                      hasFiltersSet={hasFiltersSet}
                                      selectedFilterValues={this.state.customDashboardFilters}
                                      filterConfigs={filterConfigs}
                                      filterUUIDsToIgnore={filterUUIDsToIgnore}
                    />
                    {this.renderCards()}
                </ScrollView>
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
