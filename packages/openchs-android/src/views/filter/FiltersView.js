import React from "react";
import {Dimensions, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import AbstractComponent from "../../framework/view/AbstractComponent";
import Distances from '../primitives/Distances'
import SingleSelectFilter from './SingleSelectFilter';
import MultiSelectFilter from './MultiSelectFilter';
import {CustomFilter, Filter, Privilege, SubjectType} from 'avni-models';
import Colors from "../primitives/Colors";
import Styles from "../primitives/Styles";
import Path from "../../framework/routing/Path";
import CHSContainer from "../common/CHSContainer";
import AppHeader from "../common/AppHeader";
import CHSContent from "../common/CHSContent";
import Reducers from "../../reducer";
import {FilterActionNames} from "../../action/mydashboard/FiltersActions";
import AddressLevels from "../common/AddressLevels";
import _ from "lodash";
import DatePicker from "../primitives/DatePicker";
import Separator from "../primitives/Separator";
import ProgramFilter from "../common/ProgramFilter";
import FormMappingService from "../../service/FormMappingService";
import EntityService from "../../service/EntityService";
import General from "../../utility/General";
import CustomFilters from "./CustomFilters";
import CustomFilterService from "../../service/CustomFilterService";
import GenderFilter from "./GenderFilter";
import CustomActivityIndicator from "../CustomActivityIndicator";
import PrivilegeService from "../../service/PrivilegeService";
import SingleSelectFilterModel from "../../model/SingleSelectFilterModel";

@Path('/FilterView')
class FilterView extends AbstractComponent {
    static propTypes = {};

    static styles = StyleSheet.create({
        container: {
            marginRight: Distances.ScaledContentDistanceFromEdge,
            marginLeft: Distances.ScaledContentDistanceFromEdge,
            padding: 10,
            backgroundColor: Styles.whiteColor
        },
        floatingButton: {
            position: 'absolute',
            width: '100%',
            height: 50,
            alignSelf: 'stretch',
            alignItems: 'center',
            justifyContent: 'center',
            bottom: 0,
            backgroundColor: Colors.AccentColor
        },

        floatingButtonIcon: {
            color: Colors.TextOnPrimaryColor
        }
    });

    constructor(props, context) {
        super(props, context, Reducers.reducerKeys.filterAction);
        this.filterMap = new Map([[Filter.types.SingleSelect, SingleSelectFilter],
            [Filter.types.MultiSelect, MultiSelectFilter]]);
        this.formMappingService = context.getService(FormMappingService);
        this.entityService = context.getService(EntityService);
        this.customFilterService = context.getService(CustomFilterService);
        this.privilegeService = context.getService(PrivilegeService);
    }

    viewName() {
        return "FilterView";
    }

    UNSAFE_componentWillMount() {
        const subjectTypes = this.entityService.findAllByCriteria('voided = false', SubjectType.schema.name);
        const selectedSubjectType = this.props.selectedSubjectType || subjectTypes[0];
        const programs = this.formMappingService.findProgramsForSubjectType(selectedSubjectType);
        const selectedPrograms = programs.length === 1 ? programs : this.props.selectedPrograms;
        const encounterTypes = programs.length === 1
            ? this.formMappingService.findEncounterTypesForProgram(_.first(programs), selectedSubjectType)
            : this.props.encounterTypes;

        this.dispatchAction(FilterActionNames.ON_LOAD, {
            filters: this.props.filters,
            locationSearchCriteria: this.props.locationSearchCriteria,
            addressLevelState: this.props.addressLevelState,
            filterDate: this.props.filterDate,
            programs: programs,
            selectedPrograms: selectedPrograms,
            encounterTypes,
            selectedEncounterTypes: this.props.selectedEncounterTypes,
            generalEncounterTypes: this.props.generalEncounterTypes,
            selectedGeneralEncounterTypes: this.props.selectedGeneralEncounterTypes,
            selectedCustomFilters: this.props.selectedCustomFilters,
            subjectTypes,
            selectedSubjectType
        });
        super.UNSAFE_componentWillMount();
    }

    onSelect(filter, idx) {
        return (val) => {
            const newFilter = filter.selectOption(val);
            if (!_.isNil(newFilter)) {
                this.dispatchAction(FilterActionNames.ADD_FILTER, {filter: newFilter});
            }
        }
    }

    onApply() {
        if (this.customFilterService.errorNotPresent('myDashboardFilters', this.state.selectedSubjectType.uuid)) {
            this.dispatchAction(FilterActionNames.LOAD_INDICATOR, {status: true});
            setTimeout(() => this.applyFilters(), 0);
            this.goBack();
        }
    }

    applyFilters() {
        return this.dispatchAction(this.props.actionName, {
            filters: this.state.filters,
            locationSearchCriteria: this.state.locationSearchCriteria,
            addressLevelState: this.state.addressLevelState,
            selectedLocations: this.state.addressLevelState.selectedAddresses,
            filterDate: this.state.filterDate.value,
            programs: this.state.programs,
            selectedPrograms: this.state.selectedPrograms,
            encounterTypes: this.state.encounterTypes,
            selectedEncounterTypes: this.state.selectedEncounterTypes,
            generalEncounterTypes: this.state.generalEncounterTypes,
            selectedGeneralEncounterTypes: this.state.selectedGeneralEncounterTypes,
            listType: this.props.listType,
            selectedSubjectType: this.state.selectedSubjectType,
            selectedCustomFilters: this.state.selectedCustomFilters,
            selectedGenders: this.state.selectedGenders,
        });
    }

    onHardwareBackPress() {
        this.props.onBack();
        return true;
    }

    onVisitSelect(name, uuid) {
        this.dispatchAction(FilterActionNames.ADD_VISITS, {encounterUUID: uuid})
    }

    onGeneralVisitSelect(name, uuid) {
        this.dispatchAction(FilterActionNames.ADD_GENERAL_VISITS, {encounterUUID: uuid})
    }

    onProgramSelect(name, uuid) {
        const encounters = this.formMappingService.findEncounterTypesForProgram({uuid});
        this.dispatchAction(FilterActionNames.LOAD_ENCOUNTERS, {encounters: encounters});
        this.dispatchAction(FilterActionNames.ADD_PROGRAM, {programUUID: uuid});
    }

    renderProgramEncounterGroup() {
        const viewProgramCriteria = `privilege.name = '${Privilege.privilegeName.viewEnrolmentDetails}' AND privilege.entityType = '${Privilege.privilegeEntityType.enrolment}' AND subjectTypeUuid = '${this.state.selectedSubjectType.uuid}'`;
        const allowedProgramUuidsForViewProgram = this.privilegeService.allowedEntityTypeUUIDListForCriteria(viewProgramCriteria, 'programUuid');
        const programFilter = <ProgramFilter
            onToggle={(name, uuid) => this.onProgramSelect(name, uuid)}
            visits={_.filter(this.state.programs, program => !this.privilegeService.hasEverSyncedGroupPrivileges() || this.privilegeService.hasAllPrivileges() || _.includes(allowedProgramUuidsForViewProgram, program.uuid))}
            multiSelect={true}
            selectionFn={(uuid) => this.state.selectedPrograms.filter((prog) => prog.uuid === uuid).length > 0}
            name={'Program'}/>;

        const programEncounterTypesPredicate = this.state.selectedPrograms.map(program => `programUuid = '${program.uuid}'`).join(' OR ');
        let viewProgramEncounterCriteria = `privilege.name = '${Privilege.privilegeName.viewVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}' AND subjectTypeUuid = '${this.state.selectedSubjectType.uuid}'`;
        if (!_.isEmpty(programEncounterTypesPredicate)) viewProgramEncounterCriteria += ` AND ${programEncounterTypesPredicate}`;
        const allowedEncounterTypeUuidsForViewProgramEncounter = this.privilegeService.allowedEntityTypeUUIDListForCriteria(viewProgramEncounterCriteria, 'programEncounterTypeUuid');
        const programEncounterFilter = <ProgramFilter
            onToggle={(name, uuid) => this.onVisitSelect(name, uuid)}
            visits={_.filter(this.state.encounterTypes, encounterType => !this.privilegeService.hasEverSyncedGroupPrivileges() || this.privilegeService.hasAllPrivileges() || _.includes(allowedEncounterTypeUuidsForViewProgramEncounter, encounterType.uuid))}
            multiSelect={true}
            selectionFn={(uuid) => this.state.selectedEncounterTypes.filter((prog) => prog.uuid === uuid).length > 0}
            name={'Visits'}/>;
        return this.state.programs.length === 0 ? null : <View style={{
            marginTop: Styles.VerticalSpacingBetweenFormElements,
            marginBottom: Styles.VerticalSpacingBetweenFormElements,
        }}>
            <View style={{
                borderWidth: 1,
                borderStyle: 'dashed',
                borderRadius: 1,
                borderColor: Colors.InputBorderNormal,
                paddingHorizontal: Distances.ScaledContainerHorizontalDistanceFromEdge,
            }}>
                {this.state.programs.length === 1 ?
                    programEncounterFilter
                    :
                    <View>
                        {this.state.programs.length > 0 ? programFilter : <View/>}
                        {this.state.encounterTypes.length > 0 ? programEncounterFilter : <View/>}
                    </View>
                }
            </View>
        </View>
    }

    renderEncounterGroup() {
        const viewGeneralEncounterCriteria = `privilege.name = '${Privilege.privilegeName.viewVisit}' AND privilege.entityType = '${Privilege.privilegeEntityType.encounter}' AND programUuid = null AND subjectTypeUuid = '${this.state.selectedSubjectType.uuid}'`;
        const allowedEncounterTypeUuidsForViewGeneralEncounter = this.privilegeService.allowedEntityTypeUUIDListForCriteria(viewGeneralEncounterCriteria, 'encounterTypeUuid');
        return this.state.generalEncounterTypes.length === 0 ? <View/> :
            <View style={{
                marginTop: Styles.VerticalSpacingBetweenFormElements,
                marginBottom: Styles.VerticalSpacingBetweenFormElements,
            }}>
                <View style={{
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderRadius: 1,
                    borderColor: Colors.InputBorderNormal,
                    paddingHorizontal: Distances.ScaledContainerHorizontalDistanceFromEdge,
                }}>
                    <ProgramFilter
                        onToggle={(name, uuid) => this.onGeneralVisitSelect(name, uuid)}
                        visits={_.filter(this.state.generalEncounterTypes, generalEncounter => !this.privilegeService.hasEverSyncedGroupPrivileges() || this.privilegeService.hasAllPrivileges() || _.includes(allowedEncounterTypeUuidsForViewGeneralEncounter, generalEncounter.uuid))}
                        multiSelect={true}
                        selectionFn={uuid => _.some(this.state.selectedGeneralEncounterTypes, e => e.uuid === uuid)}
                        name={'GeneralVisits'}/>
                </View>
            </View>
    }

    render() {
        General.logDebug(this.viewName(), 'render');
        const {width} = Dimensions.get('window');
        const filterScreenName = 'myDashboardFilters';
        const viewSubjectCriteria = `privilege.name = '${Privilege.privilegeName.viewSubject}' AND privilege.entityType = '${Privilege.privilegeEntityType.subject}'`;
        const allowedSubjectTypeUuidsForView = this.privilegeService.allowedEntityTypeUUIDListForCriteria(viewSubjectCriteria, 'subjectTypeUuid');
        const allowedSubjectTypes = _.sortBy(_.filter(this.state.subjectTypes, subjectType => !this.privilegeService.hasEverSyncedGroupPrivileges() || this.privilegeService.hasAllPrivileges() || _.includes(allowedSubjectTypeUuidsForView, subjectType.uuid)), ({name}) => this.I18n.t(name));
        let subjectTypeSelectFilter = SingleSelectFilterModel.forSubjectTypes(allowedSubjectTypes, this.state.selectedSubjectType);
        const topLevelFilters = this.customFilterService.getTopLevelFilters(filterScreenName, this.state.selectedSubjectType.uuid);
        const bottomLevelFilters = this.customFilterService.getBottomLevelFilters(filterScreenName, this.state.selectedSubjectType.uuid);
        return (
            <CHSContainer style={{backgroundColor: Styles.whiteColor}}>
                <AppHeader title={this.I18n.t('filter')} func={this.props.onBack}/>
                <CHSContent>
                    <View style={{backgroundColor: Styles.whiteColor}}>
                        <CustomActivityIndicator
                            loading={this.state.loading}/>
                        <View style={[FilterView.styles.container, {width: width * 0.88, alignSelf: 'center'}]}>
                            <View style={{flexDirection: "column", justifyContent: "flex-start"}}>
                                <Text style={{fontSize: 15, color: Styles.greyText}}>{this.I18n.t("date")}</Text>
                                <DatePicker
                                    nonRemovable={true}
                                    actionName={FilterActionNames.ON_DATE}
                                    actionObject={this.state.filterDate}
                                    pickTime={false}
                                    dateValue={this.state.filterDate.value}/>
                            </View>
                            {allowedSubjectTypes.length > 1 &&
                            (<SingleSelectFilter filter={subjectTypeSelectFilter} onSelect={(subjectTypeName) => {
                                this.dispatchAction(FilterActionNames.ADD_SUBJECT_TYPE, {subjectTypeName})
                            }}/>)
                            }
                            {!_.isEmpty(topLevelFilters) ?
                                <CustomFilters filters={topLevelFilters}
                                               selectedCustomFilters={this.props.selectedCustomFilters}
                                               onSelect={(selectedCustomFilters) => this.dispatchAction(FilterActionNames.CUSTOM_FILTER_CHANGE, {selectedCustomFilters})}
                                /> : null}
                            {this.customFilterService.filterTypePresent(filterScreenName, CustomFilter.type.Gender, this.state.selectedSubjectType.uuid) ?
                                <GenderFilter selectedGenders={this.props.selectedGenders}
                                              onSelect={(selectedGenders) => this.dispatchAction(FilterActionNames.GENDER_FILTER_CHANGE, {selectedGenders})}
                                /> : null}
                            {_.isEmpty(this.state.selectedGeneralEncounterTypes) && this.renderProgramEncounterGroup()}
                            {_.isEmpty(this.state.selectedPrograms) && _.isEmpty(this.state.selectedEncounterTypes) && this.renderEncounterGroup()}
                            {this.customFilterService.filterTypePresent(filterScreenName, CustomFilter.type.Address, this.state.selectedSubjectType.uuid) ?
                                <AddressLevels
                                    addressLevelState={this.state.addressLevelState}
                                    onSelect={(addressLevelState) => {
                                        this.dispatchAction(FilterActionNames.INDIVIDUAL_SEARCH_ADDRESS_LEVEL, {
                                            addressLevelState: addressLevelState
                                        })
                                    }}
                                    multiSelect={true}/> : null}
                            {!_.isEmpty(bottomLevelFilters) ?
                                <CustomFilters filters={bottomLevelFilters}
                                               selectedCustomFilters={this.props.selectedCustomFilters}
                                               onSelect={(selectedCustomFilters) => this.dispatchAction(FilterActionNames.CUSTOM_FILTER_CHANGE, {selectedCustomFilters})}
                                               addressLevelState={this.state.addressLevelState}
                                /> : null}
                            <Separator height={50} backgroundColor={Styles.whiteColor}/>
                        </View>
                    </View>
                </CHSContent>
                <TouchableOpacity activeOpacity={0.5}
                                  onPress={() => this.onApply()}
                                  style={FilterView.styles.floatingButton}>
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

export default FilterView;
