import React from "react";
import {ListView, Text, View} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import {MyDashboardActionNames as Actions} from "../../action/mydashboard/MyDashboardActions";
import Colors from '../primitives/Colors';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import StatusCountRow from './StatusCountRow';
import Separator from '../primitives/Separator';
import AppHeader from "../common/AppHeader";
import DashboardFilters from "./DashboardFilters";
import CHSNavigator from "../../utility/CHSNavigator";
import General from "../../utility/General";

@Path('/MyDashboard')
class MyDashboardView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.myDashboard);
        this.ds = new ListView.DataSource({rowHasChanged: () => false});
    }

    viewName() {
        return "MyDashboard";
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD);
        super.componentWillMount();
    }

    onBackCallback() {
        this.dispatchAction(Actions.ON_LOAD);
        this.goBack();
    }

    _onBack() {
        this.goBack();
    }

    filterStateChanged = (prev, next) => {
        return prev.individualFilters === next.individualFilters ||
            prev.encountersFilters === next.encountersFilters ||
            prev.enrolmentFilters === next.enrolmentFilters ||
            prev.generalEncountersFilters === next.generalEncountersFilters;
    };

    shouldComponentUpdate(nextProps, nextState) {
        return this.filterStateChanged(this.state, nextState) || this.state.fetchFromDB;
    }

    renderHeader() {
        return <Text style={{
            paddingTop: 10,
            textAlign: 'center',
            fontSize: 20,
            color: Colors.DefaultPrimaryColor,
            paddingBottom: 10
        }}>{this.state.selectedSubjectType && this.I18n.t(this.state.selectedSubjectType.name)}</Text>
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const dataSource = this.ds.cloneWithRows((this.state.visits));
        const date = this.state.date;
        return (
            <CHSContainer style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t('home')} hideBackButton={true} startSync={this.props.startSync}
                           renderSync={true} icon={this.props.icon}/>
                <View>
                    <DashboardFilters date={date} filters={this.state.filters}
                                      selectedLocations={this.state.selectedLocations}
                                      selectedPrograms={this.state.selectedPrograms}
                                      selectedEncounterTypes={this.state.selectedEncounterTypes}
                                      selectedGeneralEncounterTypes={this.state.selectedGeneralEncounterTypes}
                                      selectedCustomFilters={this.state.selectedCustomFilters}
                                      selectedGenders={this.state.selectedGenders}
                                      programs={this.state.programs}
                                      onPress={() => CHSNavigator.navigateToFilterView(this, {
                                          filters: this.state.filters,
                                          locationSearchCriteria: this.state.locationSearchCriteria,
                                          addressLevelState: this.state.addressLevelState,
                                          programs: this.state.programs,
                                          selectedPrograms: this.state.selectedPrograms,
                                          selectedSubjectType: this.state.selectedSubjectType,
                                          encounterTypes: this.state.encounterTypes,
                                          selectedEncounterTypes: this.state.selectedEncounterTypes,
                                          generalEncounterTypes: this.state.generalEncounterTypes,
                                          selectedCustomFilters: this.state.selectedCustomFilters,
                                          selectedGenders: this.state.selectedGenders,
                                          selectedGeneralEncounterTypes: this.state.selectedGeneralEncounterTypes,
                                          onBack: this._onBack.bind(this),
                                          actionName: Actions.APPLY_FILTERS,
                                          filterDate: date
                                      })}/>
                </View>
                <CHSContent>
                    <View>
                        <ListView dataSource={dataSource}
                                  initialListSize={1}
                                  removeClippedSubviews={true}
                                  renderHeader={() => this.renderHeader()}
                                  renderRow={(rowData) => <StatusCountRow visits={rowData.visits}
                                                                          backFunction={() => this.onBackCallback()}/>}/>
                        <Separator height={10} backgroundColor={Colors.GreyContentBackground}/>
                    </View>
                    <Separator height={110} backgroundColor={Colors.GreyContentBackground}/>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default MyDashboardView;
