import React from "react";
import {ListView, Text, View} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import Reducers from "../../reducer";
import {MyDashboardActionNames as Actions} from "../../action/mydashboard/MyDashboardActions";
import Colors from '../primitives/Colors';
import CHSContainer from "../common/CHSContainer";
import CHSContent from "../common/CHSContent";
import AddressVisitRow from './AddressVisitRow';
import Separator from '../primitives/Separator';
import AppHeader from "../common/AppHeader";
import DashboardFilters from "./DashboardFilters";
import CHSNavigator from "../../utility/CHSNavigator";

@Path('/MyDashboard')
class MyDashboardView extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "MyDashboard";
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.myDashboard);
        this.ds = new ListView.DataSource({rowHasChanged: () => false});
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

    renderHeader() {
        return <Text style={{
            paddingTop: 10,
            textAlign: 'center',
            fontSize: 20,
            color: Colors.DefaultPrimaryColor,
            paddingBottom: 10
        }}>{this.state.selectedSubjectType && this.state.selectedSubjectType.name}</Text>
    }

    render() {
        const dataSource = this.ds.cloneWithRows((this.state.visits));
        const date = this.state.date;
        return (
            <CHSContainer style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t('home')} func={this.onBackCallback.bind(this)}
                           hideBackButton={true} iconComponent={this.props.iconComponent}
                           iconFunc={this.props.iconFunc}/>
                <View>
                    <DashboardFilters date={date} filters={this.state.filters}
                                      selectedLocations={this.state.selectedLocations}
                                      selectedPrograms={this.state.selectedPrograms}
                                      selectedEncounterTypes={this.state.selectedEncounterTypes}
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
                                  renderRow={(rowData) => <AddressVisitRow address={rowData.address}
                                                                           visits={rowData.visits}
                                                                           backFunction={() => this.onBackCallback()}
                                                                           onBack={() => this._onBack()}
                                  />}/>
                        <Separator height={10} backgroundColor={Colors.GreyContentBackground}/>
                    </View>
                    <Separator height={110} backgroundColor={Colors.GreyContentBackground}/>
                </CHSContent>
            </CHSContainer>
        );
    }
}

export default MyDashboardView;
