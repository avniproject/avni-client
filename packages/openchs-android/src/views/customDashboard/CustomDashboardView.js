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
    ScrollView,
    StyleSheet,
    Text,
    TouchableNativeFeedback,
    TouchableOpacity,
    View
} from "react-native";
import _ from "lodash";
import DropDownPicker from "react-native-dropdown-picker";
import {DashboardSection, Privilege, ReportCard} from "openchs-models";
import TypedTransition from "../../framework/routing/TypedTransition";
import CHSNavigator from "../../utility/CHSNavigator";
import Colors from "../primitives/Colors";
import Fonts from "../primitives/Fonts";
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
import CustomCardDetailView from "./CustomCardDetailView";
import FiltersViewV2 from "../filter/FiltersViewV2";
import ChecklistListingView from "../checklist/ChecklistListingView";
import {FilterActionNames} from '../../action/mydashboard/FiltersActionsV2';
import Distances from '../primitives/Distances';
import AppliedFiltersV2 from '../filter/AppliedFiltersV2';
import General from "../../utility/General";
import {CustomDashboardType} from "../../service/customDashboard/CustomDashboardService";
import MCIIcon from "react-native-vector-icons/MaterialCommunityIcons";
import {CardTileView} from './CardTileView';
import {CardListView} from './CardListView';
import UserInfoService from "../../service/UserInfoService";
import OrganisationConfigService from "../../service/OrganisationConfigService";
import DashboardFilterService from '../../service/reports/DashboardFilterService';
import PrivilegeService from "../../service/PrivilegeService";
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
            <Text style={refreshSectionStyle}>{I18n.t('lastRefreshedMessage', {dateTime: General.toNumericDateTimeFormat(lastUpdatedOn)})}</Text>
            <MCIIcon style={{fontSize: 30, color: Colors.RefreshIconColor}} name='refresh'/>
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
        const selectionStyle = isFilled ? CustomDashboardView.styles.quickDateButtonSelected : CustomDashboardView.styles.quickDateButtonUnselected;
        const textColor = {color: isFilled ? Colors.TextOnPrimaryColor : Colors.BrandPrimaryDark};
        return (
            <TouchableOpacity
                style={[CustomDashboardView.styles.quickDateButton, selectionStyle]}
                onPress={() => isFilled ? _.noop() : onAsOnDateChange(value)}
            >
                <Text style={[CustomDashboardView.styles.quickDateButtonText, textColor]}>{I18n.t(label)}</Text>
            </TouchableOpacity>
        )
    }

    const isToday = moment(asOnDateValue).isSame(moment(), "day");
    const isTomorrow = moment(asOnDateValue).isSame(moment().add(1, "day"), "day");

    return (<Fragment>
        <View>
            <View style={CustomDashboardView.styles.itemContent}>
                {asOnDateFilter && <Text style={CustomDashboardView.styles.labelText}>{I18n.t('asOnDate')}: </Text>}
                <View style={CustomDashboardView.styles.buttons}>
                    <TouchableNativeFeedback onPress={() => onFilterPressed()}>
                        <View style={CustomDashboardView.styles.filterButton}>
                            <MCIIcon name={'filter-variant'} style={CustomDashboardView.styles.filterIcon}/>
                            <Text style={CustomDashboardView.styles.filterText}>{I18n.t('filter')}</Text>
                        </View>
                    </TouchableNativeFeedback>
                    {asOnDateFilter && <DatePicker overridingStyle={CustomDashboardView.styles.buttonText}
                                                    nonRemovable={true} pickTime={false} dateValue={asOnDateValue}
                                                    onChange={onAsOnDateChange.bind(this)}/>}
                </View>
                {asOnDateFilter && <View style={CustomDashboardView.styles.quickDateRow}>
                    {renderQuickDateOptions('Today', new Date(), isToday)}
                    {renderQuickDateOptions('Tomorrow', moment().add(1, "day").toDate(), isTomorrow)}
                </View>}
            </View>
        </View>

    </Fragment>);
}

