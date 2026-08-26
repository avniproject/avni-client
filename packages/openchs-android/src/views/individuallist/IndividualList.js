import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import {MyDashboardActionNames as Actions} from "../../action/mydashboard/MyDashboardActions";
import General from "../../utility/General";
import CHSNavigator from "../../utility/CHSNavigator";
import IndividualListView from "./IndividualListView";

@Path('/IndividualList')
class IndividualList extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "IndividualList";
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.myDashboard);
    }

    // Both dispatches were in willMount: RESET_LIST ran synchronously DURING the navigation slide, and
    // ON_LIST_LOAD ran on deferPastInteractions - the InteractionManager trigger that settles before the
    // slide's final commit. That is the MyDashboard-card-to-subject-list frame stutter. The base class
    // now runs this once the transition has painted, holds renderLoading() until it returns, and renders
    // renderLoadError() if it throws - which the hand-rolled deferral did not. (avni-client#2054)
    loadData() {
        General.logDebug("IndividualList", "loadData");
        this.dispatchAction(Actions.RESET_LIST);
        this.listLoaded = true;
        this.dispatchAction(Actions.ON_LIST_LOAD, {...this.props.params});
    }

    onHardwareBackPress() {
        this.props.params.backFunction();
        return true;
    }

    _onFilterPress() {
        CHSNavigator.navigateToFilterView(this, {
            filters: this.state.filters,
            locationSearchCriteria: this.state.locationSearchCriteria,
            addressLevelState: this.state.addressLevelState,
            programs: this.state.programs,
            selectedPrograms: this.state.selectedPrograms,
            encounterTypes: this.state.encounterTypes,
            selectedEncounterTypes: this.state.selectedEncounterTypes,
            generalEncounterTypes: this.state.generalEncounterTypes,
            selectedCustomFilters: this.state.selectedCustomFilters,
            selectedGenders: this.state.selectedGenders,
            selectedGeneralEncounterTypes: this.state.selectedGeneralEncounterTypes,
            onBack: this.goBack.bind(this),
            actionName: Actions.APPLY_FILTERS,
            filterDate: this.state.date,
            listType: this.props.params.listType
        });
    }

    renderLoaded() {
        General.logDebug(this.viewName(), 'render');
        return (
            <IndividualListView
                loading={!this.listLoaded}
                results={this.state.itemsToDisplay}
                totalSearchResultsCount={this.state.individuals.data.length}
                headerTitle={this.props.params.cardTitle}
                backFunction={this.props.params.backFunction}
                iconName={'filter'}
                iconFunction={this._onFilterPress.bind(this)}
                listType={this.props.params.listType}/>
        );
    }
}

export default IndividualList;
