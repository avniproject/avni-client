import {View, Button} from "react-native";
import React from "react";
import AbstractComponent from "../../framework/view/AbstractComponent";
import Path from "../../framework/routing/Path";
import TypedTransition from "../../framework/routing/TypedTransition";
import IndividualSearchResultsView from "./IndividualSearchResultsView";
import AddressLevels from "../common/AddressLevels";
import Reducers from "../../reducer";
import {IndividualSearchActionNames as Actions} from "../../action/individual/IndividualSearchActions";
import General from "../../utility/General";
import StaticFormElement from "../viewmodel/StaticFormElement";
import TextFormElement from "../form/TextFormElement";
import {PrimitiveValue} from "openchs-models";
import CHSContent from "../common/CHSContent";
import Styles from "../primitives/Styles";

@Path('/individualSearch')
class IndividualSearchView extends AbstractComponent {
    static propTypes = {};

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualSearch);
    }

    viewName() {
        return 'IndividualSearchView';
    }

    searchIndividual() {
        this.dispatchAction(Actions.SEARCH_INDIVIDUALS, {
            cb: (results) => TypedTransition.from(this).with({
                searchResults: results
            }).to(IndividualSearchResultsView, true)
        });
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        return (
            <CHSContent>
                <View style={{marginTop: Styles.ContentDistanceFromEdge, paddingHorizontal: Styles.ContentDistanceFromEdge, flexDirection: 'column'}}>
                    <TextFormElement actionName={Actions.ENTER_NAME_CRITERIA} element={new StaticFormElement('name')} value={new PrimitiveValue(this.state.searchCriteria.name)}/>
                    <TextFormElement actionName={Actions.ENTER_AGE_CRITERIA} element={new StaticFormElement('age')} value={new PrimitiveValue(this.state.searchCriteria.age)}/>
                    <AddressLevels multiSelect={true}
                                   selectedAddressLevels={this.state.searchCriteria.lowestAddressLevels}
                                   actionName={Actions.TOGGLE_INDIVIDUAL_SEARCH_ADDRESS_LEVEL}
                                   style={{marginTop: Styles.VerticalSpacingBetweenFormElements, marginBottom: Styles.VerticalSpacingBetweenFormElements}}/>
                    <Button title={this.I18n.t("search")} color={Styles.accentColor} style={{marginTop: 30}}
                            onPress={() => this.searchIndividual()}/>
                </View>
            </CHSContent>
        );
    }
}

export default IndividualSearchView;