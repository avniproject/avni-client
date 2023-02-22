import {View, Text, TouchableOpacity, KeyboardAvoidingView} from "react-native";
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
import {PrimitiveValue, CustomFilter, Privilege} from 'avni-models';
import CHSContent from "../common/CHSContent";
import Styles from "../primitives/Styles";
import AppHeader from "../common/AppHeader";
import CHSContainer from "../common/CHSContainer";
import Separator from "../primitives/Separator";
import Colors from "../primitives/Colors";
import SingleSelectFilter from '../filter/SingleSelectFilter';
import CustomFilters from "../filter/CustomFilters";
import CustomFilterService from "../../service/CustomFilterService";
import GenderFilter from "../filter/GenderFilter";
import CustomActivityIndicator from "../CustomActivityIndicator";
import PrivilegeService from "../../service/PrivilegeService";
import _ from "lodash";
import {ScrollView} from "react-native";
import SingleSelectFilterModel from "../../model/SingleSelectFilterModel";
import {Checkbox} from "native-base";
import UserInfoService from "../../service/UserInfoService";

@Path('/individualSearch')
class IndividualSearchView extends AbstractComponent {
    static propTypes = {
        onIndividualSelection: PropTypes.func.isRequired,
        showHeader: PropTypes.bool,
        headerMessage: PropTypes.string
    };

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.individualSearch);
        this.customFilterService = context.getService(CustomFilterService)
    }

    viewName() {
        return 'IndividualSearchView';
    }

    UNSAFE_componentWillMount() {
        this.dispatchAction(Actions.ON_LOAD, this.props);
        super.UNSAFE_componentWillMount();
    }


    searchIndividual() {
        if (this.customFilterService.errorNotPresent(this.state.selectedCustomFilters, this.state.searchCriteria.subjectType.uuid)) {
            this.dispatchAction(Actions.LOAD_INDICATOR, {status: true});
            setTimeout(() => this.applySearch(), 0);
        }
    }

    applySearch() {
        return this.dispatchAction(Actions.SEARCH_INDIVIDUALS, {
            cb: (individualSearchResults, count) => TypedTransition.from(this).with({
                searchResults: individualSearchResults,
                totalSearchResultsCount: count,
                onIndividualSelection: this.props.onIndividualSelection
            }).to(IndividualSearchResultsView, true)
        });
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const buttonHeight = !_.isNil(this.props.buttonElevated) ? 110 : 50;
        const filterScreenName = 'searchFilters';
        const subjectTypeUUID = this.state.searchCriteria.subjectType.uuid;
        const topLevelFilters = this.customFilterService.getTopLevelFilters(filterScreenName, subjectTypeUUID);
        const bottomLevelFilters = this.customFilterService.getBottomLevelFilters(filterScreenName, subjectTypeUUID);
        const viewSubjectCriteria = `privilege.name = '${Privilege.privilegeName.viewSubject}' AND privilege.entityType = '${Privilege.privilegeEntityType.subject}'`;
        const privilegeService = this.context.getService(PrivilegeService);
        const allowedSubjectTypeUuidsForView = privilegeService.allowedEntityTypeUUIDListForCriteria(viewSubjectCriteria, 'subjectTypeUuid');
        const allowedSubjectTypes = _.sortBy(_.filter(this.state.subjectTypes, subjectType => !privilegeService.hasEverSyncedGroupPrivileges() || privilegeService.hasAllPrivileges() || _.includes(allowedSubjectTypeUuidsForView, subjectType.uuid)), ({name}) => this.I18n.t(name));
        let subjectTypeSelectFilter = SingleSelectFilterModel.forSubjectTypes(allowedSubjectTypes, this.state.searchCriteria.subjectType);
        const locale = this.getService(UserInfoService).getUserSettings().locale;

        return (
            <CHSContainer>
                <AppHeader title={this.I18n.t('search')} hideBackButton={this.props.hideBackButton}
                           hideIcon={true}/>
                <CHSContent>
                    <ScrollView keyboardShouldPersistTaps="handled">
                        <View style={{
                            marginTop: Styles.ContentDistanceFromEdge,
                            paddingHorizontal: Styles.ContentDistanceFromEdge,
                            flexDirection: 'column'
                        }}>
                            <CustomActivityIndicator
                                loading={this.state.loading}/>
                            {allowedSubjectTypes.length > 1 &&
                            <SingleSelectFilter filter={subjectTypeSelectFilter} locale={locale} I18n={this.I18n}
                                                onSelect={(subjectType) =>
                                                    this.dispatchAction(Actions.ENTER_SUBJECT_TYPE_CRITERIA, {subjectType})}/>
                            }
                            <Separator height={25} backgroundColor={Styles.whiteColor}/>
                            {this.customFilterService.filterTypePresent(filterScreenName, CustomFilter.type.Name, subjectTypeUUID) ?
                                <TextFormElement actionName={Actions.ENTER_NAME_CRITERIA}
                                                 element={new StaticFormElement('name')}
                                                 style={Styles.simpleTextFormElement}
                                                 value={new PrimitiveValue(this.state.searchCriteria.name)}
                                                 multiline={false}/> : null}
                            {this.customFilterService.filterTypePresent(filterScreenName, CustomFilter.type.Age, subjectTypeUUID) ?
                                <TextFormElement actionName={Actions.ENTER_AGE_CRITERIA}
                                                 element={new StaticFormElement('age')}
                                                 style={Styles.simpleTextFormElement}
                                                 value={new PrimitiveValue(this.state.searchCriteria.age)}
                                                 multiline={false}/> : null}
                            {(_.isEmpty(this.customFilterService.getSearchFilterBySubjectType(subjectTypeUUID)) || this.customFilterService.filterTypePresent(filterScreenName, CustomFilter.type.SearchAll, this.state.searchCriteria.subjectType.uuid)) ?
                                <TextFormElement actionName={Actions.ENTER_OBS_CRITERIA}
                                                 element={new StaticFormElement('searchAll')}
                                                 style={Styles.simpleTextFormElement}
                                                 value={new PrimitiveValue(this.state.searchCriteria.obsKeyword)}
                                                 multiline={false}/> : null}
                            {!_.isEmpty(topLevelFilters) ?
                                <CustomFilters filters={topLevelFilters}
                                               selectedCustomFilters={this.state.selectedCustomFilters}
                                               onSelect={(selectedCustomFilters) => this.dispatchAction(Actions.CUSTOM_FILTER_CHANGE, {selectedCustomFilters})}
                                /> : null}
                            {this.customFilterService.filterTypePresent(filterScreenName, CustomFilter.type.Gender, subjectTypeUUID) &&
                            <GenderFilter
                                selectedGenders={this.state.selectedGenders}
                                onSelect={(selectedGenders) => this.dispatchAction(Actions.GENDER_CHANGE, {selectedGenders})}
                            />}
                            {this.customFilterService.filterTypePresent(filterScreenName, CustomFilter.type.Address, subjectTypeUUID) &&
                            <AddressLevels
                                key={this.state.key}
                                onSelect={(addressLevelState) =>
                                    this.dispatchAction(Actions.TOGGLE_INDIVIDUAL_SEARCH_ADDRESS_LEVEL, {values: addressLevelState})
                                }
                                multiSelect={true}/>}
                            <>
                                <Text style={Styles.formLabel}>{this.I18n.t("includeVoided")}</Text>
                                <Checkbox.Group accessibilityLabel={this.I18n.t("includeVoided")}
                                                onChange={() => this.dispatchAction(Actions.ENTER_VOIDED_CRITERIA,
                                                    {value: !this.state.searchCriteria.includeVoided})}>
                                    <Checkbox value={"yes"} color={Colors.AccentColor}>
                                        {this.I18n.t("yes")}
                                    </Checkbox>
                                </Checkbox.Group>
                            </>
                            {!_.isEmpty(bottomLevelFilters) &&
                            <CustomFilters filters={bottomLevelFilters}
                                           selectedCustomFilters={this.state.selectedCustomFilters}
                                           onSelect={(selectedCustomFilters) =>
                                               this.dispatchAction(Actions.CUSTOM_FILTER_CHANGE, {selectedCustomFilters})}
                                           addressLevelState={this.state.addressLevelState}
                            />}
                        </View>
                        <Separator height={400} backgroundColor={Styles.whiteColor}/>
                    </ScrollView>
                </CHSContent>

                <View style={{height: buttonHeight, position: 'absolute', bottom: 0, right: 35}}>
                    <TouchableOpacity activeOpacity={0.5}
                                      onPress={() => this.searchIndividual()}
                                      style={{
                                          height: 40,
                                          width: 80,
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          backgroundColor: Colors.AccentColor,
                                          elevation: 2,
                                      }}>
                        <Text style={{
                            color: 'white',
                            alignSelf: 'center',
                            fontSize: Styles.normalTextSize
                        }}>{this.I18n.t('submit')}</Text>
                    </TouchableOpacity>
                </View>
            </CHSContainer>
        );
    }
}

export default IndividualSearchView;