@Path('/customDashboardView')
class CustomDashboardView extends AbstractComponent {
    static styles = StyleSheet.create({
        itemContent: {
            flexDirection: 'column',
            paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
            paddingTop: 14,
            paddingBottom: 18,
            elevation: 2,
            marginHorizontal: 5
        },
        buttons: {
            flexDirection: "row-reverse",
            alignItems: "center",
            justifyContent: "space-between",
        },
        filterButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: Colors.BrandLight,
            borderWidth: 1,
            borderColor: Colors.BrandPrimaryDark,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 7
        },
        filterIcon: {
            fontSize: 16,
            color: Colors.BrandPrimaryDark,
            marginRight: 4
        },
        filterText: {
            color: Colors.BrandPrimaryDark,
            fontSize: Styles.smallTextSize,
            fontWeight: '600',
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
            marginBottom: 10
        },
        quickDateRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 14
        },
        quickDateButton: {
            borderRadius: 8,
            borderWidth: 1,
            paddingHorizontal: 14,
            paddingVertical: 7,
            minWidth: 78,
            alignItems: 'center',
            justifyContent: 'center'
        },
        quickDateButtonSelected: {
            backgroundColor: Colors.BrandPrimaryDark,
            borderColor: Colors.BrandPrimaryDark
        },
        quickDateButtonUnselected: {
            backgroundColor: Colors.BrandLight,
            borderColor: Colors.BrandLight
        },
        quickDateButtonText: {
            fontSize: Styles.smallerTextSize,
            fontWeight: '600'
        }
    });

    static defaultProps = {
        showSearch: false
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.customDashboard);
        // Local-only UI state (open/closed) for the dashboard picker below - separate from the
        // reducer-driven fields (dashboards, activeDashboardUUID etc.) refreshState() merges in,
        // since React's setState shallow-merges rather than replaces.
        this.state = {isDashboardPickerOpen: false};
    }

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

    // In-page overlay (not MODAL) - the list drops down anchored right below the field instead of
    // taking over the whole screen. Rendered outside the ScrollView so the overlay isn't clipped.
    renderDashboardPicker() {
        if (_.isEmpty(this.state.dashboards)) {
            return this.renderZeroResultsMessageIfNeeded();
        }
        const items = _.map(this.state.dashboards, dashboard => ({label: this.I18n.t(dashboard.name), value: dashboard.uuid}));
        return (
            <View style={styles.dashboardPickerContainer}>
                <DropDownPicker
                    items={items}
                    open={this.state.isDashboardPickerOpen}
                    setOpen={(open) => this.setState({isDashboardPickerOpen: open})}
                    value={this.state.activeDashboardUUID}
                    setValue={(callback) => this.onDashboardNamePress(callback(this.state.activeDashboardUUID))}
                    listMode={'SCROLLVIEW'}
                    scrollViewProps={{nestedScrollEnabled: true}}
                    maxHeight={280}
                    zIndex={1000}
                    zIndexInverse={1000}
                    placeholder={this.I18n.t('dashboards')}
                    style={styles.dashboardPickerStyle}
                    textStyle={styles.dashboardPickerText}
                    dropDownContainerStyle={styles.dashboardPickerDropdown}
                    listItemLabelStyle={styles.dashboardPickerText}
                    selectedItemLabelStyle={{color: Colors.BrandPrimaryDark, fontWeight: '600'}}
                    arrowIconStyle={{tintColor: Colors.BrandPrimaryDark}}
                    tickIconStyle={{tintColor: Colors.BrandPrimaryDark}}
                />
            </View>
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

        const lastSectionIndex = nonVoidedSectionWiseData.length - 1;
        return (
            <View style={styles.container}>
                {_.map(nonVoidedSectionWiseData, ({section, cards}, sectionIndex) => (
                        <View key={section.uuid}>
                            <View style={styles.sectionContainer}>
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
                            {sectionIndex !== lastSectionIndex && <View style={styles.sectionDivider}/>}
                        </View>
                    )
                )}
            </View>
        )
    }

    onBackPress() {
        this.goBack();
    }

    // Actionable = subject type has attendance enabled and user has editSubject privilege.
    attendanceEligibility() {
        const privilegeService = this.context.getService(PrivilegeService);
        const editSubjectCriteria = `privilege.name = '${Privilege.privilegeName.editSubject}' AND privilege.entityType = '${Privilege.privilegeEntityType.subject}'`;
        const allowedSubjectTypeUUIDs = privilegeService.allowedEntityTypeUUIDListForCriteria(editSubjectCriteria, 'subjectTypeUuid');
        const hasAllPrivileges = privilegeService.hasAllPrivileges();
        return {
            isItemActionable: (individual) => {
                const subjectType = individual && individual.subjectType;
                if (!subjectType || !subjectType.attendanceEnabled) return false;
                return hasAllPrivileges || _.includes(allowedSubjectTypeUUIDs, subjectType.uuid);
            },
            disabledItemMessage: this.I18n.t("attendanceNotEnabledForSubjectType"),
        };
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
            onDismissLoading: () => {
                this.dispatchAction(Actions.LOAD_INDICATOR, {loading: false});
            },
            onGoToSourceScreen: () => {
                General.logDebug('CustomDashboardView', 'onGoToSourceScreen - navigating home');
                this.dispatchAction(Actions.LOAD_INDICATOR, {loading: false});
                CHSNavigator.goHome(this);
            },
            onShowSubjectAction: (individual) => {
                this.dispatchAction(Actions.LOAD_INDICATOR, {loading: false});
                CHSNavigator.navigateToProgramEnrolmentDashboardView(this, individual.uuid);
            },
            onDoVisitAction: (encounter, enrolmentOrIndividual, onActionCompletion) => {
                General.logDebug('CustomDashboardView', `onDoVisitAction - onActionCompletion=${onActionCompletion}, encounter=${encounter?.uuid}`);
                this.dispatchAction(Actions.LOAD_INDICATOR, {loading: false});
                const onSaveCallback = onActionCompletion === ReportCard.onActionCompletionTypes.goToSourceScreen
                    ? (source) => {
                        General.logDebug('CustomDashboardView', 'onDoVisitAction - save callback: navigating back to dashboard (goToSourceScreen)');
                        CHSNavigator.navigateBackAfterDoVisit(source);
                    }
                    : null;
                General.logDebug('CustomDashboardView', `onDoVisitAction - onSaveCallback is ${onSaveCallback ? 'custom (back to dashboard)' : 'null (default subject profile)'}`);
                CHSNavigator.proceedEncounter(encounter, enrolmentOrIndividual, onSaveCallback, this);
            },
            onDoVisitListResults: (results, reportCard, displayName, onActionCompletion) => {
                General.logDebug('CustomDashboardView', `onDoVisitListResults - ${results.length} results, onActionCompletion=${onActionCompletion}`);
                const onSaveCallback = onActionCompletion === ReportCard.onActionCompletionTypes.goToSourceScreen
                    ? (source) => {
                        General.logDebug('CustomDashboardView', 'onDoVisitListResults - save callback: navigating back to listing screen (goToSourceScreen)');
                        CHSNavigator.navigateBackAfterDoVisit(source);
                    }
                    : null;
                General.logDebug('CustomDashboardView', `onDoVisitListResults - onSaveCallback is ${onSaveCallback ? 'custom (back to list)' : 'null (default subject profile)'}`);
                TypedTransition.from(this).with({
                    indicatorActionName: Actions.LOAD_INDICATOR,
                    headerTitle: _.truncate(displayName || reportCard.name, {'length': 30}),
                    results: results,
                    totalSearchResultsCount: results.length,
                    reportCardUUID,
                    backFunction: this.onBackPress.bind(this),
                    onSaveCallback,
                }).to(viewNameMap['IndividualListView'], true);
            },
            onCustomRecordCardResults: (results, status, viewName, approvalStatus_status, reportFilters, reportCard, displayName) => {
                const isMarkAttendance = reportCard.isActionMarkAttendance();
                const attendanceEligibility = isMarkAttendance ? this.attendanceEligibility() : null;
                TypedTransition.from(this).with({
                    reportFilters: reportFilters,
                    approvalStatus_status: approvalStatus_status,
                    indicatorActionName: Actions.LOAD_INDICATOR,
                    headerTitle: _.truncate(displayName || reportCard.name, {'length': 30}) || status,
                    results: results,
                    totalSearchResultsCount: results.length,
                    reportCardUUID,
                    listType: status,
                    backFunction: this.onBackPress.bind(this),
                    onIndividualSelection: isMarkAttendance
                        ? (source, individual) => CHSNavigator.navigateToMarkAttendance(
                            source, individual, reportCard.actionDetailAttendanceType,
                            moment().format("YYYY-MM-DD"), reportCard.onActionCompletion)
                        : (source, individual) => CHSNavigator.navigateToProgramEnrolmentDashboardView(source, individual.uuid),
                    isItemActionable: attendanceEligibility ? attendanceEligibility.isItemActionable : undefined,
                    disabledItemMessage: attendanceEligibility ? attendanceEligibility.disabledItemMessage : undefined,
                    onApprovalSelection: (source, entity) => CHSNavigator.navigateToApprovalDetailsView(source, entity),
                }).to(viewNameMap[viewName], true);
            },
            onFullyCustomCardPress: (reportCard, ruleInputArray, displayName) => {
                this.dispatchAction(Actions.LOAD_INDICATOR, {loading: false});
                TypedTransition.from(this).with({
                    reportCard,
                    customCardConfig: reportCard.customCardConfig,
                    ruleInputArray,
                    displayName,
                }).to(CustomCardDetailView, true);
            }
        }), 0);
    }

    renderZeroResultsMessageIfNeeded() {
        if (_.size(this.state.dashboards) === 0)
            return <Text style={[{marginLeft: 20}, GlobalStyles.emptyListPlaceholderText]}>{this.I18n.t('dashboardsNotAvailable')}</Text>;
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
        const {hideBackButton, startSync, renderSync, icon, customDashboardType, onSearch, showSearch} = this.props;
        const showWelcomeMessage = this.context.getService(OrganisationConfigService).isGuideUserToRegisterButtonOn();
        const title = showWelcomeMessage
            ? this.I18n.t('welcomeMessage', {userName: this.context.getService(UserInfoService).getUserInfo().getDisplayUsername()?.split(' ')[0]})
            : this.I18n.t(this.props.title || 'dashboards');
        const {hasFiltersSet, loading} = this.state;
        const dashboardFilterService = this.getService(DashboardFilterService);

        let filterConfigs, asOnDateFilterUUID, asOnDateFilter, asOnDateFilterValue, filters, dashboard;
        const hasDashboards = this.state.dashboards.length !== 0 && !_.isNil(this.state.activeDashboardUUID);
        if (hasDashboards) {
            dashboard = this.state.dashboards.find((x) => x.uuid === this.state.activeDashboardUUID);
            filters = dashboardFilterService.getFilters(dashboard.uuid);
            filterConfigs = dashboardFilterService.getFilterConfigsForDashboard(dashboard.uuid);
            asOnDateFilterUUID = _.findKey(filterConfigs, entity => entity.isAsOnDateFilter());
            asOnDateFilter = _.find(filters, ({uuid}) => uuid === asOnDateFilterUUID);
            asOnDateFilterValue = (asOnDateFilterUUID && this.state.customDashboardFilters[asOnDateFilterUUID])
                ? this.state.customDashboardFilters[asOnDateFilterUUID] : new Date();
        }

        return (
            <CHSContainer style={{
                marginBottom: Styles.ContentDistanceFromEdge
            }}>
                <AppHeader title={title}
                           hideBackButton={hideBackButton}
                           startSync={startSync}
                           renderSync={renderSync}
                           icon={icon}
                           hideIcon={_.isNil(icon)}
                           renderSearch={showSearch}
                           onSearch={onSearch}
                />
                {(_.isNil(customDashboardType) || customDashboardType === CustomDashboardType.None) &&
                    this.renderDashboardPicker()}
                <ScrollView>
                    {hasDashboards && <>
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
                                          filterUUIDsToIgnore={[]}
                        />
                        {this.renderCards()}
                    </>}
                </ScrollView>
            </CHSContainer>
        );
    }
}

