import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import General from "../../utility/General";
import Styles from "../primitives/Styles";
import React from "react";
import CHSContent from "../common/CHSContent";
import CHSContainer from "../common/CHSContainer";
import {Text, TouchableOpacity, View} from "react-native";
import Colors from "../primitives/Colors";
import AppHeader from "../common/AppHeader";
import SingleSelectFilter from "./SingleSelectFilter";
import {SingleSelectFilter as SingleSelectFilterModel} from "openchs-models";
import {CompletedVisitsFilterActionNames as Actions} from "../../action/program/CompletedVisitsFilterAction";
import Reducers from "../../reducer";


@Path('/CompletedVisitsFilterView')
class CompletedVisitsFilterView extends AbstractComponent {
    static propTypes = {};

    viewName() {
        return "CompletedVisitsFilterView";
    }

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.completedVisitsFilterAction);
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props.params);
        super.componentWillMount();
    }

    onApply() {
        this.dispatchAction(this.props.params.onFilterApply, {selectedEncounterType: this.state.selectedEncounterType});
        this.goBack();
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const selectedVisit = _.isNil(this.state.selectedEncounterType) ? null : this.state.selectedEncounterType.operationalEncounterTypeName;
        const optsFnMap = this.state.encounterTypes.reduce((visitTypesMap, visitType) => visitTypesMap.set(visitType.operationalEncounterTypeName, visitType), new Map());
        const filterModel = new SingleSelectFilterModel("Choose Visit Type", optsFnMap).selectOption(selectedVisit);
        return (
            <CHSContainer style={{backgroundColor: Styles.whiteColor}}>
                <AppHeader title={this.I18n.t('Filter')}/>
                <CHSContent>
                    <View style={{margin: Styles.VerticalSpacingBetweenFormElements}}>
                        <SingleSelectFilter filter={filterModel}
                                            onSelect={(encounterTypeName) => this.dispatchAction(Actions.ON_VISIT_SELECT, {encounterTypeName})}/>
                    </View>
                </CHSContent>
                <TouchableOpacity activeOpacity={0.5}
                                  onPress={() => this.onApply()}
                                  style={{
                                      position: 'absolute',
                                      width: '100%',
                                      height: 50,
                                      alignSelf: 'stretch',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      bottom: 0,
                                      backgroundColor: Colors.AccentColor
                                  }}>
                    <Text style={{
                        fontSize: Styles.normalTextSize,
                        color: Colors.TextOnPrimaryColor,
                        alignSelf: "center"
                    }}>Apply</Text>
                </TouchableOpacity>
            </CHSContainer>
        );
    }
}

export default CompletedVisitsFilterView
