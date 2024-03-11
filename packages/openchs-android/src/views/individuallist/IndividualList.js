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

    UNSAFE_componentWillMount() {
        General.logDebug("IndividualList", "Component Will Mount");
        this.dispatchAction(Actions.ON_LIST_LOAD, {...this.props.params});
        super.UNSAFE_componentWillMount();
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

    render() {
        General.logDebug(this.viewName(), 'render');
        return (
            <IndividualListView
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
