import {Button, View, Text, TouchableOpacity} from "react-native";
import PropTypes from 'prop-types';
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
import TextFormElement from "../form/formElement/TextFormElement";
import CheckBoxFormElement from "../form/formElement/CheckBoxFormElement";
import {PrimitiveValue, SingleSelectFilter as SingleSelectFilterModel} from 'openchs-models';
import CHSContent from "../common/CHSContent";
import Styles from "../primitives/Styles";
import AppHeader from "../common/AppHeader";
import CHSContainer from "../common/CHSContainer";
import Separator from "../primitives/Separator";
import Colors from "../primitives/Colors";
import SingleSelectFilter from '../filter/SingleSelectFilter';

@Path('/individualSearch')
class IndividualSearchView extends AbstractComponent {
    static propTypes = {
        onIndividualSelection: PropTypes.func.isRequired,
        showHeader: PropTypes.bool,
        headerMessage: PropTypes.string
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualSearch);
    }

    viewName() {
        return 'IndividualSearchView';
    }

    componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD);
        super.componentWillMount();
    }


    searchIndividual() {
        this.dispatchAction(Actions.SEARCH_INDIVIDUALS, {
            cb: (individualSearchResults, count) => TypedTransition.from(this).with({
                searchResults: individualSearchResults,
                totalSearchResultsCount: count,
                onIndividualSelection: this.props.onIndividualSelection
            }).to(IndividualSearchResultsView, true)
        });
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        let subjectTypeSelectFilter = new SingleSelectFilterModel(
            "Choose type",
            this.state.subjectTypes.reduce(
                (subjectTypesMap, subjectType) => subjectTypesMap.set(subjectType.name, subjectType),
                new Map())
        );
        subjectTypeSelectFilter = subjectTypeSelectFilter.selectOption(this.state.searchCriteria.subjectType.name);

        return (
            <CHSContainer>
                <CHSContent>
                    <AppHeader title={this.I18n.t('home')} hideBackButton={true} iconComponent={this.props.iconComponent}
                               iconFunc={this.props.iconFunc} showSettings={true}/>
                    <View style={{
                        marginTop: Styles.ContentDistanceFromEdge,
                        paddingHorizontal: Styles.ContentDistanceFromEdge,
                        flexDirection: 'column'
                    }}>
                        <SingleSelectFilter filter={subjectTypeSelectFilter}
                                            onSelect={(subjectType) => this.dispatchAction(Actions.ENTER_SUBJECT_TYPE_CRITERIA, {subjectType})}/>
                        <TextFormElement actionName={Actions.ENTER_NAME_CRITERIA}
                                         element={new StaticFormElement('name')}
                                         style={Styles.simpleTextFormElement}
                                         value={new PrimitiveValue(this.state.searchCriteria.name)} multiline={false}/>
                        {this.state.searchCriteria.subjectType.isIndividual() ?
                            <TextFormElement actionName={Actions.ENTER_AGE_CRITERIA}
                                             element={new StaticFormElement('age')}
                                             style={Styles.simpleTextFormElement}
                                             value={new PrimitiveValue(this.state.searchCriteria.age)}
                                             multiline={false}/> : null}
                        {this.state.searchCriteria.subjectType.isIndividual() ?
                            <TextFormElement actionName={Actions.ENTER_OBS_CRITERIA}
                                             element={new StaticFormElement('obsKeyword')}
                                             style={Styles.simpleTextFormElement}
                                             value={new PrimitiveValue(this.state.searchCriteria.obsKeyword)}
                                             multiline={false}/> : null}
                        <AddressLevels
                            key={this.state.key}
                            onSelect={(addressLevelState) =>
                                this.dispatchAction(Actions.TOGGLE_INDIVIDUAL_SEARCH_ADDRESS_LEVEL, {values: addressLevelState.lowestSelectedAddresses})
                            }
                            multiSelect={true}/>
                        <CheckBoxFormElement
                            label={this.I18n.t("includeVoided")}
                            checkBoxText={this.I18n.t("yes")}
                            checked={this.state.searchCriteria.includeVoided}
                            onPress={() => this.dispatchAction(Actions.ENTER_VOIDED_CRITERIA,
                                {value: !this.state.searchCriteria.includeVoided})}/>
                    </View>
                    <Separator height={170} backgroundColor={Styles.whiteColor}/>
                </CHSContent>
                <View style={{height: 90, position: 'absolute', bottom: 0, width: '100%'}}>
                    <TouchableOpacity activeOpacity={0.5}
                                      onPress={() => this.searchIndividual()}
                                      style={{
                                          position: 'absolute',
                                          width: '100%',
                                          height: 40,
                                          alignSelf: 'stretch',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          backgroundColor: Colors.AccentColor,
                                          elevation: 2,
                                      }}>
                        <Text style={{
                            fontSize: Styles.smallTextSize,
                            color: Colors.TextOnPrimaryColor,
                            alignSelf: "center"
                        }}>{this.I18n.t("search")}</Text>
                    </TouchableOpacity>
                </View>
            </CHSContainer>
        );
    }
}

export default IndividualSearchView;