const styles = StyleSheet.create({
    dashboardPickerContainer: {
        paddingHorizontal: Distances.ScaledContentDistanceFromEdge,
        paddingTop: 24,
        paddingBottom: 16,
        zIndex: 10
    },
    dashboardPickerStyle: {
        minHeight: 48,
        borderWidth: 1,
        borderColor: Colors.BrandPrimary,
        borderRadius: 8,
        backgroundColor: Colors.WhiteContentBackground
    },
    dashboardPickerDropdown: {
        borderWidth: 1,
        borderColor: Colors.BrandPrimary,
        borderRadius: 8,
        backgroundColor: Colors.WhiteContentBackground
    },
    dashboardPickerText: {
        fontSize: Fonts.Normal,
        color: Colors.TextPrimaryDark
    },
    container: {
        marginHorizontal: Distances.ScaledContentDistanceFromEdge,
        marginBottom: Styles.ContentDistanceFromEdge
    },
    sectionContainer: {
        marginVertical: Styles.ContentDistanceWithinContainer,
        flexDirection: 'column'
    },
    sectionDivider: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.BorderDefault
    },
    sectionNameTextStyle: {
        fontSize: Styles.smallTextSize,
        fontStyle: 'normal',
        fontWeight: '400',
        color: Colors.TextPrimaryDark
    },
    cardContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        marginBottom: 16,
        paddingBottom: 16
    },
    listContainer: {
        marginTop: 16
    }
});

export default CustomDashboardView
