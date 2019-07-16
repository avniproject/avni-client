import React from "react";
import {Text, View, StyleSheet, ListView, TouchableOpacity, Modal, SectionList, ActivityIndicator} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import {MyDashboardActionNames as Actions} from "../../action/mydashboard/MyDashboardActions";
import AppHeader from "../common/AppHeader";
import Colors from '../primitives/Colors';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
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
        this.dispatchAction(Actions.ON_LIST_LOAD, {...this.props.params});
        super.componentWillMount();
    }

    _onBack(){
        this.dispatchAction(Actions.ON_FILTER_BACK);
        this.goBack();
    }

    onHardwareBackPress() {
        this.props.params.backFunction();
        return true;
    }

    _onFilterPress() {
        this.dispatchAction(Actions.RESET_LIST);
        CHSNavigator.navigateToFilterView(this, {
            filters: this.state.filters,
            locationSearchCriteria: this.state.locationSearchCriteria,
            addressLevelState: this.state.addressLevelState,
            programs: this.state.programs,
            selectedPrograms: this.state.selectedPrograms,
            encounterTypes: this.state.encounterTypes,
            selectedEncounterTypes: this.state.selectedEncounterTypes,
            onBack: this._onBack.bind(this),
            actionName: Actions.APPLY_FILTERS,
            filterDate: this.state.date,
            listType: this.props.params.listType
        });
    }

    didFocus() {
        if (this.state.itemsToDisplay.length !== this.state.totalToDisplay.length) {
            super.didFocus();
            this.dispatchAction(Actions.HANDLE_MORE)
        }
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const allUniqueGroups = _.uniqBy(_.map(this.state.itemsToDisplay, ({visitInfo}) => ({groupingBy: visitInfo.groupingBy})), 'groupingBy');
        const data = allUniqueGroups.map(({groupingBy}) => {
            return {
                title: groupingBy,
                data: _.get(_.groupBy(this.state.itemsToDisplay, 'visitInfo.groupingBy'), groupingBy, [])
            }
        });

        const renderHeader = (title) => {
            return <Text style={[Fonts.typography("paperFontTitle"), {
                color: "rgba(0, 0, 0, 0.87)",
                fontWeight: 'normal',
                fontSize: 15,
                paddingTop: 15
            }]}>{_.isEmpty(title) ? 'Individual List' : title}</Text>
        };

        return (
            <CHSContainer>
                <AppHeader
                    title={`${this.I18n.t(this.props.params.cardTitle)}`}
                    func={this.props.params.backFunction} icon={"filter"} iconFunc={() => this._onFilterPress()}/>
                <SearchResultsHeader totalCount={this.state.individuals.data.length}
                                     displayedCount={this.state.itemsToDisplay.length}/>
                <CHSContent style={{backgroundColor: '#f7f7f7'}}>
                    <SectionList
                        contentContainerStyle={{
                            marginRight: Distances.ScaledContentDistanceFromEdge,
                            marginLeft: Distances.ScaledContentDistanceFromEdge,
                            marginTop: Distances.ScaledContentDistanceFromEdge,
                        }}
                        sections={data}
                        renderSectionHeader={({section: {title}}) => renderHeader(title)}
                        renderItem={(individualWithMetadata) =>
                            <IndividualDetails
                                individualWithMetadata={individualWithMetadata.item}
                                header={individualWithMetadata.section.title}
                                backFunction={() => this.goBack()}/>}
                        SectionSeparatorComponent={({trailingItem}) => allUniqueGroups.length > 1 && !trailingItem ? (
                            <Separator style={{alignSelf: 'stretch'}} height={5}/>) : null}
                        keyExtractor={(item, index) => index}
                    />
                    {this.state.itemsToDisplay.length !== this.state.totalToDisplay.length ?
                        <ActivityIndicator size="large" style={{marginTop: 20}}/> : <View/>}
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default IndividualList;
