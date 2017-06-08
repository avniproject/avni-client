import {View} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualSearchResultsView from "./IndividualSearchResultsView";
import {Button, Content} from "native-base";
import AddressLevels from "../common/AddressLevels";
import Reducers from "../../reducer";
import {IndividualSearchActionNames as Actions} from "../../action/individual/IndividualSearchActions";
import General from "../../utility/General";
import StaticFormElement from "../viewmodel/StaticFormElement";
import TextFormElement from "../form/TextFormElement";
import Distances from '../primitives/Distances';
import PrimitiveValue from "../../models/observation/PrimitiveValue";
import CHSContent from "../common/CHSContent";

@Path('/individualSearch')
class IndividualSearchView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualSearch);
    }

    viewName() {
        return 'IndividualSearchView';
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        return (
            <CHSContent>
                <View style={{marginTop: Distances.ScaledVerticalSpacingDisplaySections, marginHorizontal: Distances.ScaledContentDistanceFromEdge, flexDirection: 'column'}}>
                    <TextFormElement actionName={Actions.ENTER_NAME_CRITERIA} element={new StaticFormElement('name')} value={new PrimitiveValue(this.state.searchCriteria.name)}
                                     style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}/>
                    <TextFormElement actionName={Actions.ENTER_AGE_CRITERIA} element={new StaticFormElement('age')} value={new PrimitiveValue(this.state.searchCriteria.age)}
                                     style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}/>
                    <AddressLevels multiSelect={true} selectedAddressLevels={this.state.searchCriteria.lowestAddressLevels}
                                   actionName={Actions.TOGGLE_INDIVIDUAL_SEARCH_ADDRESS_LEVEL} style={{marginTop: Distances.VerticalSpacingBetweenFormElements}}/>
                    <Button style={{marginTop: 30, marginBottom: 30}} block
                            onPress={() => this.searchIndividual()}>{this.I18n.t("search")}</Button>
                </View>
            </CHSContent>
        );
    }

    searchIndividual() {
        this.dispatchAction(Actions.SEARCH_INDIVIDUALS, {
            cb: (results) => TypedTransition.from(this).with({
                searchResults: results
            }).to(IndividualSearchResultsView, true)
        });
    }
}

export default IndividualSearchView;