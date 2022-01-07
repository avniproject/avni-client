import {ListView, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import AbstractComponent from "../framework/view/AbstractComponent";
import Path from "../framework/routing/Path";
import Reducers from "../reducer";
import General from "../utility/General";
import Colors from "../views/primitives/Colors";
import CHSContainer from "../views/common/CHSContainer";
import AppHeader from "../views/common/AppHeader";
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

    render() {
        General.logDebug(this.viewName(), 'render');
        const selectedEncounterTypesUuid = this.state.selectedEncounterTypes.map(e => e.uuid);
        const encountersInfo = _.isEmpty(this.state.selectedEncounterTypes) ? this.state.encountersInfo :
            _.filter(this.state.encountersInfo, e => _.includes(selectedEncounterTypesUuid, e.encounter.encounterType.uuid));
        const encountersToDisplay = encountersInfo.slice(0, 50);
        const chronologicalEncounters = _.orderBy(encountersToDisplay, ({encounter}) => encounter.encounterDateTime || encounter.cancelDateTime, 'desc');
        const dataSource = new ListView.DataSource({rowHasChanged: () => false}).cloneWithRows(chronologicalEncounters);
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
                    }}>{this.props.params.subjectInfo}</Text>
                    <SearchResultsHeader totalCount={encountersInfo.length}
                                         displayedCount={encountersToDisplay.length}/>
                </View>
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
                                                   style={styles.textContainer}
                                                   formType={this.props.params.formType}
                                                   cancelFormType={this.props.params.cancelFormType}/>
                        </View>}/>
                <Separator height={50} backgroundColor={Colors.GreyContentBackground}/>
                <TouchableOpacity
                    onPress={() => TypedTransition.from(this).with({
                        encounterTypes: this.state.encounterTypes,
                        onFilterApply: Actions.ON_FILTER_APPLY,
                        selectedEncounterTypes: this.state.selectedEncounterTypes,
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
