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

@Path('/IndividualList')
class IndividualList extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "IndividualList";
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.myDashboard);
    }

    static styles = StyleSheet.create({
        container: {
            marginRight: Distances.ScaledContentDistanceFromEdge,
            marginLeft: Distances.ScaledContentDistanceFromEdge,
            marginTop: Distances.ScaledContentDistanceFromEdge
        },
        header: {
            fontWeight: "500",
            color: Colors.InputNormal,
            marginTop: DynamicGlobalStyles.resizeHeight(16),
            marginBottom: DynamicGlobalStyles.resizeHeight(16)
        }
    });

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

    renderHeader = ({section: {title}}) => (
        <Text style={[Fonts.typography("paperFontTitle"), {
            color: "rgba(0, 0, 0, 0.87)",
            fontWeight: 'normal',
            fontSize: 15,
            paddingTop: 15
        }]}>{_.isEmpty(title) ? 'Individual List' : title}</Text>
    );

    renderItems = (individualWithMetadata) => (
        <IndividualDetails
            individualWithMetadata={individualWithMetadata.item}
            header={individualWithMetadata.section.title}
            backFunction={this.goBack.bind(this)}/>
    );

    render() {
        General.logDebug(this.viewName(), 'render');
        const allUniqueGroups = _.uniqBy(_.map(this.state.itemsToDisplay, ({visitInfo}) => ({groupingBy: visitInfo.groupingBy})), 'groupingBy');
        const data = allUniqueGroups.map(({groupingBy}) => {
            return {
                title: groupingBy,
                data: _.get(_.groupBy(this.state.itemsToDisplay, 'visitInfo.groupingBy'), groupingBy, [])
            }
        });

        return (
            <CHSContainer>
                <AppHeader
                    title={`${this.I18n.t(this.props.params.cardTitle)}`}
                    func={this.props.params.backFunction} icon={"filter"} iconFunc={() => this._onFilterPress()}/>
                <SearchResultsHeader totalCount={this.state.individuals.data.length}
                                     displayedCount={this.state.itemsToDisplay.length}/>
                <SectionList
                    contentContainerStyle={{
                        marginRight: Distances.ScaledContentDistanceFromEdge,
                        marginLeft: Distances.ScaledContentDistanceFromEdge,
                        marginTop: Distances.ScaledContentDistanceFromEdge,
                    }}
                    sections={data}
                    renderSectionHeader={this.renderHeader}
                    renderItem={this.renderItems}
                    SectionSeparatorComponent={({trailingItem}) => allUniqueGroups.length > 1 && !trailingItem ? (
                        <Separator style={{alignSelf: 'stretch'}} height={5}/>) : null}
                    keyExtractor={(item, index) => index}
                />
            </CHSContainer>
        );
    }
}

export default IndividualList;
