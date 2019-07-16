import {TouchableOpacity, View, StyleSheet, Text, ListView, ActivityIndicator} from "react-native";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path from "../framework/routing/Path";
import Reducers from "../reducer";
import General from "../utility/General";
import Colors from "../views/primitives/Colors";
import CHSContainer from "../views/common/CHSContainer";
import AppHeader from "../views/common/AppHeader";
import CHSContent from "../views/common/CHSContent";
import React from "react";
import Distances from "../views/primitives/Distances";
import _ from 'lodash';
import Icon from 'react-native-vector-icons/SimpleLineIcons'
import {CompletedEncountersActionNames as Actions} from "../action/encounter/CompletedEncountersActions";
import SearchResultsHeader from "../views/individual/SearchResultsHeader";
import CompletedVisitsFilterView from "../views/filter/CompletedVisitsFilterView";
import TypedTransition from "../framework/routing/TypedTransition";
import CollapsibleEncounters from "../views/common/CollapsibleEncounters";
import DGS from "../views/primitives/DynamicGlobalStyles";
import Separator from "../views/primitives/Separator";

@Path('/CompletedEncountersView')
class CompletedEncountersView extends AbstractComponent {

    viewName() {
        return 'CompletedEncountersView';
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.completedEncounters);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props.params);
        super.componentWillMount();
    }

    didFocus() {
        if (this.state.encountersToDisplay.length !== this.state.chronologicalEncounters.length) {
            super.didFocus();
            this.dispatchAction(Actions.HANDLE_MORE)
        }
    }


    render() {
        General.logDebug(this.viewName(), 'render');
        const encountersInfo = _.isNil(this.state.selectedEncounterType) ? this.state.encountersInfo : _.filter(this.state.encountersInfo, (e) => (e.encounter.encounterType.uuid === this.state.selectedEncounterType.uuid));
        const dataSource = new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(this.state.encountersToDisplay);
        const programEnrolment = this.props.params.enrolment;
        return (
            <CHSContainer style={{backgroundColor: Colors.GreyContentBackground}}>
                <AppHeader title={this.I18n.t('completedEncounters')}/>
                <View style={{
                    borderWidth: 1,
                    borderStyle: 'solid',
                    borderColor: Colors.InputBorderNormal,
                    backgroundColor: Colors.cardBackgroundColor
                }}>
                    <Text style={{
                        fontSize: 18,
                        color: Colors.DefaultPrimaryColor,
                        paddingVertical: DGS.resizeHeight(5),
                        paddingLeft: Distances.ScaledContainerHorizontalDistanceFromEdge,
                        paddingRight: DGS.resizeWidth(3)
                    }}>{programEnrolment && `${programEnrolment.individual.name}, ${programEnrolment.program.operationalProgramName || programEnrolment.program.name}`}</Text>
                    <SearchResultsHeader totalCount={encountersInfo.length}
                                         displayedCount={this.state.encountersToDisplay.length}/>
                </View>
                <CHSContent>
                    <View>
                        <ListView
                            enableEmptySections={true}
                            dataSource={dataSource}
                            pageSize={1}
                            initialListSize={1}
                            removeClippedSubviews={true}
                            renderRow={(encounter) =>
                                <View style={styles.container}>
                                    <CollapsibleEncounters encountersInfo={encounter}
                                                           onToggleAction={Actions.ON_EXPAND_TOGGLE}
                                                           renderTitleAndDetails={this.props.params.renderTitleAndDetails.bind(this, encounter.encounter)}
                                                           encounterActions={this.props.params.encounterActions.bind(this, encounter.encounter)}
                                                           cancelVisitAction={this.props.params.cancelVisitAction.bind(this, encounter.encounter)}
                                                           style={styles.textContainer}/>
                                </View>}/>
                    </View>
                    <Separator height={50} backgroundColor={Colors.GreyContentBackground}/>
                    {this.state.encountersToDisplay.length !== this.state.chronologicalEncounters.length ?
                        <ActivityIndicator size="large" style={{marginTop: 20}}/> : <View/>}
                </CHSContent>
                <TouchableOpacity
                    onPress={() => TypedTransition.from(this).with({
                        encounterTypes: this.state.encounterTypes,
                        onFilterApply: Actions.ON_FILTER_APPLY,
                        selectedEncounterType: this.state.selectedEncounterType,
                    }).to(CompletedVisitsFilterView)}
                    style={styles.filterButtonContainer}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Icon name={'equalizer'} size={25} style={{color: Colors.headerIconColor}}/>
                    </View>
                </TouchableOpacity>
            </CHSContainer>
        );
    }
}

export default CompletedEncountersView
const styles = StyleSheet.create({
    container: {
        marginRight: Distances.ScaledContentDistanceFromEdge,
        marginLeft: Distances.ScaledContentDistanceFromEdge,
        elevation: 2,
        marginVertical: 3,
        backgroundColor: Colors.cardBackgroundColor,
    },
    textContainer: {
        flex: 1,
        padding: 9.6,
    },
    filterButtonContainer: {
        right: Distances.ScaledContentDistanceFromEdge,
        bottom: Distances.ScaledContentDistanceFromEdge,
        padding: Distances.ScaledContentDistanceFromEdge,
        position: 'absolute',
        alignItems: 'center',
        borderRadius: 200,
        backgroundColor: Colors.ActionButtonColor,
        elevation: 2
    }
});
