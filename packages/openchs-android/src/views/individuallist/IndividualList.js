import React from "react";
import {ActivityIndicator, ListView, Modal, SectionList, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import {MyDashboardActionNames as Actions} from "../../action/mydashboard/MyDashboardActions";
import AppHeader from "../common/AppHeader";
import Colors from '../primitives/Colors';
import CHSContainer from "../common/CHSContainer";
import Distances from '../primitives/Distances'
import IndividualDetails from './IndividualDetails';
import DynamicGlobalStyles from "../primitives/DynamicGlobalStyles";
import Fonts from "../primitives/Fonts";
import General from "../../utility/General";
import SearchResultsHeader from "../individual/SearchResultsHeader";
import _ from 'lodash';
import Separator from "../primitives/Separator";
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

    componentWillMount() {
        General.logDebug("IndividualList", "Component Will Mount");
        super.componentWillMount();
    }

    componentDidMount() {
        if (!this.state.total) {
            this.dispatchAction(Actions.LOAD_INDICATOR, {status: true});
        }
        setTimeout(() =>this.dispatchAction(Actions.ON_LIST_LOAD, {...this.props.params}), 0);
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !General.arraysShallowEquals(this.state.itemsToDisplay, nextState.itemsToDisplay, x=>x.individual.uuid) ||
            (this.state.individuals.data.length !== nextState.individuals.data.length);
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
                iconFunction={this._onFilterPress.bind(this)}/>
        );
    }
}

export default IndividualList;
